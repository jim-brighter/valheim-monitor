import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const { mockGenerateReply } = vi.hoisted(() => ({
  mockGenerateReply: vi.fn(),
}));

vi.mock('../src/core.js', () => ({
  generateBukeperryReply: mockGenerateReply,
}));

import { handler } from '../src/gameHandler.js';

describe('Game chat handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseEvent: APIGatewayProxyEvent = {
    body: '',
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/game/chat',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };

  it('returns 400 when body is missing', async () => {
    const res = await handler({ ...baseEvent, body: null as any });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Missing request body' });
  });

  it('returns 400 when body is invalid JSON', async () => {
    const res = await handler({ ...baseEvent, body: '{ invalid json' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid request body' });
  });

  it('returns 400 when prompt is missing or empty', async () => {
    const res = await handler({ ...baseEvent, body: JSON.stringify({ prompt: '   ' }) });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Missing or invalid prompt in request body' });
  });

  it('generates reply with explicit channelId', async () => {
    mockGenerateReply.mockResolvedValue('troll smash log.');
    const event = {
      ...baseEvent,
      body: JSON.stringify({ prompt: 'hello troll', channelId: 'custom_chan' }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ reply: 'troll smash log.' });
    expect(mockGenerateReply).toHaveBeenCalledWith('hello troll', 'custom_chan');
  });

  it('generates reply statelessly when channelId is omitted', async () => {
    mockGenerateReply.mockResolvedValue('bukeperry like wood.');
    const event = {
      ...baseEvent,
      body: JSON.stringify({ prompt: 'what you like' }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ reply: 'bukeperry like wood.' });
    expect(mockGenerateReply).toHaveBeenCalledWith('what you like', '');
  });

  it('handles unexpected core errors with 500 status', async () => {
    mockGenerateReply.mockRejectedValue(new Error('Bedrock timeout'));
    const event = {
      ...baseEvent,
      body: JSON.stringify({ prompt: 'hello' }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.reply).toBe('bukeperry head hurt... no think');
    expect(body.error).toBe('Internal Server Error');
  });
});
