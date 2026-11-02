import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hashSyncSecret, randomToken } from '../_lib/crypto';
import { registerSyncIndex } from '../_lib/auth';
import { saveDevice } from '../_lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const deviceId = randomToken('d');
    const webhookToken = randomToken('w');
    const syncSecret = randomToken('s');
    const syncSecretHash = hashSyncSecret(syncSecret);

    await saveDevice(deviceId, {
      syncSecretHash,
      webhookToken,
      revoked: '0',
      createdAt: String(Date.now()),
    });
    await registerSyncIndex(deviceId, syncSecret);

    return res.status(200).json({ deviceId, webhookToken, syncSecret });
  } catch {
    return res.status(503).json({ error: 'storage_unavailable' });
  }
}
