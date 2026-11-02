import { registerSyncIndex } from '../_lib/auth';
import { hashSha256, randomToken } from '../_lib/crypto';
import { edgeConfig, empty, json } from '../_lib/http';
import { saveDevice } from '../_lib/redis';

export const config = edgeConfig;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return empty(405);

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
