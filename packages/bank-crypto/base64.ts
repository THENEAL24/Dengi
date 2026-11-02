const BASE64URL =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += BASE64URL[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += BASE64URL[c & 63];
  }
  return out;
}

export function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4;
  const s = pad ? input + '='.repeat(4 - pad) : input;
  const map = new Map<string, number>();
  for (let i = 0; i < BASE64URL.length; i++) map.set(BASE64URL[i]!, i);
  for (const ch of s) {
    if (ch === '=') continue;
    if (!map.has(ch)) throw new Error('invalid base64url');
  }
  const clean = s.replace(/=/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = map.get(clean[i]!) ?? 0;
    const b = map.get(clean[i + 1] ?? '') ?? 0;
    const c = map.get(clean[i + 2] ?? '') ?? 0;
    const d = map.get(clean[i + 3] ?? '') ?? 0;
    out.push((a << 2) | (b >> 4));
    if (i + 2 < clean.length) out.push(((b & 15) << 4) | (c >> 2));
    if (i + 3 < clean.length) out.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(out);
}

export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}
