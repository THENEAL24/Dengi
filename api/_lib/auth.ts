import { hashSha256 } from './crypto.js';
import { getDevice, getDeviceIdByHook, redisGet, redisSet } from './redis.js';

export async function authorizeSyncSecret(
  syncSecret: string,
): Promise<{ deviceId: string } | null> {
  const hash = await hashSha256(syncSecret);
  const deviceId = await redisGet(`sync:${hash}`);
  if (!deviceId) return null;
  const device = await getDevice(deviceId);
  if (!device || device.revoked === '1') return null;
  if (device.syncSecretHash !== hash) return null;
  return { deviceId };
}

export async function registerSyncIndex(deviceId: string, syncSecret: string) {
  const hash = await hashSha256(syncSecret);
  await redisSet(`sync:${hash}`, deviceId, 60 * 60 * 24 * 365);
}

export async function authorizeHook(token: string): Promise<{ deviceId: string } | null> {
  const deviceId = await getDeviceIdByHook(token);
  if (!deviceId) return null;
  const device = await getDevice(deviceId);
  if (!device || device.revoked === '1') return null;
  return { deviceId };
}
