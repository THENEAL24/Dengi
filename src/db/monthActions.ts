import { db, type CarryDecision, type MonthRecord, type SavingsEntry } from './db';
import { ensureMonth, getSettings, spentInMonth } from './repo';
import { closingBalanceOf, isMonthOver } from '@/lib/budget';
import { monthEndIso, shiftMonth, todayIso, type MonthId } from '@/lib/date';

export type PendingClose = {
  month: MonthRecord;
  spentMinor: number;
  closingBalanceMinor: number;
};

/** Незакрытые месяцы, которые уже закончились — по одному, от самого старого. */
export async function findPendingClose(today = todayIso()): Promise<PendingClose | null> {
  const months = await db.months.where('status').equals('open').toArray();
  const over = months
    .filter((month) => isMonthOver(month.id, today))
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const month = over[0];
  if (!month) return null;

  const spentMinor = await spentInMonth(month.id);
  const settings = await getSettings();
  return {
    month,
    spentMinor,
    closingBalanceMinor: closingBalanceOf(month, spentMinor, settings),
  };
}

/**
 * Закрывает месяц и раскладывает остаток:
 * 'carry'   — остаток (или долг) становится стартовым балансом следующего месяца;
 * 'savings' — плюс уходит в копилку, минус из неё же покрывается, новый месяц с нуля.
 */
export async function closeMonth(monthId: MonthId, decision: CarryDecision): Promise<void> {
  const month = await db.months.get(monthId);
  if (!month || month.status === 'closed') return;

  const spentMinor = await spentInMonth(monthId);
  const settings = await getSettings();
  const closing = closingBalanceOf(month, spentMinor, settings);
  const nextMonthId = shiftMonth(monthId, 1);

  // ensureMonth вне транзакции: он сам читает настройки и может создать запись
  await ensureMonth(nextMonthId);

  await db.transaction('rw', db.months, db.savings, async () => {
    if (decision === 'carry') {
      await db.months.update(nextMonthId, { openingBalanceMinor: closing });
    } else {
      await db.months.update(nextMonthId, { openingBalanceMinor: 0 });
      if (closing !== 0) {
        await db.savings.add({
          date: monthEndIso(monthId),
          amountMinor: closing,
          kind: closing > 0 ? 'rollover' : 'cover',
          note: closing > 0 ? 'Остаток месяца' : 'Покрытие перерасхода',
          monthId,
          createdAt: Date.now(),
        } as SavingsEntry);
      }
    }

    await db.months.update(monthId, {
      status: 'closed',
      closedAt: Date.now(),
      carryDecision: decision,
      closingBalanceMinor: closing,
    });
  });
}
