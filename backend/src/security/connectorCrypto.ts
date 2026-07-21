import crypto from 'node:crypto';

function encryptionKey(): Buffer {
  const encoded = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!encoded) throw new Error('CONNECTOR_ENCRYPTION_KEY is required');
  const key = /^[a-f0-9]{64}$/i.test(encoded) ? Buffer.from(encoded, 'hex') : Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('CONNECTOR_ENCRYPTION_KEY must encode exactly 32 bytes');
  return key;
}

export function encryptConnectorConfig(config: unknown): string {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('connector config must be an object');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptConnectorConfig<T extends Record<string, unknown> = Record<string, unknown>>(value: string): T {
  const [version, ivValue, tagValue, ciphertextValue] = String(value).split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) throw new Error('unsupported encrypted connector config');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}

