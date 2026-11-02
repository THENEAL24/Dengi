import {
  buildBankSmsRunScript,
  buildBankSmsShortcutPlist,
} from '../../../packages/bank-shortcut/runScript.js';
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
  const javaScript = buildBankSmsRunScript(hookUrl, key);
  const format = url.searchParams.get('format') ?? 'shortcut';

  if (format === 'js') {
    return new Response(javaScript, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (format === 'json') {
    return json({
      name: 'Деньги: банковское SMS',
      hookUrl,
      runJavaScript: javaScript,
      automation: {
        senders: ['9-00', '900', TEST_SMS_SENDER],
        hint: `Автоматизация → Сообщение → от 9-00, 900 или ${TEST_SMS_SENDER} (тест) → передать текст SMS`,
      },
    });
  }

  const plist = buildBankSmsShortcutPlist('Деньги: банковское SMS', javaScript);
  return new Response(plist, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="Dengi-Bank-SMS.shortcut"',
    },
  });
}
