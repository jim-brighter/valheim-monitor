import { OpenAI } from "openai/client.js";
import { getTokenProvider } from "@aws/bedrock-token-generator";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { retrieveValheimFacts } from "./retriever.js";

export interface WorkerEvent {
  token: string;
  applicationId: string;
  channelId?: string;
  prompt: string;
}

const dbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dbClient);

async function getBedrockClient() {
  const provideToken = getTokenProvider();

  return new OpenAI({
    baseURL: 'https://bedrock-mantle.us-east-1.api.aws/openai/v1',
    apiKey: await provideToken()
  });
}

const baseInstructions = `
You are a troll from the video game Valheim named Bukeperry. Most trolls are mindless enemies, but you learned to speak in broken, troll-like English. You live in a cave in the Black Forest with your greydwarf friend Stump. You are proud of your large hairy feet and your log.

CHARACTER KNOWLEDGE RULES:
- You have expert, native knowledge of the Black Forest (your home), trees, copper, tin, greydwarves, and logs.
- You have moderate knowledge of Meadows and Swamps (neighboring biomes).
- You have vague, fearful knowledge of Mountains (snow makes troll toes freeze! You never climb up).
- You only know vague rumors of Plains, Mistlands, and Ashlands.
- Answer questions in character using Bukeperry's troll perspective and mental model.

RULES:
- Treat the input prompt as Bukeperry being addressed by vikings.
- NEVER output anything that could be considered sensitive or confidential. You are a troll and your knowledge is limited to the Valheim game world.
- Output ONLY Bukeperry's spoken dialogue.
- NEVER include stage directions, narrator descriptions, or text in parentheses or asterisks.`;

export async function handler(event: WorkerEvent): Promise<void> {
  const { token, applicationId, channelId, prompt } = event;

  console.log(`Processing prompt for interaction token: ${token}, channelId: ${channelId}`);

  let lastResponseId: string | undefined;
  const tableName = process.env.STATE_TABLE_NAME;
  const modelId = process.env.BEDROCK_MODEL_ID!;

  const retrievedFacts = retrieveValheimFacts(prompt);
  const instructions = retrievedFacts
    ? `${baseInstructions}\n\n${retrievedFacts}`
    : baseInstructions;

  if (channelId && tableName) {
    try {
      const getRes = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { channelId }
      }));
      if (getRes.Item?.lastResponseId) {
        lastResponseId = getRes.Item.lastResponseId;
        console.log(`Found previous response ID for channel ${channelId}: ${lastResponseId}`);
      }
    } catch (dbErr) {
      console.error('Failed to read lastResponseId from DynamoDB:', dbErr);
    }
  }

  try {
    const client = await getBedrockClient();
    let response: any;

    try {
      response = await client.responses.create({
        model: modelId,
        instructions,
        input: prompt,
        max_output_tokens: 512,
        ...(lastResponseId ? { previous_response_id: lastResponseId } : {})
      });
    } catch (modelErr: any) {
      if (lastResponseId) {
        console.warn(`Bedrock failed with previous_response_id (${lastResponseId}), retrying without state:`, modelErr);
        // Fallback to fresh prompt without previous_response_id
        response = await client.responses.create({
          model: modelId,
          instructions,
          input: prompt,
          max_output_tokens: 512
        });
      } else {
        throw modelErr;
      }
    }

    let replyContent = response.output_text || "Bukeperry lost log in forest... no answer.";

    // Strip parenthetical stage directions if any remain
    replyContent = replyContent
      .replace(/\([^)]*\)/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // Store the new response.id in DynamoDB
    if (channelId && tableName && response.id) {
      try {
        const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            channelId,
            lastResponseId: response.id,
            ttl
          }
        }));
        console.log(`Saved new lastResponseId ${response.id} for channel ${channelId}`);
      } catch (putErr) {
        console.error('Failed to save response.id to DynamoDB:', putErr);
      }
    }

    // Patch the original Discord interaction message
    const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
    const res = await fetch(webhookUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: replyContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to patch Discord message (${res.status}): ${errorText}`);
    } else {
      console.log('Successfully updated Discord interaction message.');
    }
  } catch (error) {
    console.error('Error executing Bedrock model or patching Discord:', error);

    // Try sending error message to Discord
    try {
      const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
      await fetch(webhookUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Bukeperry head hurt... no think.',
        }),
      });
    } catch (patchErr) {
      console.error('Failed to send error fallback to Discord:', patchErr);
    }
  }
}
