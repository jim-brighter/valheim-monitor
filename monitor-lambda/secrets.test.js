import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: class {
      send = mockSend;
    },
    GetSecretValueCommand: class {
      constructor(input) {
        this.input = input;
      }
    },
  };
});

import { getSecrets } from './secrets.js';

describe('getSecrets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches secrets on initial call and returns parsed JSON', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ token: 'test-token', port: '2456' }),
    });

    const secrets = await getSecrets('valheim-monitor-secrets');
    expect(secrets).toEqual({ token: 'test-token', port: '2456' });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('uses cached secrets on subsequent calls without calling Secrets Manager again', async () => {
    const secrets = await getSecrets('valheim-monitor-secrets');
    expect(secrets).toEqual({ token: 'test-token', port: '2456' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
