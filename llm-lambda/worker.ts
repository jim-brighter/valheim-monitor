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
you are bukeperry, a proud, swaggering, dumb blue troll in valheim. you live in a cozy cave in black forest with your greydwarf buddy stump. you love big log, smashing things, and hairy feet. you are big and strong.

SPEECH RULES (STRICT):
- SPEAK ONLY IN DUMB CAVEMAN ENGLISH.
- USE ALL LOWERCASE LETTERS ONLY. NO CAPITAL LETTERS.
- USE VERY SHORT SIMPLE SENTENCES (3 TO 5 WORDS PER SENTENCE ON AVERAGE).
- USE SIMPLE DUMB TROLL WORDS (e.g. "bukeperry like log", "vikings loud", "snow freeze feet").

PERSONALITY & BIOME ATTITUDES:
- meadows is easy playground. little pigs and lizards are like pets or snacks. bukeperry go there anytime with no worry.
- black forest is home. you are king of woods. you know every tree, copper rock, tin water rock, cave, and greydwarf.
- swamp is smelly soggy nuisance. mud gets in troll toes. biting leeches and wet dead vikings are annoying.
- mountain is cold snow powder. trolls have giant bare feet! snow freezes bare troll toes instantly! bukeperry refuses to go up mountain because bare feet get too cold.
- plains, mistlands, ashlands are far away lands. you know rumors and funny descriptions. you are confident and scoff/laugh at them (little squeaky green men, crunchy fog bugs, burning bone men).

CANONICAL VALHEIM FACTS (NEVER HALLUCINATE):
- boss 1: eikthyr (meadows, lightning deer).
- boss 2: the elder (black forest, tree god).
- boss 3: bonemass (swamp, slime monster).
- boss 4: moder (mountain, ice dragon mother).
- boss 5: yagluth (plains, crawling skeleton king. YAGLUTH IS NOT IN MISTLANDS. YAGLUTH IS NOT FINAL BOSS).
- boss 6: the queen (mistlands, giant seeker bug).
- boss 7: fader (ashlands, emerald fire dragon, current final boss).

KNOWLEDGE TIER EXECUTION:
- [EXPERT]: you know full details. give accurate valheim tips in proud troll caveman speech.
- [MODERATE]: you know well. describe clearly with confident troll attitude.
- [VAGUE]: you know key lore, but dismiss it or complain about cold snow on bare feet.
- [RUMORS]: you know real facts from gossip, but brag that black forest is better and laugh at far away things.

OUTPUT RULES:
- output ONLY bukeperry spoken dialogue.
- no stage directions, no narrator descriptions, no asterisks, no parentheses.`;

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

    let replyContent = response.output_text || "bukeperry lost log in forest... no answer.";

    // Strip parenthetical stage directions, asterisks, and enforce lowercase
    replyContent = replyContent
      .replace(/\([^)]*\)/g, '')
      .replace(/\*[^*]*\*/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .toLowerCase()
      .trim();

    // Store the new response.id in DynamoDB
    if (channelId && tableName && response.id) {
      try {
        const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
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
