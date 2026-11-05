export type CurrencyDecimals = 0 | 2;

import type { AmountRounding } from '@/db/db';
import { getActiveLocale, translate } from '@/lib/i18n';

export type CurrencyDef = {
  code: string;
  name: string;
  nameEn?: string;
  flag: string;
  symbol: string;
  decimals: CurrencyDecimals;
};

/** ISO 3166-1 alpha-2 → emoji флаг */
export function flagEmoji(iso2: string): string {
  const upper = iso2.toUpperCase();
  if (upper.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...upper].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)));
}

const def = (
  code: string,
  name: string,
  iso2: string,
  symbol: string,
  decimals: CurrencyDecimals,
): CurrencyDef => ({
  code,
  name,
  flag: flagEmoji(iso2),
  symbol,
  decimals,
});

export const CURRENCY_DEFS: CurrencyDef[] = [
  // СНГ
  def('RUB', 'Российский рубль', 'RU', '₽', 0),
  def('KZT', 'Казахстанский тенге', 'KZ', '₸', 0),
  def('BYN', 'Белорусский рубль', 'BY', 'Br', 2),
  def('UAH', 'Украинская гривна', 'UA', '₴', 0),
  def('AMD', 'Армянский драм', 'AM', '֏', 0),
  def('AZN', 'Азербайджанский манат', 'AZ', '₼', 2),
  def('GEL', 'Грузинский лари', 'GE', '₾', 2),
  def('KGS', 'Киргизский сом', 'KG', 'с', 0),
  def('TJS', 'Таджикский сомони', 'TJ', 'SM', 2),
  def('TMT', 'Туркменский манат', 'TM', 'm', 2),
  def('UZS', 'Узбекский сум', 'UZ', 'сум', 0),
  def('MDL', 'Молдавский лей', 'MD', 'L', 2),

  // Основные мировые
  def('USD', 'Доллар США', 'US', '$', 2),
  def('EUR', 'Евро', 'EU', '€', 2),
  def('GBP', 'Фунт стерлингов', 'GB', '£', 2),
  def('CHF', 'Швейцарский франк', 'CH', 'Fr', 2),
  def('JPY', 'Японская иена', 'JP', '¥', 0),
  def('CNY', 'Китайский юань', 'CN', '¥', 2),
  def('CAD', 'Канадский доллар', 'CA', 'CA$', 2),
  def('AUD', 'Австралийский доллар', 'AU', 'A$', 2),
  def('NZD', 'Новозеландский доллар', 'NZ', 'NZ$', 2),
  def('SGD', 'Сингапурский доллар', 'SG', 'S$', 2),
  def('HKD', 'Гонконгский доллар', 'HK', 'HK$', 2),
  def('SEK', 'Шведская крона', 'SE', 'kr', 2),
  def('NOK', 'Норвежская крона', 'NO', 'kr', 2),
  def('DKK', 'Датская крона', 'DK', 'kr', 2),
  def('PLN', 'Польский злотый', 'PL', 'zł', 2),
  def('CZK', 'Чешская крона', 'CZ', 'Kč', 2),
  def('HUF', 'Венгерский форинт', 'HU', 'Ft', 0),
  def('RON', 'Румынский лей', 'RO', 'lei', 2),
  def('BGN', 'Болгарский лев', 'BG', 'лв', 2),
  def('TRY', 'Турецкая лира', 'TR', '₺', 2),
  def('INR', 'Индийская рупия', 'IN', '₹', 2),
  def('BRL', 'Бразильский реал', 'BR', 'R$', 2),
  def('MXN', 'Мексиканское песо', 'MX', '$', 2),
  def('ZAR', 'Южноафриканский ранд', 'ZA', 'R', 2),
  def('KRW', 'Южнокорейская вона', 'KR', '₩', 0),
  def('THB', 'Тайский бат', 'TH', '฿', 2),
  def('AED', 'Дирхам ОАЭ', 'AE', 'AED', 2),
  def('SAR', 'Саудовский риял', 'SA', 'SAR', 2),
  def('ILS', 'Израильский шекель', 'IL', '₪', 2),
];

export const CURRENCIES_BY_CODE = Object.fromEntries(
  CURRENCY_DEFS.map((item) => [item.code, item]),
) as Record<string, CurrencyDef>;

export const CIS_CURRENCY_CODES = CURRENCY_DEFS.slice(0, 12).map((item) => item.code);
export const WORLD_CURRENCY_CODES = CURRENCY_DEFS.slice(12).map((item) => item.code);
export const ALL_CURRENCY_CODES = CURRENCY_DEFS.map((item) => item.code);

export function getCurrency(code: string): CurrencyDef {
  return CURRENCIES_BY_CODE[code] ?? CURRENCIES_BY_CODE.RUB;
}

export function getCurrencyName(code: string, locale = getActiveLocale()): string {
  const key = `currency.name.${code}`;
  const fromMessages = translate(locale, key);
  if (fromMessages !== key) return fromMessages;
  const def = getCurrency(code);
  if (locale === 'en' && def.nameEn) return def.nameEn;
  return def.name;
}

export function currencyDecimals(code: string): CurrencyDecimals {
  return getCurrency(code).decimals;
}

/**
 * Базовый режим округления: валюты без дробных единиц в обороте (₽, ₸, ¥, ₩…)
 * — до целых; валюты с центами/копейками ($, €, £, Br… ) — точный учёт.
 */
export function defaultAmountRoundingForCurrency(code: string): AmountRounding {
  return currencyDecimals(code) === 0 ? 'whole' : 'precise';
}

export function effectiveAmountRounding(currency: string, stored?: AmountRounding): AmountRounding {
  return stored ?? defaultAmountRoundingForCurrency(currency);
}
