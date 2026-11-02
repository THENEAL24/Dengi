/** JavaScript for iOS Shortcuts action «Выполнить JavaScript» (self-runs + completion). */
export function buildBankSmsRunScript(hookUrl: string, keyB64: string): string {
  const KEY = keyB64.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const HOOK = hookUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `
function b64uEnc(bytes){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let o='';for(let i=0;i<bytes.length;i+=3){const x=bytes[i],y=bytes[i+1],z=bytes[i+2];o+=a[x>>2]+a[((x&3)<<4)|((y||0)>>4)];if(y!==undefined)o+=a[((y&15)<<2)|((z||0)>>6)];if(z!==undefined)o+=a[z&63]}return o}
function shortcutInputText(){
  if(typeof input!=='undefined') return input;
  if(typeof args!=='undefined'&&args.shortcutInput!==undefined) return args.shortcutInput;
  if(typeof args!=='undefined'&&args.plainText!==undefined) return args.plainText;
  return '';
}
const KEY='${KEY}';
const HOOK='${HOOK}';
(async()=>{
  const raw=shortcutInputText();
  const text=typeof raw==='string'?raw:(raw&&raw.text?String(raw.text):String(raw??''));
  const sender=(raw&&typeof raw==='object'&&raw.sender)?String(raw.sender):'900';
  const keyBytes=Uint8Array.from(atob(KEY.replace(/-/g,'+').replace(/_/g,'/').padEnd(KEY.length+(4-KEY.length%4)%4,'=')),c=>c.charCodeAt(0));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ck=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
  const payload={v:1,text,sender,receivedAt:new Date().toISOString()};
  const pt=new TextEncoder().encode(JSON.stringify(payload));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},ck,pt));
  const body=JSON.stringify({v:1,alg:'A256GCM',kid:'ingress',iv:b64uEnc(iv),ct:b64uEnc(ct)});
  const res=await fetch(HOOK,{method:'POST',headers:{'Content-Type':'application/json'},body});
  if(!res.ok) throw new Error('hook '+res.status);
  if(typeof completion==='function') completion('OK');
})();
`.trim();
}

export function plistEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Unsigned .shortcut plist (import may require manual paste of JS on newer iOS). */
export function buildBankSmsShortcutPlist(name: string, javaScript: string): string {
  const js = plistEscape(javaScript);
  const title = plistEscape(name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowActions</key>
  <array>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.runjavascript</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>JavaScript</key>
        <string>${js}</string>
      </dict>
    </dict>
  </array>
  <key>WFWorkflowClientVersion</key>
  <string>900</string>
  <key>WFWorkflowClientRelease</key>
  <string>2.0</string>
  <key>WFWorkflowIcon</key>
  <dict>
    <key>WFWorkflowIconGlyphNumber</key>
    <integer>59511</integer>
  </dict>
  <key>WFWorkflowImportQuestions</key>
  <array/>
  <key>WFWorkflowInputContentItemClasses</key>
  <array>
    <string>WFStringContentItem</string>
  </array>
  <key>WFWorkflowMinimumClientVersion</key>
  <integer>900</integer>
  <key>WFWorkflowMinimumClientVersionString</key>
  <string>900</string>
  <key>WFWorkflowName</key>
  <string>${title}</string>
  <key>WFWorkflowTypes</key>
  <array>
    <string>NCWidget</string>
    <string>WatchKit</string>
  </array>
</dict>
</plist>`;
}
