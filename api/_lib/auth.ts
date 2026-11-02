import { hashSha256 } from './crypto';
import { getDevice, getDeviceIdByHook, getRedis } from './redis';

export async function authorizeSyncSecret(
  syncSecret: string,
): Promise<{ deviceId: string } | null> {
  const hash = await hashSha256(syncSecret);
  const deviceId = await getRedis().get<string>(`sync:${hash}`);
  if (!deviceId) return null;
  const device = await getDevice(deviceId);
  if (!device || device.revoked === '1') return null;
  if (device.syncSecretHash !== hash) return null;
  return { deviceId };
}

export async function registerSyncIndex(deviceId: string, syncSecret: string) {
  const hash = await hashSha256(syncSecret);
  await getRedis().set(`sync:${hash}`, deviceId, { ex: 60 * 60 * 24 * 365 });
}

export async function authorizeHook(token: string): Promise<{ deviceId: string } | null> {
  const deviceId = await getDeviceIdByHook(token);
  if (!deviceId) return null;
  const device = await getDevice(deviceId);
  if (!device || device.revoked === '1') return null;
  return { deviceId };
}
