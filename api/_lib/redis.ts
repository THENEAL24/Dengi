import { createClient, type RedisClientType } from 'redis';
import { blobDedupKey } from './crypto.js';
import type { IngressEnvelopeWire } from './envelope.js';

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

async function getClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      throw new Error('missing_redis_url');
    }
    const c = createClient({
      url,
      socket: { connectTimeout: 8_000, reconnectStrategy: () => false },
    });
    c.on('error', () => {
      /* logged by caller */
    });
    await c.connect();
    client = c;
    return c;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export const EVENT_TTL_SEC = 7 * 24 * 3600;
export const MAX_EVENTS = 200;
export const HOOK_RATE_LIMIT = 60;

export type StoredEvent = IngressEnvelopeWire & { id: string; ts: number };

export async function getDeviceIdByHook(token: string): Promise<string | null> {
  const r = await getClient();
  return r.get(`hook:${token}`);
}

export async function getDevice(deviceId: string) {
  const r = await getClient();
  return r.hGetAll(`device:${deviceId}`) as Promise<{
    syncSecretHash: string;
    webhookToken: string;
    revoked: string;
  }>;
}

export async function saveDevice(deviceId: string, data: Record<string, string>) {
  const r = await getClient();
  await r.hSet(`device:${deviceId}`, data);
  await r.set(`hook:${data.webhookToken}`, deviceId);
}

export async function revokeDevice(deviceId: string) {
  const device = await getDevice(deviceId);
  const r = await getClient();
  if (device?.webhookToken) await r.del(`hook:${device.webhookToken}`);
  await r.hSet(`device:${deviceId}`, { revoked: '1' });
  await r.del(`events:${deviceId}`);
}

export async function redisGet(key: string): Promise<string | null> {
  const r = await getClient();
  return r.get(key);
}

export async function redisSet(key: string, value: string, ttlSec?: number): Promise<void> {
  const r = await getClient();
  if (ttlSec) await r.set(key, value, { EX: ttlSec });
  else await r.set(key, value);
}

export async function pushEvent(deviceId: string, envelope: IngressEnvelopeWire): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const item: StoredEvent = { ...envelope, id, ts: Date.now() };
  const key = `events:${deviceId}`;
  const r = await getClient();
  await r.lPush(key, JSON.stringify(item));
  await r.lTrim(key, 0, MAX_EVENTS - 1);
  await r.expire(key, EVENT_TTL_SEC);
  return id;
}

export async function listEvents(
  deviceId: string,
  cursor: number,
): Promise<{ events: StoredEvent[]; nextCursor: number | null }> {
  const key = `events:${deviceId}`;
  const end = cursor + 49;
  const r = await getClient();
  const raw = await r.lRange(key, cursor, end);
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
  const r = await getClient();
  const all = await r.lRange(key, 0, MAX_EVENTS - 1);
  const keep = all.filter((s) => {
    try {
      const e = JSON.parse(s) as StoredEvent;
      return !ids.includes(e.id);
    } catch {
      return true;
    }
  });
  await r.del(key);
  if (keep.length > 0) {
    await r.rPush(key, keep);
    await r.expire(key, EVENT_TTL_SEC);
  }
}

export async function checkHookRateLimit(token: string): Promise<boolean> {
  const hour = new Date().toISOString().slice(0, 13);
  const key = `rl:hook:${token}:${hour}`;
  const r = await getClient();
  const n = await r.incr(key);
  if (n === 1) await r.expire(key, 3600);
  return n <= HOOK_RATE_LIMIT;
}

export async function checkBlobDedup(deviceId: string, iv: string, ct: string): Promise<boolean> {
  void deviceId;
  const h = await blobDedupKey(iv, ct);
  const key = `dedup:blob:${h}`;
  const r = await getClient();
  const ok = await r.set(key, '1', { NX: true, EX: EVENT_TTL_SEC });
  return ok === 'OK';
}
