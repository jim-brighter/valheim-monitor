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
  const { ipAddress: agentIp, status: agentStatus, updatedTimestamp: agentUpdateTimestamp } = agentState;
  const { ipAddress: lambdaIp, status: lambdaStatus } = lambdaState;

  const diff = agentUpdateTimestamp ? now - agentUpdateTimestamp : Infinity;
  if (Number.isFinite(diff)) {
    console.log(`Last update from agent was ${diff / 1000} seconds ago`);
  } else {
    console.log('No previous timestamp recorded for agent update');
  }

  const updateTooOld = diff > CONFIG.AGENT_TIMEOUT_MS;
  const hasBeenDown = updateTooOld && lambdaStatus === 'inactive';
  const shouldNotNotify = hasBeenDown || (!updateTooOld && agentIp === lambdaIp && agentStatus === lambdaStatus);

  if (shouldNotNotify) {
    return {
      shouldNotify: false,
      updatedLambdaState: null,
      messageContent: null
    };
  }

  let messageContent = '**Valheim Server Status Updates**';
  const updatedLambdaState = {
    PK: CONFIG.STATUS_KEYS.LAMBDA,
    ipAddress: lambdaIp,
    status: lambdaStatus
  };

  if (agentIp !== lambdaIp) {
    const portString = secrets.port ? `:${secrets.port}` : '';
    messageContent += `\nNew Address: ${agentIp}${portString}`;
    updatedLambdaState.ipAddress = agentIp;
  }

  const serverStatus = updateTooOld ? 'inactive' : agentStatus;

  if (serverStatus !== lambdaStatus) {
    const statusMessage = serverStatus === 'active' ? '🟢 Up' : '🔴 Down';
    messageContent += `\nServer Status: ${statusMessage}`;
    updatedLambdaState.status = serverStatus;
  }

  return {
    shouldNotify: true,
    updatedLambdaState,
    messageContent
  };
}
