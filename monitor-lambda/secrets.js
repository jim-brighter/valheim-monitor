import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { CONFIG } from './config.js';

const secretsClient = new SecretsManagerClient({ region: CONFIG.REGION });

let cachedSecrets = null;

/**
 * Retrieves and parses JSON secrets from AWS Secrets Manager.
 * Caches the parsed secrets in memory to prevent repeated Secrets Manager/KMS API calls across warm invocations.
 *
 * @param {string} [secretId] - The secret name or ARN (defaults to CONFIG.SECRET_ID)
 * @returns {Promise<Object>}
 */
export async function getSecrets(secretId = CONFIG.SECRET_ID) {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: secretId
    }));

    cachedSecrets = JSON.parse(response.SecretString);
    return cachedSecrets;
  } catch (e) {
    console.error('Error retrieving secrets from Secrets Manager', e);
    throw e;
  }
}
