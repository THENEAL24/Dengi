import { authorizeSyncSecret } from '../_lib/auth.js';
import { bearerAuth, edgeConfig, empty, json } from '../_lib/http.js';
import { listEvents } from '../_lib/redis.js';

export const config = edgeConfig;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return empty(405);
  const syncSecret = bearerAuth(request);
  if (!syncSecret) return empty(401);

  const auth = await authorizeSyncSecret(syncSecret);
  if (!auth) return empty(401);

  const url = new URL(request.url);
  const cursorRaw = url.searchParams.get('cursor') ?? '0';
  const cursor = Number.parseInt(cursorRaw, 10) || 0;

  try {
    const page = await listEvents(auth.deviceId, cursor);
    return json({
      events: page.events.map(({ id, v, alg, kid, iv, ct, ts }) => ({
        id,
        v,
        alg,
        kid,
        iv,
        ct,
        ts,
      })),
      nextCursor: page.nextCursor === null ? null : String(page.nextCursor),
    });
  } catch {
    return empty(503);
  }
}
