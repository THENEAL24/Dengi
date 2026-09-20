import { describe, expect, it } from 'vitest';
import type { MonthRecord } from '@/db/db';
import { accruedDaysFor, closingBalanceOf, computeMonth, dailyRateFor, isMonthOver } from './budget';
import { daysInMonth } from './date';

function month(overrides: Partial<MonthRecord> = {}): MonthRecord {
  const id = overrides.id ?? '2026-09';
  const startDay = overrides.accrualStartDay ?? 1;
  return {
    id,
    limitMinor: 3_000_00,
    accrualStartDay: startDay,
    accrualDays: overrides.accrualDays ?? daysInMonth(id) - startDay + 1,
    openingBalanceMinor: 0,
    balanceAdjustmentsMinor: 0,
    externalTopUpsMinor: 0,
    status: 'open',
    createdAt: 0,
    ...overrides,
  };
}

describe('accruedDaysFor', () => {
  it('начисляет день целиком, включая сегодняшний', () => {
    expect(accruedDaysFor(month(), '2026-09-01')).toBe(1);
    expect(accruedDaysFor(month(), '2026-09-19')).toBe(19);
    expect(accruedDaysFor(month(), '2026-09-30')).toBe(30);
  });

  it('прошедший месяц начислен полностью, будущий — никак', () => {
    expect(accruedDaysFor(month(), '2026-10-05')).toBe(30);
    expect(accruedDaysFor(month(), '2026-08-31')).toBe(0);
  });

  it('месяц, начатый посередине, считает дни от даты старта', () => {
    const m = month({ accrualStartDay: 19 });
    expect(m.accrualDays).toBe(12);
    expect(accruedDaysFor(m, '2026-09-19')).toBe(1);
    expect(accruedDaysFor(m, '2026-09-25')).toBe(7);
    expect(accruedDaysFor(m, '2026-09-30')).toBe(12);
  });
});

describe('дневная норма', () => {
  it('всегда делит лимит на полное число дней месяца', () => {
    expect(dailyRateFor(3_000_00, '2026-09')).toBe(100_00);
    expect(dailyRateFor(3_100_00, '2026-10')).toBe(100_00);
  });

  it('не зависит от даты старта учёта', () => {
    const fromFirst = computeMonth(month(), 0, '2026-09-19').dailyRateMinor;
    const fromMiddle = computeMonth(month({ accrualStartDay: 19 }), 0, '2026-09-19')
      .dailyRateMinor;
    expect(fromMiddle).toBe(fromFirst);
  });
});

