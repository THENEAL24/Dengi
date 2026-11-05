import { describe, expect, it } from 'vitest';
import { defaultAmountRoundingForCurrency } from './currencies';
import { convertAmountMinor, normalizeAmountMinor } from './currencyConvert';

describe('defaultAmountRoundingForCurrency', () => {
  it('рубли и валюты без дробных единиц — до целых', () => {
    expect(defaultAmountRoundingForCurrency('RUB')).toBe('whole');
    expect(defaultAmountRoundingForCurrency('KZT')).toBe('whole');
    expect(defaultAmountRoundingForCurrency('JPY')).toBe('whole');
  });

  it('доллар, евро и прочие с центами — точный учёт', () => {
    expect(defaultAmountRoundingForCurrency('USD')).toBe('precise');
    expect(defaultAmountRoundingForCurrency('EUR')).toBe('precise');
    expect(defaultAmountRoundingForCurrency('BYN')).toBe('precise');
  });
});

describe('convertAmountMinor', () => {
  it('пересчитывает RUB → USD по встроенному курсу', () => {
    const rub = 9_200_00;
    const usd = convertAmountMinor(rub, 'RUB', 'USD', 'precise');
    expect(usd).toBe(10_000);
  });

  it('округляет до целых в режиме whole', () => {
    const usd = convertAmountMinor(9_200_00, 'RUB', 'USD', 'whole');
    expect(usd % 100).toBe(0);
    expect(usd).toBe(10_000);
  });

  it('сохраняет знак', () => {
    expect(convertAmountMinor(-50_000, 'USD', 'USD', 'precise')).toBe(-50_000);
  });

  it('нормализует копейки в precise', () => {
    expect(normalizeAmountMinor(12_345, 'USD', 'precise')).toBe(12_345);
    expect(normalizeAmountMinor(12_346, 'USD', 'precise')).toBe(12_346);
  });

  it('нормализует до целых рублей', () => {
    expect(normalizeAmountMinor(12_350, 'RUB', 'whole')).toBe(12_400);
    expect(normalizeAmountMinor(12_349, 'RUB', 'whole')).toBe(12_300);
  });
});
