import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CONFIG } from './config.js';
import type { AgentState, LambdaState } from './types.js';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: CONFIG.REGION }));

/**
 * Fetches current agent-status and lambda-status items from DynamoDB in parallel.
 *
 * @param tableName - The name of the DynamoDB table
 * @returns Object containing agentState and lambdaState
 */
export async function fetchMonitorStatuses(tableName: string): Promise<{
  agentState: AgentState;
  lambdaState: LambdaState;
}> {
  const [agentResult, lambdaResult] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: tableName,
      Key: { PK: CONFIG.STATUS_KEYS.AGENT },
    })),
    ddb.send(new GetCommand({
      TableName: tableName,
      Key: { PK: CONFIG.STATUS_KEYS.LAMBDA },
    })),
  ]);

  return {
    agentState: (agentResult.Item as AgentState) || {},
    lambdaState: (lambdaResult.Item as LambdaState) || {},
  };
}

/**
 * Updates the lambda-status item in DynamoDB.
 *
 * @param tableName - The name of the DynamoDB table
 * @param item - The lambda-status item to save
 */
export async function saveLambdaStatus(tableName: string, item: LambdaState): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: item,
  }));
}
