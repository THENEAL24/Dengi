import { describe, expect, it } from 'vitest';
import { decryptIngressPayload, encryptIngressPayload, generateIngressKeyBase64Url } from './index';

describe('bank-crypto', () => {
  it('roundtrips ingress envelope', async () => {
    const key = generateIngressKeyBase64Url();
    const payload = {
      v: 1 as const,
      text: 'Счёт карты VISA3921 19:19 Покупка 1136.42р MSKAPT Баланс: 100р',
      sender: '900',
      receivedAt: '2026-11-02T16:19:00.000Z',
    };
    const env = await encryptIngressPayload(key, payload);
    const out = await decryptIngressPayload(key, env);
    expect(out.text).toBe(payload.text);
    expect(out.sender).toBe('900');
  });
});
