export const CONFIG = {
  REGION: process.env.AWS_REGION || 'us-east-1',
  SECRET_ID: process.env.SECRET_ID || 'valheim-monitor-secrets',
  AGENT_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  MAX_BACKUP_AGE_MS: 25 * 60 * 60 * 1000, // 25 hours
  STATUS_KEYS: {
    AGENT: 'agent-status',
    LAMBDA: 'lambda-status',
  },
} as const;
