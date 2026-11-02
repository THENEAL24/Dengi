export type IngressEnvelopeWire = {
  v: 1;
  alg: 'A256GCM';
  kid: 'ingress';
  iv: string;
  ct: string;
};

const FORBIDDEN = new Set(['text', 'amount', 'balance', 'merchant', 'sender']);

export function parseIngressEnvelope(body: unknown): IngressEnvelopeWire | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (o.v !== 1 || o.alg !== 'A256GCM' || o.kid !== 'ingress') return null;
  if (typeof o.iv !== 'string' || typeof o.ct !== 'string') return null;
  if (o.iv.length > 64 || o.ct.length > 12_000) return null;
  for (const key of Object.keys(o)) {
    if (FORBIDDEN.has(key)) return null;
  }
  return { v: 1, alg: 'A256GCM', kid: 'ingress', iv: o.iv, ct: o.ct };
}

export function rejectPlaintextBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const o = body as Record<string, unknown>;
  return typeof o.text === 'string' || typeof o.amount === 'number';
}
