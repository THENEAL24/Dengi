/** Все суммы внутри приложения — целые копейки. Дробных рублей в состоянии не существует. */

export const MINOR_IN_MAJOR = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_IN_MAJOR);
}

export function toMajor(minor: number): number {
  return minor / MINOR_IN_MAJOR;
}

/** Разбирает пользовательский ввод: «1 234,56», «1234.5», «1200» */
export function parseAmount(input: string): number | null {
  const normalized = input
    .replace(/\s|\u00a0/g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  if (!normalized || normalized === '.') return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return toMinor(value);
}

const currencySymbols: Record<string, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KZT: '₸',
  BYN: 'Br',
  UAH: '₴',
  GEL: '₾',
  TRY: '₺',
  AMD: '֏',
  RSD: 'дин.',
  THB: '฿',
  AED: 'AED',
};

export function currencySymbol(currency: string): string {
  return currencySymbols[currency] ?? currency;
}

type FormatOptions = {
  /** Показывать копейки. 'auto' — только когда они не нулевые */
  cents?: boolean | 'auto';
  /** Всегда показывать знак, в том числе «+» */
  signed?: boolean;
  /** Без символа валюты */
  bare?: boolean;
};

export function formatMoney(
  minor: number,
  currency = 'RUB',
  { cents = 'auto', signed = false, bare = false }: FormatOptions = {},
): string {
  const showCents = cents === 'auto' ? minor % MINOR_IN_MAJOR !== 0 : cents;
  const digits = showCents ? 2 : 0;
  const absolute = Math.abs(minor) / MINOR_IN_MAJOR;

  const number = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(absolute);

  const sign = minor < 0 ? '−' : signed && minor > 0 ? '+' : '';
  const symbol = bare ? '' : ` ${currencySymbol(currency)}`;
  return `${sign}${number}${symbol}`;
}

/** Компактный вид для графиков: 12,5 тыс. */
export function formatCompact(minor: number, currency = 'RUB'): string {
  const major = Math.abs(minor) / MINOR_IN_MAJOR;
  const sign = minor < 0 ? '−' : '';
  if (major >= 1_000_000) {
    return `${sign}${(major / 1_000_000).toFixed(1).replace('.', ',')} млн ${currencySymbol(currency)}`;
  }
  if (major >= 10_000) {
    return `${sign}${Math.round(major / 1000)} тыс. ${currencySymbol(currency)}`;
  }
  return formatMoney(minor, currency, { cents: false });
}

/** Ввод с клавиатуры хранится как строка цифр; тут — её показ и значение */
export function keypadToMinor(digits: string): number {
  if (!digits) return 0;
  const [whole, fraction = ''] = digits.split('.');
  const wholeMinor = Number(whole || '0') * MINOR_IN_MAJOR;
  const fractionMinor = Number(fraction.padEnd(2, '0').slice(0, 2) || '0');
  return wholeMinor + fractionMinor;
}

export function keypadDisplay(digits: string): string {
  if (!digits) return '0';
  const [whole, fraction] = digits.split('.');
  const formattedWhole = new Intl.NumberFormat('ru-RU').format(Number(whole || '0'));
  if (fraction === undefined) return formattedWhole;
  return `${formattedWhole},${fraction}`;
}
