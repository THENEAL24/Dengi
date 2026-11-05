import { ALL_CURRENCY_CODES } from './currencies';
import { db } from '@/db/db';
import { todayIso } from './date';
import { getActiveLocale, intlLocale, translate } from '@/lib/i18n';

/** Запасные курсы, если сеть недоступна или валюты нет в ответе API. */
export const STATIC_MAJOR_PER_USD: Record<string, number> = {
  RUB: 92,
  KZT: 480,
  BYN: 3.25,
  UAH: 41,
  AMD: 390,
  AZN: 1.7,
  GEL: 2.7,
  KGS: 87,
  TJS: 10.9,
  TMT: 3.5,
  UZS: 12_600,
  MDL: 17.5,
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  JPY: 150,
  CNY: 7.2,
  CAD: 1.35,
  AUD: 1.55,
  NZD: 1.65,
  SGD: 1.34,
  HKD: 7.8,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.5,
  PLN: 4.0,
  CZK: 23,
  HUF: 360,
  RON: 4.6,
  BGN: 1.8,
  TRY: 34,
  INR: 84,
  BRL: 5.7,
  MXN: 17,
  ZAR: 18.5,
  KRW: 1350,
  THB: 35,
  AED: 3.67,
  SAR: 3.75,
  ILS: 3.7,
};

for (const code of ALL_CURRENCY_CODES) {
  if (!STATIC_MAJOR_PER_USD[code]) STATIC_MAJOR_PER_USD[code] = 1;
}

/** Сколько major-единиц валюты за 1 USD (обновляется из сети). */
let runtimeMajorPerUsd: Record<string, number> = { ...STATIC_MAJOR_PER_USD };

let refreshInFlight: Promise<boolean> | null = null;

const RATES_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD';

export function majorPerUsd(code: string): number {
  return runtimeMajorPerUsd[code] ?? runtimeMajorPerUsd.USD ?? 1;
}

export function mergeMajorPerUsd(fetched: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...STATIC_MAJOR_PER_USD, USD: 1 };
  for (const code of ALL_CURRENCY_CODES) {
    const rate = fetched[code];
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
      merged[code] = rate;
    }
  }
  return merged;
}

type OpenRatesPayload = { date?: string; usd?: Record<string, number> };

export function parseOpenUsdRates(payload: OpenRatesPayload): {
  date: string;
  majorPerUsd: Record<string, number>;
} {
  const table = payload.usd;
  if (!table) throw new Error('empty rates');
  const fetched: Record<string, number> = { USD: 1 };
  for (const code of ALL_CURRENCY_CODES) {
    const value = table[code.toLowerCase()];
    if (typeof value === 'number' && value > 0) fetched[code] = value;
  }
  return {
    date: payload.date ?? todayIso(),
    majorPerUsd: mergeMajorPerUsd(fetched),
  };
}

type FrankfurterPayload = { date?: string; rates?: Record<string, number> };

export function parseFrankfurterRates(payload: FrankfurterPayload): {
  date: string;
  majorPerUsd: Record<string, number>;
} {
  const table = payload.rates;
  if (!table) throw new Error('empty rates');
  const fetched: Record<string, number> = { USD: 1 };
  for (const code of ALL_CURRENCY_CODES) {
    const value = table[code];
    if (typeof value === 'number' && value > 0) fetched[code] = value;
  }
  return {
    date: payload.date ?? todayIso(),
    majorPerUsd: mergeMajorPerUsd(fetched),
  };
}

async function fetchRatesFromNetwork(): Promise<{ date: string; majorPerUsd: Record<string, number> }> {
  try {
    const response = await fetch(RATES_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('open rates failed');
    return parseOpenUsdRates((await response.json()) as OpenRatesPayload);
  } catch {
    const response = await fetch(FRANKFURTER_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('frankfurter failed');
    return parseFrankfurterRates((await response.json()) as FrankfurterPayload);
  }
}

export function applyMajorPerUsd(rates: Record<string, number>): void {
  runtimeMajorPerUsd = mergeMajorPerUsd(rates);
}

/** Поднять курсы из IndexedDB при старте. */
export async function hydrateExchangeRates(): Promise<void> {
  const settings = await db.settings.get(1);
  if (settings?.exchangeRatesMajorPerUsd) {
    applyMajorPerUsd(settings.exchangeRatesMajorPerUsd);
  }
}

/** Обновить курсы из интернета и сохранить локально. */
export async function refreshExchangeRatesOnline(options?: {
  force?: boolean;
}): Promise<boolean> {
  if (!navigator.onLine) return false;

  const settings = await db.settings.get(1);
  if (!settings) return false;

  const last = settings.exchangeRatesUpdatedAt ?? 0;
  const minIntervalMs = 15 * 60 * 1000;
  if (!options?.force && Date.now() - last < minIntervalMs) {
    return false;
  }

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const { date, majorPerUsd: rates } = await fetchRatesFromNetwork();
      applyMajorPerUsd(rates);
      await db.settings.update(1, {
        exchangeRatesMajorPerUsd: rates,
        exchangeRatesUpdatedAt: Date.now(),
        exchangeRatesDate: date,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function formatExchangeRatesUpdated(
  settings?: {
    exchangeRatesUpdatedAt?: number;
    exchangeRatesDate?: string;
  },
  locale = getActiveLocale(),
): string | null {
  if (!settings?.exchangeRatesUpdatedAt) return null;
  if (settings.exchangeRatesDate) {
    return translate(locale, 'exchangeRates.onDate', { date: settings.exchangeRatesDate });
  }
  const datetime = new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(settings.exchangeRatesUpdatedAt);
  return translate(locale, 'exchangeRates.updatedAt', { datetime });
}

export function ratesAreLive(settings?: { exchangeRatesUpdatedAt?: number }): boolean {
  return Boolean(settings?.exchangeRatesUpdatedAt);
}
