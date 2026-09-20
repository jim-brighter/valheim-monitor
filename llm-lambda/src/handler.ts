import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const dbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dbClient);

let cachedSecrets: any = null;

async function getSecrets() {
  if (cachedSecrets) return cachedSecrets;

  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: 'valheim-monitor-secrets'
    }));

    cachedSecrets = JSON.parse(response.SecretString || '{}');
    return cachedSecrets;
  } catch (e) {
    console.error('Error retrieving secrets from Secrets Manager', e);
    throw e;
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const secrets = await getSecrets();

  const signature = event.headers['x-signature-ed25519']!;
  const timestamp = event.headers['x-signature-timestamp']!;
  const isValidRequest = await verifyKey(event.body!, signature, timestamp, secrets.public_key);
  if (!isValidRequest) {
    return {
      statusCode: 401,
      body: JSON.stringify('Unauthorized')
    }
  }

  const { id, type, token, application_id, channel_id, data } = JSON.parse(event.body || '{}');

  if (type === InteractionType.PING) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: InteractionResponseType.PONG
      })
    }
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const commandName = data.name;

    if (commandName === 'bukeperry-reset') {
      const tableName = process.env.STATE_TABLE_NAME;
      if (channel_id && tableName) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: tableName,
            Key: { channelId: channel_id }
          }));
          console.log(`Successfully deleted state for channel ${channel_id}`);
        } catch (dbErr) {
          console.error(`Failed to delete state for channel ${channel_id}:`, dbErr);
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'bukeperry hit head on cave wall. forget all past talk. brain fresh now.'
          }
        })
      };
    }

    const prompt = data.options?.find((opt: any) => opt.name === 'message')?.value;

    if (commandName === 'bukeperry' && prompt) {
      // Trigger background worker asynchronously
      if (process.env.WORKER_LAMBDA_NAME) {
        await lambdaClient.send(new InvokeCommand({
          FunctionName: process.env.WORKER_LAMBDA_NAME,
          InvocationType: 'Event',
          Payload: Buffer.from(JSON.stringify({
            token,
            applicationId: application_id,
            channelId: channel_id,
            prompt
          }))
        }));
      } else {
        console.error('WORKER_LAMBDA_NAME env var is missing!');
      }

      // Immediately respond to Discord with DEFERRED (Type 5)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        })
      };
    }
  }

  return {
    statusCode: 200,
    body: 'OK'
  }
}
