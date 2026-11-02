import { edgeConfig, empty, json } from '../../_lib/http.js';

export const config = edgeConfig;

const TEST_SMS_SENDER = '+79166353981';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return empty(405);

  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const key = url.searchParams.get('key') ?? '';
  if (!token || !key) return json({ error: 'missing_params' }, 400);

  const origin = url.origin;
  const hookUrl = `${origin}/api/v1/hooks/${encodeURIComponent(token)}`;

  const script = `
const KEY='${key.replace(/'/g, "\\'")}';
const HOOK='${hookUrl.replace(/'/g, "\\'")}';
function b64uEnc(bytes){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let o='';for(let i=0;i<bytes.length;i+=3){const x=bytes[i],y=bytes[i+1],z=bytes[i+2];o+=a[x>>2]+a[((x&3)<<4)|((y||0)>>4)];if(y!==undefined)o+=a[((y&15)<<2)|((z||0)>>6)];if(z!==undefined)o+=a[z&63]}return o}
async function run(input){
  const text=typeof input==='string'?input:(input?.text||'');
  const sender=input?.sender||'9-00';
  const keyBytes=Uint8Array.from(atob(KEY.replace(/-/g,'+').replace(/_/g,'/').padEnd(KEY.length+(4-KEY.length%4)%4,'=')),c=>c.charCodeAt(0));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ck=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
  const payload={v:1,text,sender,receivedAt:new Date().toISOString()};
  const pt=new TextEncoder().encode(JSON.stringify(payload));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},ck,pt));
  const body=JSON.stringify({v:1,alg:'A256GCM',kid:'ingress',iv:b64uEnc(iv),ct:b64uEnc(ct)});
  const res=await fetch(HOOK,{method:'POST',headers:{'Content-Type':'application/json'},body});
  if(!res.ok) throw new Error('hook '+res.status);
  return 'OK';
}
`.trim();

  return json({
    name: 'Деньги: банковское SMS',
    hookUrl,
    runJavaScript: script,
    automation: {
      senders: ['9-00', '900', TEST_SMS_SENDER],
      hint: `Автоматизация → Сообщение → от 9-00, 900 или ${TEST_SMS_SENDER} (тест) → передать текст SMS`,
    },
  });
}
