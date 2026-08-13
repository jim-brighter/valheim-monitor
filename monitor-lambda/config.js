export const CONFIG = {
  REGION: process.env.AWS_REGION || 'us-east-1',
  SECRET_ID: process.env.SECRET_ID || 'valheim-monitor-secrets',
  AGENT_TIMEOUT_MS: 2.5 * 60 * 1000, // 2.5 minutes
  STATUS_KEYS: {
    AGENT: 'agent-status',
    LAMBDA: 'lambda-status'
  }
};
