import { OpenAI } from "openai/client.js";
import { getTokenProvider } from "@aws/bedrock-token-generator";
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecrets() {
  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: 'valheim-monitor-secrets'
    }));

    return JSON.parse(response.SecretString || '{}');
  } catch (e) {
    console.error('Error retrieving secrets from Secrets Manager', e);
    throw e;
  }
}

async function getBedrockClient() {
  const provideToken = getTokenProvider();

  return new OpenAI({
    baseURL: 'https://bedrock-mantle.us-east-1.api.aws/openai/v1',
    apiKey: await provideToken()
  });
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const secrets = await getSecrets();

  const signature = event.headers['x-signature-ed25519']!;
  const timestamp = event.headers['x-signature-timestamp']!;
  const isValidRequest = await verifyKey(event.body, signature, timestamp, secrets.public_key);
  if (!isValidRequest) {
    return {
      statusCode: 401,
      body: JSON.stringify('Unauthorized')
    }
  }

  const { id, type, data } = JSON.parse(event.body || '{}');

  if (type === InteractionType.PING) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        type: InteractionResponseType.PONG
      })
    }
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const commandName = data.name;

    const prompt = data.options?.find((opt: any) => opt.name === 'message')?.value;

    if (commandName === 'bukeperry' && prompt) {
      const client = await getBedrockClient();

      const response = await client.responses.create({
        model: 'google.gemma-4-e2b',
        instructions: 'You are a troll from the video game Valheim and your name is Bukeperry. Most trolls are mindless enemies, but you have somehow learned to speak in your own broken, troll-like English. You live in a cave in the Black Forest, and your best friend is a greydwarf named Stump. Greydwarfs are humanoid creates made of rock and wood, like a living tree. You are very proud of your large, hairy feet and your log that you use to smash things. You generally get along with your viking neighbors, but have had a few hostile encounters here and there. This conversation is with the friendlier vikings.',
        input: prompt,
        max_output_tokens: 512
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response.output_text
          }
        })
      }
    }
  }

  return {
    statusCode: 200,
    body: 'OK'
  }
}
