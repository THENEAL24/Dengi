import { base64UrlToBytes, bytesToBase64Url, randomBytes } from './base64';

export type IngressEnvelope = {
  v: 1;
  alg: 'A256GCM';
  kid: 'ingress';
  iv: string;
  ct: string;
};

export type IngressPayload = {
  v: 1;
  text: string;
  sender?: string;
  receivedAt?: string;
};

const PLAINTEXT_FORBIDDEN = ['text', 'amount', 'balance', 'merchant'] as const;

export function generateIngressKeyBase64Url(): string {
  return bytesToBase64Url(randomBytes(32));
}

export function ingressKeyFromBase64Url(keyB64: string): Uint8Array {
  const key = base64UrlToBytes(keyB64);
  if (key.length !== 32) throw new Error('ingressKey must be 32 bytes');
  return key;
}

export function isIngressEnvelope(value: unknown): value is IngressEnvelope {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.v !== 1 || o.alg !== 'A256GCM' || o.kid !== 'ingress') return false;
  if (typeof o.iv !== 'string' || typeof o.ct !== 'string') return false;
  for (const k of PLAINTEXT_FORBIDDEN) {
    if (k in o) return false;
  }
  return true;
}

export async function encryptIngressPayload(
  keyB64: string,
  payload: IngressPayload,
): Promise<IngressEnvelope> {
  const key = ingressKeyFromBase64Url(keyB64);
  const iv = randomBytes(12);
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, plain),
  );
  return {
    v: 1,
    alg: 'A256GCM',
    kid: 'ingress',
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(encrypted),
  };
}

export async function decryptIngressPayload(
  keyB64: string,
  envelope: IngressEnvelope,
): Promise<IngressPayload> {
  const key = ingressKeyFromBase64Url(keyB64);
  const iv = base64UrlToBytes(envelope.iv);
  const ct = base64UrlToBytes(envelope.ct);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cryptoKey,
    ct as BufferSource,
  );
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as IngressPayload;
  if (parsed.v !== 1 || typeof parsed.text !== 'string') throw new Error('bad payload');
  return parsed;
}

/** Inline JS for iOS Shortcuts (same layout as Web Crypto AES-GCM). */
export function shortcutsEncryptScript(): string {
  return `
function b64uEnc(bytes){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let o='';for(let i=0;i<bytes.length;i+=3){const x=bytes[i],y=bytes[i+1],z=bytes[i+2];o+=a[x>>2]+a[((x&3)<<4)|((y||0)>>4)];if(y!==undefined)o+=a[((y&15)<<2)|((z||0)>>6)];if(z!==undefined)o+=a[z&63]}return o}
async function encryptIngress(keyB64,payload){
  const keyBytes=Uint8Array.from(atob(keyB64.replace(/-/g,'+').replace(/_/g,'/').padEnd(keyB64.length+(4-keyB64.length%4)%4,'=')),c=>c.charCodeAt(0));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ck=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
  const pt=new TextEncoder().encode(JSON.stringify(payload));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},ck,pt));
  return JSON.stringify({v:1,alg:'A256GCM',kid:'ingress',iv:b64uEnc(iv),ct:b64uEnc(ct)});
}
`.trim();
}
