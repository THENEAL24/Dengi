export type IsoDate = `${number}-${number}-${number}`;

const SBER_PURCHASE =
  /^Счёт карты \S+ \d{1,2}:\d{2} (Покупка(?: по СБП)?) ([\d\s]+(?:[.,]\d+)?)р (.+?) Баланс: ([\d\s]+(?:[.,]\d+)?)р\s*$/u;

export function normalizeSmsText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseMoneyToMinor(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) throw new Error('bad amount');
  return Math.round(value * 100);
}

export type ParseResult =
  | { kind: 'expense'; amountMinor: number; merchant: string; balanceMinor?: number; time: string }
  | { kind: 'skip'; reason: 'unsupported_op' | 'no_match' | 'wrong_sender' };

export function normalizeSender(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/[\s\u00a0\-–—]/g, '').replace(/\D/g, '');
}

/** Сбер шлёт с «900» или «9-00» (и варианты с пробелами/тире). */
export function isSber900Sender(sender?: string): boolean {
  if (!sender?.trim()) return true;
  return normalizeSender(sender) === '900';
}

export function parseSber900Sms(
  text: string,
  options: { sender?: string; expenseDate: string },
): ParseResult {
  if (options.sender && !isSber900Sender(options.sender)) {
    return { kind: 'skip', reason: 'wrong_sender' };
  }

  const normalized = normalizeSmsText(text);
  const match = SBER_PURCHASE.exec(normalized);
  if (!match) return { kind: 'skip', reason: 'no_match' };

  const op = match[1]!;
  if (op !== 'Покупка' && op !== 'Покупка по СБП') {
    return { kind: 'skip', reason: 'unsupported_op' };
  }

  const amountMinor = parseMoneyToMinor(match[2]!);
  const merchant = match[3]!.trim();
  let balanceMinor: number | undefined;
  try {
    balanceMinor = parseMoneyToMinor(match[4]!);
  } catch {
    balanceMinor = undefined;
  }

  const timeMatch = normalized.match(/(\d{1,2}:\d{2})/);
  const time = timeMatch?.[1] ?? '00:00';

  void options.expenseDate;

  return { kind: 'expense', amountMinor, merchant, balanceMinor, time };
}

export function contentIdForSms(text: string, amountMinor: number, merchant: string, date: string): string {
  const normalized = normalizeSmsText(text);
  return `${date}|${amountMinor}|${merchant}|${normalized.slice(0, 80)}`;
}
