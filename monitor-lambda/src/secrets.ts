import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { CONFIG } from './config.js';
import type { MonitorSecrets } from './types.js';

const secretsClient = new SecretsManagerClient({ region: CONFIG.REGION });

let cachedSecrets: MonitorSecrets | null = null;

/**
 * Retrieves and parses JSON secrets from AWS Secrets Manager.
 * Caches the parsed secrets in memory to prevent repeated Secrets Manager/KMS API calls across warm invocations.
 *
 * @param secretId - The secret name or ARN (defaults to CONFIG.SECRET_ID)
 * @returns Parsed secrets object
 */
export async function getSecrets(secretId: string = CONFIG.SECRET_ID): Promise<MonitorSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: secretId,
    }));

    cachedSecrets = JSON.parse(response.SecretString || '{}') as MonitorSecrets;
    return cachedSecrets;
  } catch (e) {
    console.error('Error retrieving secrets from Secrets Manager', e);
    throw e;
  }
}
