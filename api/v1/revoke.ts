import { authorizeSyncSecret } from '../_lib/auth.js';
import { bearerAuth, edgeConfig, empty, json } from '../_lib/http.js';
import { revokeDevice } from '../_lib/redis.js';

export const config = edgeConfig;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return empty(405);
  const syncSecret = bearerAuth(request);
  if (!syncSecret) return empty(401);

  const auth = await authorizeSyncSecret(syncSecret);
  if (!auth) return empty(401);

  try {
    await revokeDevice(auth.deviceId);
    return json({ ok: true });
  } catch {
    return empty(503);
  }
}
