import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendDiscordMessage } from '../src/discord.js';

describe('discord', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const secrets = {
    channel_id: 'channel_123',
    token: 'bot_token_abc',
    user_agent: 'ValheimBot',
  };

  it('sends message to Discord REST API with expected headers and payload', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
    } as unknown as Response;
    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const message = 'Server is online!';
    const res = await sendDiscordMessage(secrets, message);

    expect(res).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://discord.com/api/channels/channel_123/messages',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bot bot_token_abc',
          'User-Agent': 'DiscordBot (ValheimBot, 0.1.0)',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          tts: false,
        }),
      }
    );
  });

  it('throws an informative error if response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      text: vi.fn().mockResolvedValue('Missing Permissions'),
    } as unknown as Response;
    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(
      sendDiscordMessage(secrets, 'test')
    ).rejects.toThrow('Discord API call failed (403): Missing Permissions');
  });
});
