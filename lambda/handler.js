import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const secretsClient = new SecretsManagerClient({
  region: 'us-east-1'
});

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: 'us-east-1'
}));

async function getSecrets() {
  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: 'valheim-monitor-secrets'
    }));

    return JSON.parse(response.SecretString);
  } catch (e) {
    console.error('Error retrieving secrets', e);
    throw e;
  }
}

export async function handler(event) {
  const secrets = await getSecrets();

  const tableName = process.env.TABLE_NAME;

  // get last status from agent
  const agentResult = await ddb.send(new GetCommand({
    TableName: tableName,
    Key: { PK: 'agent-status' }
  }));

  const { ipAddress: agentIp, status: agentStatus, updatedTimestamp: agentUpdateTimestamp } = agentResult.Item || {};

  // get last status from lambda
  const lambdaResult = await ddb.send(new GetCommand({
    TableName: tableName,
    Key: { PK: 'lambda-status' }
  }));

  const { ipAddress: lambdaIp, status: lambdaStatus } = lambdaResult.Item || {};

  const now = Date.now();
  const diff = now - agentUpdateTimestamp;

  console.log(`Last update from agent was ${diff / 1000} seconds ago`)

  const updateTooOld = diff > 2.5 * 60 * 1000;
  const hasBeenDown = updateTooOld && lambdaStatus === 'inactive';
  const shouldNotNotify = hasBeenDown || (!updateTooOld && agentIp === lambdaIp && agentStatus === lambdaStatus);

  if (shouldNotNotify) return;

  let messageContent = '**Valheim Server Status Updates**';

  const updatedLambda = {
    PK: 'lambda-status',
    ipAddress: lambdaIp,
    status: lambdaStatus
  }

  if (agentIp !== lambdaIp) {
    messageContent += `\nNew Address: ${agentIp}:${secrets.port}`;
    updatedLambda.ipAddress = agentIp;
  }

  const serverStatus = updateTooOld ? 'inactive' : agentStatus;

  if (serverStatus !== lambdaStatus) {
    const statusMessage = serverStatus === 'active' ? '🟢 Up' : '🔴 Down';
    messageContent += `\nServer Status: ${statusMessage}`;
    updatedLambda.status = serverStatus;
  }

  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: updatedLambda
  }));

  await fetch(`https://discord.com/api/channels/${secrets.channel_id}/messages`, {
    headers: {
      Authorization: `Bot ${secrets.token}`,
      'User-Agent': `DiscordBot (${secrets.user_agent}, 0.1.0)`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      content: messageContent,
      tts: false
    })
  });
}
