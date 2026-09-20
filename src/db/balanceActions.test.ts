import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  syncAutoSavings,
  topUpAvailable,
  transferFromSavings,
  transferToSavings,
} from './balanceActions';
import { completeOnboarding, savingsTotal, spentInMonth } from './repo';
import { computeMonth } from '@/lib/budget';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function setup() {
  await completeOnboarding({
    monthlyLimitMinor: 84_000_00,
    savingsMinor: 10_000_00,
    startDate: '2026-09-01',
    openingBalanceMinor: 0,
  });
  await db.settings.update(1, { savingsStrategy: 'remainder', dailyAccrualMinor: 2_700_00 });
  await db.months.update('2026-09', { dailyAccrualMinor: 2_700_00 });
}

describe('переводы и пополнения', () => {
  it('переводит из доступных в копилку', async () => {
    await setup();
    await transferToSavings(5_000_00, undefined, '2026-09-05');

    const month = await db.months.get('2026-09');
    const math = computeMonth(month!, await spentInMonth('2026-09'), '2026-09-05');
    expect(math.balanceAdjustmentsMinor).toBe(-5_000_00);
    expect(await savingsTotal()).toBe(15_000_00);
  });

  it('переводит из копилки в доступные', async () => {
    await setup();
    await transferFromSavings(3_000_00, undefined, '2026-09-05');

    const month = await db.months.get('2026-09');
    const math = computeMonth(month!, await spentInMonth('2026-09'), '2026-09-05');
    expect(math.balanceAdjustmentsMinor).toBe(3_000_00);
    expect(await savingsTotal()).toBe(7_000_00);
  });

  it('пополняет доступные и учитывает зачисления извне', async () => {
    await setup();
    await topUpAvailable(2_000_00, undefined, '2026-09-05');
    await topUpAvailable(1_500_00, undefined, '2026-09-10');

    const month = await db.months.get('2026-09');
    expect(month?.balanceAdjustmentsMinor).toBe(3_500_00);
    expect(month?.externalTopUpsMinor).toBe(3_500_00);
    expect(await savingsTotal()).toBe(10_000_00);

    const math = computeMonth(month!, 0, '2026-09-10');
    expect(math.externalTopUpsMinor).toBe(3_500_00);
  });

  it('не даёт перевести больше доступного', async () => {
    await setup();
    await expect(transferToSavings(100_000_00, undefined, '2026-09-02')).rejects.toThrow();
  });
});

describe('syncAutoSavings', () => {
  it('начисляет автоотложение за прошедшие дни', async () => {
    await setup();
    await syncAutoSavings('2026-09-03');

    const entries = await db.savings.where('kind').equals('auto_daily').toArray();
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.amountMinor === 100_00)).toBe(true);
    expect(await savingsTotal()).toBe(10_000_00 + 300_00);
  });

  it('не дублирует начисления при повторном вызове', async () => {
    await setup();
    await syncAutoSavings('2026-09-03');
    await syncAutoSavings('2026-09-03');
    const entries = await db.savings.where('kind').equals('auto_daily').toArray();
    expect(entries).toHaveLength(3);
  });
});
