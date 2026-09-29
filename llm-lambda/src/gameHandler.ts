import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { generateBukeperryReply } from "./core";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing request body' })
    };
  }

  let body: any;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const prompt = body?.prompt;
  if (!prompt || typeof prompt != 'string' || !prompt.trim()) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing or invalid prompt in request body' })
    };
  }

  let channelId = body?.channelId || '';

  try {
    const reply = await generateBukeperryReply(prompt.trim(), channelId);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error('Error generating reply for game chat:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply: 'bukeperry head hurt... no think',
        error: 'Internal Server Error'
      })
    };
  }
}
