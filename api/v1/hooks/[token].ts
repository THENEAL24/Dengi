import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeHook } from '../_lib/auth';
import { parseIngressEnvelope, rejectPlaintextBody } from '../_lib/envelope';
import { checkBlobDedup, checkHookRateLimit, pushEvent } from '../_lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.query.token as string | undefined;
  if (!token) return res.status(404).end();

  const auth = await authorizeHook(token);
  if (!auth) return res.status(401).end();

  if (!(await checkHookRateLimit(token))) return res.status(429).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (rejectPlaintextBody(body)) return res.status(400).json({ error: 'plaintext_rejected' });

  const envelope = parseIngressEnvelope(body);
  if (!envelope) return res.status(400).json({ error: 'bad_envelope' });

  if (!(await checkBlobDedup(auth.deviceId, envelope.iv, envelope.ct))) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  try {
    const id = await pushEvent(auth.deviceId, envelope);
    return res.status(200).json({ ok: true, id });
  } catch {
    return res.status(503).end();
  }
}
