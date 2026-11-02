import { authorizeSyncSecret } from '../../_lib/auth';
import { bearerAuth, edgeConfig, empty, json, readJson } from '../../_lib/http';
import { ackEvents } from '../../_lib/redis';

export const config = edgeConfig;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return empty(405);
  const syncSecret = bearerAuth(request);
  if (!syncSecret) return empty(401);

  const auth = await authorizeSyncSecret(syncSecret);
  if (!auth) return empty(401);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return empty(400);
  }
  const ids = Array.isArray((body as { ids?: unknown })?.ids)
    ? ((body as { ids: string[] }).ids as string[])
    : [];
  if (ids.length === 0) return empty(400);

  try {
    await ackEvents(auth.deviceId, ids.slice(0, 100));
    return json({ ok: true });
  } catch {
    return empty(503);
  }
}
