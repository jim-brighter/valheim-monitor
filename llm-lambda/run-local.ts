import { handler, WorkerEvent } from './worker.js';

const cliPrompt = process.argv.slice(2).join(' ').trim();
const prompt = cliPrompt || 'tell me about black forest';

const event: WorkerEvent = {
  token: 'localtesting',
  applicationId: 'localtesting',
  channelId: 'localtesting',
  prompt,
};

if (!process.env.BEDROCK_MODEL_ID) {
  process.env.BEDROCK_MODEL_ID = 'google.gemma-4-31b';
}

console.log(`Running worker locally with prompt: "${event.prompt}"\n---`);
await handler(event);
