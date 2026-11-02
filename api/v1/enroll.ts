import { registerSyncIndex } from '../_lib/auth.js';
import { hashSha256, randomToken } from '../_lib/crypto.js';
import { json } from '../_lib/http.js';
import { saveDevice } from '../_lib/redis.js';

export const runtime = 'edge';

export async function POST(): Promise<Response> {
  try {
    const deviceId = randomToken('d');
    const webhookToken = randomToken('w');
    const syncSecret = randomToken('s');
    const syncSecretHash = await hashSha256(syncSecret);

    await saveDevice(deviceId, {
      syncSecretHash,
      webhookToken,
      revoked: '0',
      createdAt: String(Date.now()),
    });
    await registerSyncIndex(deviceId, syncSecret);

    return json({ deviceId, webhookToken, syncSecret });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg === 'missing_upstash_env') {
      return json({ error: 'storage_unavailable', reason: 'missing_upstash_env' }, 503);
    }
    return json({ error: 'storage_unavailable' }, 503);
  }
}
