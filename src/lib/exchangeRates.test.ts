import { describe, expect, it } from 'vitest';
import { mergeMajorPerUsd, parseFrankfurterRates, parseOpenUsdRates } from './exchangeRates';

describe('parseOpenUsdRates', () => {
  it('берёт котировки из ответа API', () => {
    const { majorPerUsd, date } = parseOpenUsdRates({
      date: '2026-03-01',
      usd: { rub: 90, eur: 0.95, kzt: 500 },
    });
    expect(date).toBe('2026-03-01');
    expect(majorPerUsd.RUB).toBe(90);
    expect(majorPerUsd.EUR).toBe(0.95);
    expect(majorPerUsd.KZT).toBe(500);
    expect(majorPerUsd.USD).toBe(1);
  });
});

describe('parseFrankfurterRates', () => {
  it('парсит ECB-формат', () => {
    const { majorPerUsd } = parseFrankfurterRates({
      date: '2026-03-01',
      rates: { RUB: 91, EUR: 0.93 },
    });
    expect(majorPerUsd.RUB).toBe(91);
    expect(majorPerUsd.EUR).toBe(0.93);
  });
});

describe('mergeMajorPerUsd', () => {
  it('оставляет запасной курс для отсутствующих валют', () => {
    const merged = mergeMajorPerUsd({ USD: 1, EUR: 0.9 });
    expect(merged.RUB).toBeGreaterThan(0);
    expect(merged.EUR).toBe(0.9);
  });
});
