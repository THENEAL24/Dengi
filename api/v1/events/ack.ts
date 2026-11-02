import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeSyncSecret } from '../_lib/auth';
import { ackEvents } from '../_lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const syncSecret = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!syncSecret) return res.status(401).end();

  const auth = await authorizeSyncSecret(syncSecret);
  if (!auth) return res.status(401).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
  if (ids.length === 0) return res.status(400).end();

  try {
    await ackEvents(auth.deviceId, ids.slice(0, 100));
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).end();
  }
}
