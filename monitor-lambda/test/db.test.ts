import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({
      send: mockSend,
    }),
  },
  GetCommand: class {
    constructor(public input: any) {}
  },
  PutCommand: class {
    constructor(public input: any) {}
  },
}));

import { fetchMonitorStatuses, saveLambdaStatus } from '../src/db.js';

describe('db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMonitorStatuses', () => {
    it('fetches agent and lambda statuses in parallel and returns their items', async () => {
      const mockAgentItem = { PK: 'agent-status', ipAddress: '1.1.1.1', status: 'active' };
      const mockLambdaItem = { PK: 'lambda-status', ipAddress: '1.1.1.1', status: 'active' };

      mockSend
        .mockResolvedValueOnce({ Item: mockAgentItem })
        .mockResolvedValueOnce({ Item: mockLambdaItem });

      const result = await fetchMonitorStatuses('TestTable');

      expect(result).toEqual({
        agentState: mockAgentItem,
        lambdaState: mockLambdaItem,
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[0][0].input).toEqual({
        TableName: 'TestTable',
        Key: { PK: 'agent-status' },
      });
      expect(mockSend.mock.calls[1][0].input).toEqual({
        TableName: 'TestTable',
        Key: { PK: 'lambda-status' },
      });
    });

    it('returns empty objects when items are not found in DynamoDB', async () => {
      mockSend
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await fetchMonitorStatuses('TestTable');

      expect(result).toEqual({
        agentState: {},
        lambdaState: {},
      });
    });
  });

  describe('saveLambdaStatus', () => {
    it('sends PutCommand with table name and item', async () => {
      mockSend.mockResolvedValueOnce({});

      const itemToSave = { PK: 'lambda-status', status: 'active', ipAddress: '2.2.2.2' };
      await saveLambdaStatus('TestTable', itemToSave);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].input).toEqual({
        TableName: 'TestTable',
        Item: itemToSave,
      });
    });
  });
});
