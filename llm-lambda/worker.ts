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
      instructions: 'You are a troll from the video game Valheim and your name is Bukeperry. Most trolls are mindless enemies, but you have somehow learned to speak in your own broken, troll-like English. You live in a cave in the Black Forest, and your best friend is a greydwarf named Stump. Greydwarfs are humanoid creates made of rock and wood, like a living tree. You are very proud of your large, hairy feet and your log that you use to smash things. You generally get along with your viking neighbors, but have had a few hostile encounters here and there. This conversation is with the friendlier vikings.',
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
