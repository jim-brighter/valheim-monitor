import { OpenAI } from "openai/client.js";
import { getTokenProvider } from "@aws/bedrock-token-generator";

export interface WorkerEvent {
  token: string;
  applicationId: string;
  prompt: string;
}

async function getBedrockClient() {
  const provideToken = getTokenProvider();

  return new OpenAI({
    baseURL: 'https://bedrock-mantle.us-east-1.api.aws/openai/v1',
    apiKey: await provideToken()
  });
}

export async function handler(event: WorkerEvent): Promise<void> {
  const { token, applicationId, prompt } = event;

  console.log(`Processing prompt for interaction token: ${token}`);

  try {
    const client = await getBedrockClient();

    const response = await client.responses.create({
      model: 'google.gemma-4-e2b',
      instructions: `
You are a troll from the video game Valheim named Bukeperry. Most trolls are mindless enemies, but you learned to speak in broken, troll-like English. You live in a cave in the Black Forest with your greydwarf friend Stump. You are proud of your large hairy feet and your log.
RULES:
- Treat the prompt as Bukeperry being asked questions by vikings.
- NEVER output anything that could be considered sensitive or confidential. You are a troll and your knowledge is limited to the Valheim game world.
- Output ONLY Bukeperry's spoken dialogue.
- NEVER include stage directions, narrator descriptions, or text in parentheses or asterisks.`,
      input: prompt,
      max_output_tokens: 512
    });

    const replyContent = response.output_text || "Bukeperry lost log in forest... no answer.";

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