describe('computeMonth', () => {
  it('баланс = перенос + корректировки + начисленное − потраченное', () => {
    const result = computeMonth(
      month({ openingBalanceMinor: 500_00, balanceAdjustmentsMinor: 200_00 }),
      1_200_00,
      '2026-09-10',
    );
    expect(result.accruedMinor).toBe(1_000_00);
    expect(result.dailyRateMinor).toBe(100_00);
    expect(result.balanceMinor).toBe(500_00 + 200_00 + 1_000_00 - 1_200_00);
  });

  it('кастомная дневная норма уменьшает начисление, разницу можно откладывать', () => {
    const m = month({ dailyAccrualMinor: 90_00 });
    const result = computeMonth(m, 0, '2026-09-10');
    expect(result.baseDailyMinor).toBe(100_00);
    expect(result.dailyRateMinor).toBe(90_00);
    expect(result.dailySavingsMinor).toBe(10_00);
    expect(result.accruedMinor).toBe(900_00);
  });

  it('старт посреди месяца: доступен только перенос плюс дни с даты старта', () => {
    const m = month({ accrualStartDay: 19, openingBalanceMinor: 700_00 });

    // в день старта начислена ровно одна дневная норма, прошедшие 18 дней не учитываются
    const first = computeMonth(m, 0, '2026-09-19');
    expect(first.accruedMinor).toBe(100_00);
    expect(first.balanceMinor).toBe(700_00 + 100_00);

    // через неделю — семь дневных норм
    const later = computeMonth(m, 0, '2026-09-25');
    expect(later.accruedMinor).toBe(700_00);
    expect(later.balanceMinor).toBe(700_00 + 700_00);
  });

  it('за неполный месяц начисляется не весь лимит, а только его дни', () => {
    const m = month({ accrualStartDay: 19 });
    const result = computeMonth(m, 0, '2026-09-30');
    expect(result.monthAllowanceMinor).toBe(1_200_00);
    expect(result.accruedMinor).toBe(1_200_00);
    expect(result.projectedEndMinor).toBe(1_200_00);
  });

  it('уходит в минус, если потрачено больше начисленного', () => {
    const result = computeMonth(month(), 900_00, '2026-09-05');
    expect(result.balanceMinor).toBeLessThan(0);
    expect(result.balanceMinor).toBe(500_00 - 900_00);
  });

  it('за полный месяц начисляет ровно лимит, без дрейфа округления', () => {
    // 31 день и лимит, который не делится нацело: 10000/31 = 322,58...
    const m = month({ id: '2026-07', limitMinor: 10_000_00 });
    const result = computeMonth(m, 0, '2026-07-31');
    expect(result.accruedMinor).toBe(10_000_00);

    // сумма ежедневных приростов тоже должна совпасть с лимитом
    let sum = 0;
    let previous = 0;
    for (let day = 1; day <= 31; day += 1) {
      const iso = `2026-07-${String(day).padStart(2, '0')}`;
      const accrued = computeMonth(m, 0, iso).accruedMinor;
      sum += accrued - previous;
      previous = accrued;
    }
    expect(sum).toBe(10_000_00);
  });

  it('прогноз на конец месяца не зависит от текущей даты', () => {
    const m = month({ openingBalanceMinor: 200_00 });
    const early = computeMonth(m, 700_00, '2026-09-03');
    const late = computeMonth(m, 700_00, '2026-09-28');
    expect(early.projectedEndMinor).toBe(late.projectedEndMinor);
    expect(early.projectedEndMinor).toBe(200_00 + 3_000_00 - 700_00);
  });

  it('безопасный дневной темп распределяет остаток по дням с сегодняшним включительно', () => {
    // 20 сентября, потрачено 0 → остаётся 3000 ₽ на 11 дней
    const result = computeMonth(month(), 0, '2026-09-20');
    expect(result.remainingDays).toBe(10);
    expect(result.safeDailyMinor).toBe(Math.floor(3_000_00 / 11));
  });

  it('месяц ещё не начался — начислений нет', () => {
    const result = computeMonth(month(), 0, '2026-08-20');
    expect(result.accruedDays).toBe(0);
    expect(result.balanceMinor).toBe(0);
  });
});

describe('closingBalanceOf и isMonthOver', () => {
  it('итог полного месяца считается по всему лимиту', () => {
    expect(closingBalanceOf(month({ openingBalanceMinor: 100_00 }), 2_500_00)).toBe(600_00);
    expect(closingBalanceOf(month(), 3_500_00)).toBe(-500_00);
  });

  it('итог неполного месяца — только за его дни', () => {
    const m = month({ accrualStartDay: 19, openingBalanceMinor: 300_00 });
    expect(closingBalanceOf(m, 0)).toBe(300_00 + 1_200_00);
    expect(closingBalanceOf(m, 2_000_00)).toBe(300_00 + 1_200_00 - 2_000_00);
  });

  it('месяц считается прошедшим только после последнего дня', () => {
    expect(isMonthOver('2026-09', '2026-09-30')).toBe(false);
    expect(isMonthOver('2026-09', '2026-10-01')).toBe(true);
    expect(isMonthOver('2026-02', '2026-02-28')).toBe(false);
  });
});

describe('копейки', () => {
  it('февраль 2028 (29 дней) с неделимым лимитом даёт ровный итог', () => {
    const m = month({ id: '2028-02', limitMinor: 5_555_55, accrualStartDay: 1, accrualDays: 29 });
    expect(computeMonth(m, 0, '2028-02-29').accruedMinor).toBe(5_555_55);
  });
});
