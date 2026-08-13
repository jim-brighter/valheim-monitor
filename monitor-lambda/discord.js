/**
 * Sends a message notification to a Discord channel via Webhook/Bot REST API.
 *
 * @param {Object} secrets - Secrets containing channel_id, token, and user_agent
 * @param {string} messageContent - The content string to post
 * @returns {Promise<Response>}
 */
export async function sendDiscordMessage(secrets, messageContent) {
  const url = `https://discord.com/api/channels/${secrets.channel_id}/messages`;
  const response = await fetch(url, {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API call failed (${response.status}): ${errorText}`);
  }

  return response;
}
