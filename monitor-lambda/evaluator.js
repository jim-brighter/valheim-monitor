import { CONFIG } from './config.js';

/**
 * Evaluates the status of the agent against the current Lambda state.
 * Determines if a notification should be sent and returns the updated state.
 *
 * @param {Object} params
 * @param {Object} [params.agentState] - Status recorded by the agent in DynamoDB
 * @param {Object} [params.lambdaState] - Last status stored by the Lambda in DynamoDB
 * @param {Object} [params.secrets] - Secrets containing port and notification settings
 * @param {number} [params.now] - Current timestamp (ms), defaults to Date.now()
 * @returns {{ shouldNotify: boolean, updatedLambdaState: Object|null, messageContent: string|null }}
 */
export function evaluateStatusChange({ agentState = {}, lambdaState = {}, secrets = {}, now = Date.now() }) {
  const { ipAddress: agentIp, status: agentStatus, currentVersion: agentVersion, lastBackupTimestamp: agentLastBackupTimestamp, updatedTimestamp: agentUpdateTimestamp } = agentState;
  const { ipAddress: lambdaIp, status: lambdaStatus, currentVersion: lambdaVersion, lastBackupTimestamp: lambdaLastBackupTimestamp } = lambdaState;

  const updateDiff = agentUpdateTimestamp ? now - agentUpdateTimestamp : Infinity;
  const updateTooOld = updateDiff > CONFIG.AGENT_TIMEOUT_MS;

  const updatedLambdaState = {
    PK: CONFIG.STATUS_KEYS.LAMBDA,
    ipAddress: lambdaIp,
    status: lambdaStatus,
    currentVersion: lambdaVersion,
    lastBackupTimestamp: lambdaLastBackupTimestamp
  };

  const messages = [];

  if (agentIp && agentIp !== lambdaIp) {
    const portString = secrets.port ? `:${secrets.port}` : '';
    messages.push(`New Address: ${agentIp}${portString}`);
    updatedLambdaState.ipAddress = agentIp;
  }

  const serverStatus = updateTooOld ? 'inactive' : agentStatus;
  if (serverStatus && serverStatus !== lambdaStatus) {
    const statusMessage = serverStatus === 'active' ? '🟢 Up' : '🔴 Down';
    messages.push(`Server Status: ${statusMessage}`);
    updatedLambdaState.status = serverStatus;
  }

  if (agentVersion && agentVersion !== lambdaVersion) {
    messages.push(`Server was updated to version ${agentVersion}`);
    updatedLambdaState.currentVersion = agentVersion;
  }

  if (agentLastBackupTimestamp) {
    const backupDiff = now - agentLastBackupTimestamp;
    const backupTooOld = backupDiff > CONFIG.MAX_BACKUP_AGE_MS;
    const alreadyNotified = lambdaLastBackupTimestamp === agentLastBackupTimestamp;

    if (backupTooOld && !alreadyNotified) {
      const hoursAgo = Math.floor(backupDiff / 1000 / 60 / 60);
      messages.push(`Missed backup - last backup was ${hoursAgo} hours ago`);
      updatedLambdaState.lastBackupTimestamp = agentLastBackupTimestamp;
    }
  }

  if (messages.length === 0) {
    return {
      shouldNotify: false,
      updatedLambdaState: null,
      messageContent: null
    };
  }

  return {
    shouldNotify: true,
    updatedLambdaState,
    messageContent: `**Valheim Server Status Updates**\n${messages.join('\n')}`
  };
}
