import type { VercelRequest } from '@vercel/node';
import { createHash } from 'node:crypto';
import { getDevice, getDeviceIdByHook } from './redis';

export function bearerToken(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export async function deviceIdFromSyncSecret(syncSecret: string): Promise<string | null> {
  const hash = hashSecret(syncSecret);
  // Linear scan not feasible — store reverse index on enroll
  return null;
}

export async function authorizeSyncSecret(
  syncSecret: string,
): Promise<{ deviceId: string } | null> {
  const { getRedis } = await import('./redis');
  const deviceId = await getRedis().get<string>(`sync:${hashSecret(syncSecret)}`);
  if (!deviceId) return null;
  const device = await getDevice(deviceId);
  if (!device || device.revoked === '1') return null;
  if (device.syncSecretHash !== hashSecret(syncSecret)) return null;
  return { deviceId };
}

export async function registerSyncIndex(deviceId: string, syncSecret: string) {
  const { getRedis } = await import('./redis');
  await getRedis().set(`sync:${hashSecret(syncSecret)}`, deviceId, { ex: 60 * 60 * 24 * 365 });
}

export async function authorizeHook(token: string): Promise<{ deviceId: string } | null> {
  const deviceId = await getDeviceIdByHook(token);
  if (!deviceId) return null;
  const device = await getDevice(deviceId);
  if (!device || device.revoked === '1') return null;
  return { deviceId };
}
