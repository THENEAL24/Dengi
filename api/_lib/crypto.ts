import { createHash, randomBytes } from 'node:crypto';

export function randomToken(prefix: string): string {
  return `${prefix}_${randomBytes(18).toString('hex')}`;
}

export function hashSyncSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function blobDedupKey(deviceId: string, iv: string, ct: string): string {
  return createHash('sha256').update(`${iv}:${ct}`).digest('hex');
}
