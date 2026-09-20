import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSecrets,
  mockFetchMonitorStatuses,
  mockSaveLambdaStatus,
  mockSendDiscordMessage,
} = vi.hoisted(() => ({
  mockGetSecrets: vi.fn(),
  mockFetchMonitorStatuses: vi.fn(),
  mockSaveLambdaStatus: vi.fn(),
  mockSendDiscordMessage: vi.fn(),
}));

vi.mock('../src/secrets.js', () => ({
  getSecrets: mockGetSecrets,
}));

vi.mock('../src/db.js', () => ({
  fetchMonitorStatuses: mockFetchMonitorStatuses,
  saveLambdaStatus: mockSaveLambdaStatus,
}));

vi.mock('../src/discord.js', () => ({
  sendDiscordMessage: mockSendDiscordMessage,
}));

import { handler } from '../src/handler.js';

describe('handler', () => {
  const secrets = {
    channel_id: 'chan_123',
    token: 'tok_abc',
    port: '2456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'ValheimMonitorTable';
    mockGetSecrets.mockResolvedValue(secrets);
  });

  it('throws error if TABLE_NAME environment variable is not defined', async () => {
    delete process.env.TABLE_NAME;
    await expect(handler()).rejects.toThrow('TABLE_NAME environment variable is not defined');
  });

  it('does not save status or send discord message when shouldNotify is false', async () => {
    const now = Date.now();
    mockFetchMonitorStatuses.mockResolvedValueOnce({
      agentState: {
        ipAddress: '1.2.3.4',
        status: 'active',
        updatedTimestamp: now,
      },
      lambdaState: {
        ipAddress: '1.2.3.4',
        status: 'active',
      },
    });

    await handler();

    expect(mockGetSecrets).toHaveBeenCalledTimes(1);
    expect(mockFetchMonitorStatuses).toHaveBeenCalledWith('ValheimMonitorTable');
    expect(mockSaveLambdaStatus).not.toHaveBeenCalled();
    expect(mockSendDiscordMessage).not.toHaveBeenCalled();
  });

  it('saves updated lambda status and posts discord message when shouldNotify is true', async () => {
    const now = Date.now();
    mockFetchMonitorStatuses.mockResolvedValueOnce({
      agentState: {
        ipAddress: '5.6.7.8',
        status: 'active',
        updatedTimestamp: now,
      },
      lambdaState: {
        ipAddress: '1.2.3.4',
        status: 'inactive',
      },
    });

    await handler();

    expect(mockGetSecrets).toHaveBeenCalledTimes(1);
    expect(mockFetchMonitorStatuses).toHaveBeenCalledWith('ValheimMonitorTable');
    expect(mockSaveLambdaStatus).toHaveBeenCalledTimes(1);
    expect(mockSaveLambdaStatus).toHaveBeenCalledWith(
      'ValheimMonitorTable',
      expect.objectContaining({
        PK: 'lambda-status',
        ipAddress: '5.6.7.8',
        status: 'active',
      })
    );
    expect(mockSendDiscordMessage).toHaveBeenCalledTimes(1);
    expect(mockSendDiscordMessage).toHaveBeenCalledWith(
      secrets,
      expect.stringContaining('New Address: 5.6.7.8:2456')
    );
  });
});
