import type { AmountRounding } from '@/db/db';
import { currencyDecimals, getCurrency } from './currencies';
import { majorPerUsd } from './exchangeRates';
import { MINOR_IN_MAJOR } from './money';
import { getActiveLocale, intlLocale, translate } from '@/lib/i18n';

/** Приводит сумму к выбранному режиму округления в целевой валюте. */
export function normalizeAmountMinor(
  minor: number,
  currency: string,
  rounding: AmountRounding,
): number {
  if (minor === 0) return 0;
  const sign = minor < 0 ? -1 : 1;
  const absolute = Math.abs(minor);
  const decimals = currencyDecimals(currency);

  let normalized: number;
  if (rounding === 'whole' || decimals === 0) {
    normalized = Math.round(absolute / MINOR_IN_MAJOR) * MINOR_IN_MAJOR;
  } else {
    normalized = Math.round(absolute);
  }
  return sign * normalized;
}

/** Конвертация с учётом курса (через USD) и округления. */
export function convertAmountMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rounding: AmountRounding,
): number {
  if (amountMinor === 0) return 0;
  if (fromCurrency === toCurrency) {
    return normalizeAmountMinor(amountMinor, toCurrency, rounding);
  }

  const sign = amountMinor < 0 ? -1 : 1;
  const majorFrom = Math.abs(amountMinor) / MINOR_IN_MAJOR;
  const usdMajor = majorFrom / majorPerUsd(fromCurrency);
  const majorTo = usdMajor * majorPerUsd(toCurrency);
  const minorTo = majorTo * MINOR_IN_MAJOR;

  return sign * normalizeAmountMinor(minorTo, toCurrency, rounding);
}

export function roundingLabel(mode: AmountRounding, locale = getActiveLocale()): string {
  return translate(locale, mode === 'whole' ? 'rounding.mode.whole' : 'rounding.mode.precise');
}

export function currencyPairRateLabel(from: string, to: string, locale = getActiveLocale()): string {
  if (from === to) return '';
  const oneFromInTo = majorPerUsd(to) / majorPerUsd(from);
  const formatted = new Intl.NumberFormat(intlLocale(), {
    maximumFractionDigits: currencyDecimals(to) === 0 ? 2 : 4,
  }).format(oneFromInTo);
  return translate(locale, 'exchangeRates.pairRate', {
    from: getCurrency(from).code,
    rate: formatted,
    to: getCurrency(to).code,
  });
}
