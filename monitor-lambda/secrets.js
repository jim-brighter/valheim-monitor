import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { CONFIG } from './config.js';

const secretsClient = new SecretsManagerClient({ region: CONFIG.REGION });

/**
 * Retrieves and parses JSON secrets from AWS Secrets Manager.
 *
 * @param {string} [secretId] - The secret name or ARN (defaults to CONFIG.SECRET_ID)
 * @returns {Promise<Object>}
 */
export async function getSecrets(secretId = CONFIG.SECRET_ID) {
  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: secretId
    }));

    return JSON.parse(response.SecretString);
  } catch (e) {
    console.error('Error retrieving secrets from Secrets Manager', e);
    throw e;
  }
}
