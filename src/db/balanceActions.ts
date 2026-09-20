import { db, type SavingsEntry } from './db';
import { computeMonth } from '@/lib/budget';
import {
  dailyAutoSavingsRate,
  dateInMonth,
} from '@/lib/savings-strategy';
import { currentMonthId, dayOf, monthIdOf, todayIso } from '@/lib/date';
import { getSettings, getMonth, spentInMonth, savingsTotal } from './repo';

async function currentMonthMath(today = todayIso()) {
  const monthId = monthIdOf(today);
  const month = await getMonth(monthId);
  const settings = await getSettings();
  if (!month || !settings) return null;

  const spent = await spentInMonth(monthId);
  const math = computeMonth(month, spent, today, {
    dailyAccrualMinor: settings.dailyAccrualMinor,
  });
  return { month, settings, math };
}

/** Перевести из «доступно» в копилку. */
export async function transferToSavings(
  amountMinor: number,
  note?: string,
  today = todayIso(),
): Promise<void> {
  if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля');

  const ctx = await currentMonthMath(today);
  if (!ctx) throw new Error('Месяц не найден');
  if (ctx.math.balanceMinor < amountMinor) throw new Error('Недостаточно доступных средств');

  await db.transaction('rw', db.months, db.savings, async () => {
    await db.months.update(ctx.month.id, {
      balanceAdjustmentsMinor: (ctx.month.balanceAdjustmentsMinor ?? 0) - amountMinor,
    });
    await db.savings.add({
      date: today,
      amountMinor,
      kind: 'from_budget',
      note: note?.trim() || 'Из доступных',
      monthId: ctx.month.id,
      createdAt: Date.now(),
    } as SavingsEntry);
  });
}

/** Перевести из копилки в «доступно». */
export async function transferFromSavings(
  amountMinor: number,
  note?: string,
  today = todayIso(),
): Promise<void> {
  if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля');

  const total = await savingsTotal();
  if (total < amountMinor) throw new Error('В копилке недостаточно средств');

  const monthId = monthIdOf(today);
  const month = await getMonth(monthId);
  if (!month) throw new Error('Месяц не найден');

  await db.transaction('rw', db.months, db.savings, async () => {
    await db.months.update(monthId, {
      balanceAdjustmentsMinor: (month.balanceAdjustmentsMinor ?? 0) + amountMinor,
    });
    await db.savings.add({
      date: today,
      amountMinor: -amountMinor,
      kind: 'to_budget',
      note: note?.trim() || 'В доступные',
      monthId,
      createdAt: Date.now(),
    } as SavingsEntry);
  });
}

/** Пополнить «доступно» без затрагивания копилки. */
export async function topUpAvailable(amountMinor: number, _note?: string, today = todayIso()): Promise<void> {
  if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля');

  const monthId = monthIdOf(today);
  const month = await getMonth(monthId);
  if (!month) throw new Error('Месяц не найден');

  await db.months.update(monthId, {
    balanceAdjustmentsMinor: (month.balanceAdjustmentsMinor ?? 0) + amountMinor,
    externalTopUpsMinor: (month.externalTopUpsMinor ?? 0) + amountMinor,
  });
}

/** Применить дневную норму на «доступно» с текущего месяца. */
export async function applyDailyAccrual(
  dailyMinor: number,
  applyToFuture = true,
): Promise<void> {
  const nowId = currentMonthId();
  await db.transaction('rw', db.settings, db.months, async () => {
    await db.settings.update(1, { dailyAccrualMinor: dailyMinor });
    const months = await db.months.toArray();
    for (const month of months) {
      if (month.status === 'open' && (month.id >= nowId || applyToFuture)) {
        if (month.id >= nowId) {
          await db.months.update(month.id, { dailyAccrualMinor: dailyMinor });
        }
      }
    }
  });
}

/** Сбросить дневную норму к лимиту / дням месяца. */
export async function resetDailyAccrual(): Promise<void> {
  const nowId = currentMonthId();
  await db.transaction('rw', db.settings, db.months, async () => {
    await db.settings.update(1, { dailyAccrualMinor: null });
    const months = await db.months.toArray();
    for (const month of months) {
      if (month.id >= nowId && month.status === 'open') {
        await db.months.update(month.id, { dailyAccrualMinor: null });
      }
    }
  });
}

/** Начислить автоотложение за пропущенные дни текущего месяца. */
export async function syncAutoSavings(today = todayIso()): Promise<void> {
  const settings = await getSettings();
  if (!settings?.onboarded || settings.savingsStrategy === 'manual') return;

  const monthId = monthIdOf(today);
  let month = await getMonth(monthId);
  if (!month || month.status !== 'open') return;

  const savingsNow = await savingsTotal();
  const dailyAmount = await dailyAutoSavingsRate(month, settings, savingsNow);
  if (dailyAmount <= 0) return;

  const todayDay = dayOf(today);
  const firstDay = month.accrualStartDay;
  const lastAccrualDay = firstDay + month.accrualDays - 1;
  if (todayDay < firstDay) return;

  const fromDay = month.lastAutoSavingsDay
    ? dayOf(month.lastAutoSavingsDay) + 1
    : firstDay;

  const toDay = Math.min(todayDay, lastAccrualDay);
  if (fromDay > toDay) return;

  await db.transaction('rw', db.months, db.savings, async () => {
    for (let day = fromDay; day <= toDay; day += 1) {
      const date = dateInMonth(month.id, day);
      await db.savings.add({
        date,
        amountMinor: dailyAmount,
        kind: 'auto_daily',
        note: 'Автоотложение',
        monthId: month!.id,
        createdAt: Date.now(),
      } as SavingsEntry);
    }
    await db.months.update(month!.id, { lastAutoSavingsDay: dateInMonth(month!.id, toDay) });
  });
}
