import { Redis } from '@upstash/redis';
import { blobDedupKey } from './crypto.js';
import type { IngressEnvelopeWire } from './envelope.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('missing_upstash_env');
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

export const EVENT_TTL_SEC = 7 * 24 * 3600;
export const MAX_EVENTS = 200;
export const HOOK_RATE_LIMIT = 60;

export type StoredEvent = IngressEnvelopeWire & { id: string; ts: number };

export async function getDeviceIdByHook(token: string): Promise<string | null> {
  const r = await getRedis().get<string>(`hook:${token}`);
  return r ?? null;
}

export async function getDevice(deviceId: string) {
  return getRedis().hgetall<{ syncSecretHash: string; webhookToken: string; revoked: string }>(
    `device:${deviceId}`,
  );
}

export async function saveDevice(deviceId: string, data: Record<string, string>) {
  await getRedis().hset(`device:${deviceId}`, data);
  await getRedis().set(`hook:${data.webhookToken}`, deviceId);
}

export async function revokeDevice(deviceId: string) {
  const device = await getDevice(deviceId);
  if (device?.webhookToken) await getRedis().del(`hook:${device.webhookToken}`);
  await getRedis().hset(`device:${deviceId}`, { revoked: '1' });
  await getRedis().del(`events:${deviceId}`);
}

export async function pushEvent(deviceId: string, envelope: IngressEnvelopeWire): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const item: StoredEvent = { ...envelope, id, ts: Date.now() };
  const key = `events:${deviceId}`;
  const r = getRedis();
  await r.lpush(key, JSON.stringify(item));
  await r.ltrim(key, 0, MAX_EVENTS - 1);
  await r.expire(key, EVENT_TTL_SEC);
  return id;
}

export async function listEvents(
  deviceId: string,
  cursor: number,
): Promise<{ events: StoredEvent[]; nextCursor: number | null }> {
  const key = `events:${deviceId}`;
  const end = cursor + 49;
  const raw = await getRedis().lrange<string>(key, cursor, end);
  const events = raw
    .map((s) => {
      try {
        return JSON.parse(s) as StoredEvent;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as StoredEvent[];
  const nextCursor = events.length >= 50 ? cursor + events.length : null;
  return { events, nextCursor };
}

export async function ackEvents(deviceId: string, ids: string[]) {
  if (ids.length === 0) return;
  const key = `events:${deviceId}`;
  const all = await getRedis().lrange<string>(key, 0, MAX_EVENTS - 1);
  const keep = all.filter((s) => {
    try {
      const e = JSON.parse(s) as StoredEvent;
      return !ids.includes(e.id);
    } catch {
      return true;
    }
  });
  const r = getRedis();
  await r.del(key);
  if (keep.length > 0) {
    await r.rpush(key, ...keep);
    await r.expire(key, EVENT_TTL_SEC);
  }
}

export async function checkHookRateLimit(token: string): Promise<boolean> {
  const hour = new Date().toISOString().slice(0, 13);
  const key = `rl:hook:${token}:${hour}`;
  const n = await getRedis().incr(key);
  if (n === 1) await getRedis().expire(key, 3600);
  return n <= HOOK_RATE_LIMIT;
}

export async function checkBlobDedup(deviceId: string, iv: string, ct: string): Promise<boolean> {
  void deviceId;
  const h = await blobDedupKey(iv, ct);
  const key = `dedup:blob:${h}`;
  const ok = await getRedis().set(key, '1', { nx: true, ex: EVENT_TTL_SEC });
  return ok === 'OK';
}
