import type { CurrencyDecimals } from './currencies';
import { currencyDecimals, getCurrency } from './currencies';
import { getActiveLocale, intlLocale, translate } from '@/lib/i18n';

/** Все суммы внутри приложения — целые минорные единицы (1/100 основной). */

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

export function currencySymbol(currency: string): string {
  return getCurrency(currency).symbol;
}

type FormatOptions = {
  /** Показывать дробную часть. 'auto' — только когда она не нулевая */
  cents?: boolean | 'auto';
  /** @deprecated Не влияет на вывод: «+» не показываем, «−» только для отрицательных */
  signed?: boolean;
  /** Без символа валюты */
  bare?: boolean;
  /** whole — показывать без дробной части */
  rounding?: import('@/db/db').AmountRounding;
};

function resolveCents(
  minor: number,
  currency: string,
  cents: boolean | 'auto',
  rounding?: import('@/db/db').AmountRounding,
): boolean {
  if (rounding === 'whole') return false;
  const decimals = currencyDecimals(currency);
  if (cents === 'auto') return minor % MINOR_IN_MAJOR !== 0;
  return Boolean(cents) && (decimals === 2 || minor % MINOR_IN_MAJOR !== 0);
}

export function formatMoney(
  minor: number,
  currency = 'RUB',
  { cents = 'auto', bare = false, rounding }: FormatOptions = {},
): string {
  const showCents = resolveCents(minor, currency, cents, rounding);
  const digits = showCents ? 2 : 0;
  const absolute = Math.abs(minor) / MINOR_IN_MAJOR;

  const number = new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(absolute);

  const sign = minor < 0 ? '−' : '';
  const symbol = bare ? '' : ` ${currencySymbol(currency)}`;
  return `${sign}${number}${symbol}`;
}

/** Компактный вид для графиков: 12,5 тыс. */
export function formatCompact(minor: number, currency = 'RUB'): string {
  const locale = getActiveLocale();
  const major = Math.abs(minor) / MINOR_IN_MAJOR;
  const sign = minor < 0 ? '−' : '';
  const decimalSep = locale === 'en' ? '.' : ',';
  if (major >= 1_000_000) {
    const unit = translate(locale, 'money.compact.million');
    return `${sign}${(major / 1_000_000).toFixed(1).replace('.', decimalSep)} ${unit} ${currencySymbol(currency)}`;
  }
  if (major >= 10_000) {
    const unit = translate(locale, 'money.compact.thousand');
    return `${sign}${Math.round(major / 1000)} ${unit} ${currencySymbol(currency)}`;
  }
  return formatMoney(minor, currency, { cents: false });
}

/** Минорные единицы → строка для клавиатуры */
export function minorToKeypadDigits(minor: number, currency: string): string {
  const absolute = Math.abs(minor);
  if (absolute === 0) return '';
  const decimals = currencyDecimals(currency);
  if (decimals === 0) return String(Math.round(absolute / MINOR_IN_MAJOR));
  const whole = Math.trunc(absolute / MINOR_IN_MAJOR);
  const fraction = absolute % MINOR_IN_MAJOR;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}

/** Ввод с клавиатуры хранится как строка цифр; тут — её показ и значение */
export function keypadToMinor(digits: string, currency: string | CurrencyDecimals = 'RUB'): number {
  const decimals = typeof currency === 'number' ? currency : currencyDecimals(currency);
  if (!digits) return 0;
  if (decimals === 0) {
    const whole = digits.split('.')[0];
    return Number(whole || '0') * MINOR_IN_MAJOR;
  }
  const [whole, fraction = ''] = digits.split('.');
  const wholeMinor = Number(whole || '0') * MINOR_IN_MAJOR;
  const fractionMinor = Number(fraction.padEnd(2, '0').slice(0, 2) || '0');
  return wholeMinor + fractionMinor;
}

export function keypadDisplay(digits: string, currency: string | CurrencyDecimals = 'RUB'): string {
  const decimals = typeof currency === 'number' ? currency : currencyDecimals(currency);
  if (!digits) return '0';
  const [whole, fraction] = digits.split('.');
  const formattedWhole = new Intl.NumberFormat(intlLocale()).format(Number(whole || '0'));
  if (decimals === 0 || fraction === undefined) return formattedWhole;
  const decimalSep = getActiveLocale() === 'en' ? '.' : ',';
  return `${formattedWhole}${decimalSep}${fraction}`;
}
