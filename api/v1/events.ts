import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeSyncSecret } from '../_lib/auth';
import { listEvents } from '../_lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const syncSecret = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!syncSecret) return res.status(401).end();

  const auth = await authorizeSyncSecret(syncSecret);
  if (!auth) return res.status(401).end();

  const cursorRaw = typeof req.query.cursor === 'string' ? req.query.cursor : '0';
  const cursor = Number.parseInt(cursorRaw, 10) || 0;

  try {
    const page = await listEvents(auth.deviceId, cursor);
    return res.status(200).json({
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
    return res.status(503).end();
  }
}
