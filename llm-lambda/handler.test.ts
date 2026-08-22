import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const { mockVerifyKey, mockLambdaSend, mockDocSend } = vi.hoisted(() => ({
  mockVerifyKey: vi.fn().mockResolvedValue(true),
  mockLambdaSend: vi.fn().mockResolvedValue({}),
  mockDocSend: vi.fn().mockResolvedValue({}),
}));

vi.mock('discord-interactions', () => ({
  InteractionType: {
    PING: 1,
    APPLICATION_COMMAND: 2,
  },
  InteractionResponseType: {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  },
  verifyKey: (...args: any[]) => mockVerifyKey(...args),
}));

vi.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: class {
      send = vi.fn().mockResolvedValue({
        SecretString: JSON.stringify({ public_key: 'test_key' }),
      });
    },
    GetSecretValueCommand: class {},
  };
});

vi.mock('@aws-sdk/client-lambda', () => {
  return {
    LambdaClient: class {
      send = mockLambdaSend;
    },
    InvokeCommand: class {
      constructor(public input: any) {}
    },
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({
      send: mockDocSend,
    }),
  },
  DeleteCommand: class {
    constructor(public input: any) {}
  },
}));

import { handler } from './handler.js';

describe('Discord interaction handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyKey.mockResolvedValue(true);
    process.env.WORKER_LAMBDA_NAME = 'TestWorkerLambda';
    process.env.STATE_TABLE_NAME = 'TestStateTable';
  });

  const baseEvent: APIGatewayProxyEvent = {
    body: '',
    headers: {
      'x-signature-ed25519': 'test_sig',
      'x-signature-timestamp': '123456789',
    },
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/interactions',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };

  it('rejects requests with invalid signatures', async () => {
    mockVerifyKey.mockResolvedValue(false);
    const event = { ...baseEvent, body: JSON.stringify({ type: 1 }) };

    const res = await handler(event);
    expect(res.statusCode).toBe(401);
  });

  it('handles PING interaction with PONG', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ type: 1 }) };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.type).toBe(1); // PONG
  });

  it('handles bukeperry command by deferring response and invoking worker', async () => {
    const payload = {
      type: 2,
      id: 'inter_1',
      token: 'tok_1',
      application_id: 'app_1',
      channel_id: 'chan_1',
      data: {
        name: 'bukeperry',
        options: [{ name: 'message', value: 'hello troll' }],
      },
    };
    const event = { ...baseEvent, body: JSON.stringify(payload) };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.type).toBe(5); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
  });

  it('handles bukeperry-reset command by deleting channel state from DynamoDB', async () => {
    const payload = {
      type: 2,
      id: 'inter_2',
      token: 'tok_2',
      application_id: 'app_1',
      channel_id: 'chan_123',
      data: {
        name: 'bukeperry-reset',
      },
    };
    const event = { ...baseEvent, body: JSON.stringify(payload) };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
    expect(body.data.content).toContain('bukeperry hit head on cave wall');
    expect(mockDocSend).toHaveBeenCalledTimes(1);
    const deleteCallArg = mockDocSend.mock.calls[0][0];
    expect(deleteCallArg.input).toEqual({
      TableName: 'TestStateTable',
      Key: { channelId: 'chan_123' },
    });
  });
});
