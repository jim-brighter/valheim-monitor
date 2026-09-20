import { fetchMonitorStatuses, saveLambdaStatus } from './db.js';
import { sendDiscordMessage } from './discord.js';
import { evaluateStatusChange } from './evaluator.js';
import { getSecrets } from './secrets.js';

/**
 * Main AWS Lambda handler entry point.
 * Orchestrates secrets fetching, status evaluation, database updates, and Discord notifications.
 *
 * @param event - AWS Lambda event object
 */
export async function handler(event?: unknown): Promise<void> {
  const secrets = await getSecrets();
  const tableName = process.env.TABLE_NAME;

  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is not defined');
  }

  const { agentState, lambdaState } = await fetchMonitorStatuses(tableName);

  const { shouldNotify, updatedLambdaState, messageContent } = evaluateStatusChange({
    agentState,
    lambdaState,
    secrets,
    now: Date.now(),
  });

  if (!shouldNotify || !updatedLambdaState || !messageContent) {
    return;
  }

  await saveLambdaStatus(tableName, updatedLambdaState);
  await sendDiscordMessage(secrets, messageContent);
}
