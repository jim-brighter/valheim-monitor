import { fetchMonitorStatuses, saveLambdaStatus } from './db.js';
import { sendDiscordMessage } from './discord.js';
import { evaluateStatusChange } from './evaluator.js';
import { getSecrets } from './secrets.js';

/**
 * Main AWS Lambda handler entry point.
 * Orchestrates secrets fetching, status evaluation, database updates, and Discord notifications.
 *
 * @param {Object} event - AWS Lambda event object
 */
export async function handler(event) {
  const secrets = await getSecrets();
  const tableName = process.env.TABLE_NAME;

  const { agentState, lambdaState } = await fetchMonitorStatuses(tableName);

  const { shouldNotify, updatedLambdaState, messageContent } = evaluateStatusChange({
    agentState,
    lambdaState,
    secrets,
    now: Date.now()
  });

  if (!shouldNotify) {
    return;
  }

  await saveLambdaStatus(tableName, updatedLambdaState);
  await sendDiscordMessage(secrets, messageContent);
}
