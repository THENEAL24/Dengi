import type { MonthRecord, SavingsStrategy, Settings } from '@/db/db';
import { db } from '@/db/db';
import { baseDailyFromLimit, effectiveDailyAccrual } from '@/lib/budget';
import { daysInMonth, type IsoDate, monthIdOf } from '@/lib/date';
import { spentInMonth } from '@/db/repo';

export type StrategyPreview = {
  dailyMinor: number;
  monthlyMinor: number;
  description: string;
};

const strategyLabels: Record<SavingsStrategy, string> = {
  manual: 'Только вручную',
  remainder: 'Остаток от лимита',
  fixed: 'Фиксированная сумма',
  smart: 'По истории трат',
  goal: 'К цели',
};

export function strategyLabel(strategy: SavingsStrategy): string {
  return strategyLabels[strategy];
}

/** Средний «недотрат» в день по закрытым месяцам с положительным остатком. */
export async function smartDailySavingsRate(): Promise<number> {
  const closed = await db.months.where('status').equals('closed').toArray();
  if (closed.length === 0) return 0;

  let totalLeftover = 0;
  let totalDays = 0;

  for (const month of closed) {
    const closing =
      month.closingBalanceMinor ??
      month.openingBalanceMinor + month.limitMinor - (await spentInMonth(month.id));
    if (closing <= 0) continue;
    totalLeftover += closing;
    totalDays += month.accrualDays;
  }

  if (totalDays === 0) return 0;
  return Math.round(totalLeftover / totalDays);
}

/** Сколько откладывать в день, чтобы достичь цели за заданный срок. */
export function goalDailySavingsRate(
  settings: Pick<Settings, 'savingsGoalMinor' | 'savingsGoalMonths'>,
  currentSavingsMinor: number,
): number {
  const goal = settings.savingsGoalMinor ?? 0;
  if (goal <= 0) return 0;

  const remaining = Math.max(0, goal - currentSavingsMinor);
  if (remaining === 0) return 0;

  const months = Math.max(1, settings.savingsGoalMonths ?? 12);
  const days = months * 30;
  return Math.round(remaining / days);
}

/** Дневная сумма автоотложения для текущей стратегии. */
export async function dailyAutoSavingsRate(
  month: MonthRecord,
  settings: Settings,
  currentSavingsMinor: number,
): Promise<number> {
  switch (settings.savingsStrategy) {
    case 'manual':
      return 0;
    case 'remainder':
      return Math.max(
        0,
        baseDailyFromLimit(month) - effectiveDailyAccrual(month, settings),
      );
    case 'fixed':
      return Math.max(0, settings.fixedDailySavingsMinor ?? 0);
    case 'smart':
      return await smartDailySavingsRate();
    case 'goal':
      return goalDailySavingsRate(settings, currentSavingsMinor);
    default:
      return 0;
  }
}

export async function previewStrategy(
  strategy: SavingsStrategy,
  month: MonthRecord,
  settings: Settings,
  currentSavingsMinor: number,
): Promise<StrategyPreview> {
  const tempSettings = { ...settings, savingsStrategy: strategy };
  const dailyMinor = await dailyAutoSavingsRate(month, tempSettings, currentSavingsMinor);
  const monthlyMinor = Math.round(dailyMinor * month.accrualDays);

  const descriptions: Record<SavingsStrategy, string> = {
    manual: 'Автоотложение выключено. Переводы — только вручную.',
    remainder: `Разница между лимитом (${formatShort(baseDailyFromLimit(month))}/день) и вашей нормой на «доступно».`,
    fixed: 'Каждый день в копилку уходит фиксированная сумма.',
    smart: 'Средний положительный остаток по закрытым месяцам, поделённый на дни.',
    goal: 'Сколько нужно откладывать в день, чтобы достичь цели к сроку.',
  };

  return {
    dailyMinor,
    monthlyMinor,
    description: descriptions[strategy],
  };
}

function formatShort(minor: number): string {
  return `${Math.round(minor / 100).toLocaleString('ru-RU')} ₽`;
}

/** ISO-дата по номеру дня в месяце. */
export function dateInMonth(monthId: string, day: number): IsoDate {
  return `${monthId}-${String(day).padStart(2, '0')}` as IsoDate;
}

/** Сколько дней месяца уже прошло на дату (в пределах начисления). */
export function savingsDaysThrough(month: MonthRecord, today: IsoDate): number {
  if (monthIdOf(today) !== month.id) return 0;
  const day = Math.min(
    Math.max(1, new Date(`${today}T12:00:00`).getDate()),
    month.accrualStartDay + month.accrualDays - 1,
  );
  return Math.max(0, day - month.accrualStartDay + 1);
}

/** Прогноз накоплений к концу месяца по текущей стратегии. */
export async function projectedMonthlySavings(
  month: MonthRecord,
  settings: Settings,
  currentSavingsMinor: number,
  today: IsoDate,
): Promise<number> {
  const daily = await dailyAutoSavingsRate(month, settings, currentSavingsMinor);
  const days = savingsDaysThrough(month, today);
  return daily * days;
}

export { daysInMonth };
