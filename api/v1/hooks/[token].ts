import { authorizeHook } from '../../_lib/auth.js';
import { parseIngressEnvelope, rejectPlaintextBody } from '../../_lib/envelope.js';
import { edgeConfig, empty, hookTokenFromPath, json, readJson } from '../../_lib/http.js';
import { checkBlobDedup, checkHookRateLimit, pushEvent } from '../../_lib/redis.js';

export const config = edgeConfig;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return empty(405);

  const token = hookTokenFromPath(new URL(request.url));
  if (!token) return empty(404);

  const auth = await authorizeHook(token);
  if (!auth) return empty(401);

  if (!(await checkHookRateLimit(token))) return empty(429);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  if (rejectPlaintextBody(body)) return json({ error: 'plaintext_rejected' }, 400);

  const envelope = parseIngressEnvelope(body);
  if (!envelope) return json({ error: 'bad_envelope' }, 400);

  if (!(await checkBlobDedup(auth.deviceId, envelope.iv, envelope.ct))) {
    return json({ ok: true, duplicate: true });
  }

  try {
    const id = await pushEvent(auth.deviceId, envelope);
    return json({ ok: true, id });
  } catch {
    return empty(503);
  }
}
