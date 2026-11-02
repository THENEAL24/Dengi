import { authorizeSyncSecret } from '../_lib/auth.js';
import { bearerAuth, empty, json } from '../_lib/http.js';
import { revokeDevice } from '../_lib/redis.js';

export const runtime = 'edge';

export async function POST(request: Request): Promise<Response> {
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
