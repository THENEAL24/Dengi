import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/sber-900.json';
import { parseSber900Sms } from './index';

describe('sber-900', () => {
  it.each(fixtures)('parses purchase $amountMinor', (row) => {
    const result = parseSber900Sms(row.text, { sender: row.sender, expenseDate: '2026-11-02' });
    expect(result.kind).toBe('expense');
    if (result.kind !== 'expense') return;
    expect(result.amountMinor).toBe(row.amountMinor);
    expect(result.merchant).toBe(row.merchant);
  });

  it('accepts sender 9-00', () => {
    const row = fixtures[0]!;
    const result = parseSber900Sms(row.text, { sender: '9-00', expenseDate: '2026-11-02' });
    expect(result.kind).toBe('expense');
  });

  it('skips non-purchase from 900', () => {
    const result = parseSber900Sms('Код 12345. Никому не сообщайте.', {
      sender: '900',
      expenseDate: '2026-11-02',
    });
    expect(result.kind).toBe('skip');
  });
});
