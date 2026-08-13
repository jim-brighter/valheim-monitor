import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CONFIG } from './config.js';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: CONFIG.REGION }));

/**
 * Fetches current agent-status and lambda-status items from DynamoDB in parallel.
 *
 * @param {string} tableName - The name of the DynamoDB table
 * @returns {Promise<{ agentState: Object, lambdaState: Object }>}
 */
export async function fetchMonitorStatuses(tableName) {
  const [agentResult, lambdaResult] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: tableName,
      Key: { PK: CONFIG.STATUS_KEYS.AGENT }
    })),
    ddb.send(new GetCommand({
      TableName: tableName,
      Key: { PK: CONFIG.STATUS_KEYS.LAMBDA }
    }))
  ]);

  return {
    agentState: agentResult.Item || {},
    lambdaState: lambdaResult.Item || {}
  };
}

/**
 * Updates the lambda-status item in DynamoDB.
 *
 * @param {string} tableName - The name of the DynamoDB table
 * @param {Object} item - The lambda-status item to save
 * @returns {Promise<void>}
 */
export async function saveLambdaStatus(tableName, item) {
  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: item
  }));
}
