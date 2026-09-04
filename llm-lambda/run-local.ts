import { handler, WorkerEvent } from './worker.js';

const cliPrompt = process.argv.slice(2).join(' ').trim();
const prompt = cliPrompt || 'tell me about black forest';

const event: WorkerEvent = {
  token: 'localtesting',
  applicationId: 'localtesting',
  channelId: 'localtesting',
  prompt,
};

console.log(`Running worker locally with prompt: "${event.prompt}"\n---`);
await handler(event);
