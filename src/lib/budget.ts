import type { MonthRecord, Settings } from '@/db/db';
import { dayOf, daysInMonth, monthEndIso, monthIdOf, type IsoDate } from './date';

export type BudgetOptions = {
  dailyAccrualMinor?: number | null;
};

export type MonthMath = {
  /** Базовая дневная норма из лимита: лимит / дней месяца */
  baseDailyMinor: number;
  /** Сколько прибавляется к «доступно» каждый день */
  dailyRateMinor: number;
  /** Сколько уходит в копилку каждый день (из лимита или по стратегии) */
  dailySavingsMinor: number;
  /** Сколько дней уже начислено, включая сегодняшний */
  accruedDays: number;
  /** Всего дней начисления в месяце (у первого месяца — от даты старта) */
  accrualDays: number;
  /** Дней осталось после сегодняшнего */
  remainingDays: number;
  accruedMinor: number;
  spentMinor: number;
  /** Главное число приложения: сколько можно потратить прямо сейчас */
  balanceMinor: number;
  openingBalanceMinor: number;
  balanceAdjustmentsMinor: number;
  limitMinor: number;
  /** Сколько всего начислится на «доступно» за этот месяц */
  monthAllowanceMinor: number;
  /** 0..1 — какая часть месяца прошла */
  monthProgress: number;
  /** Каким будет баланс в конце месяца, если больше ничего не тратить */
  projectedEndMinor: number;
  /** Сколько можно тратить в день до конца месяца, чтобы выйти в ноль */
  safeDailyMinor: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Сколько дней месяца уже начислено на дату `today`. */
export function accruedDaysFor(month: MonthRecord, today: IsoDate): number {
  const todayMonth = monthIdOf(today);
  if (todayMonth > month.id) return month.accrualDays;
  if (todayMonth < month.id) return 0;
  return clamp(dayOf(today) - month.accrualStartDay + 1, 0, month.accrualDays);
}

/** Базовая дневная норма из лимита. */
export function baseDailyFromLimit(month: MonthRecord): number {
  return Math.round(month.limitMinor / daysInMonth(month.id));
}

/** Эффективная дневная норма на «доступно». */
export function effectiveDailyAccrual(
  month: MonthRecord,
  settings?: Pick<Settings, 'dailyAccrualMinor'> | null,
): number {
  const override = month.dailyAccrualMinor ?? settings?.dailyAccrualMinor;
  if (override != null && override > 0) return override;
  return baseDailyFromLimit(month);
}

/** Сколько всего начислится на «доступно» за месяц по выбранной дневной норме. */
function spendableMonthTotal(month: MonthRecord, dailyMinor: number): number {
  if (dailyMinor === baseDailyFromLimit(month)) {
    return Math.round((month.limitMinor * month.accrualDays) / daysInMonth(month.id));
  }
  return Math.round(dailyMinor * month.accrualDays);
}

/** Начисление за N дней по дневной сумме с корректным итогом месяца. */
function accrualForDaily(month: MonthRecord, days: number, dailyMinor: number): number {
  if (days <= 0) return 0;
  const monthTotal = spendableMonthTotal(month, dailyMinor);
  if (days >= month.accrualDays) return monthTotal;
  return Math.round((monthTotal * days) / month.accrualDays);
}

export function computeMonth(
  month: MonthRecord,
  spentMinor: number,
  today: IsoDate,
  options: BudgetOptions = {},
): MonthMath {
  const accrualDays = Math.max(1, month.accrualDays);
  const accruedDays = accruedDaysFor(month, today);
  const adjustments = month.balanceAdjustmentsMinor ?? 0;

  const baseDailyMinor = baseDailyFromLimit(month);
  const dailyRateMinor = effectiveDailyAccrual(month, {
    dailyAccrualMinor: options.dailyAccrualMinor,
  });
  const dailySavingsMinor = Math.max(0, baseDailyMinor - dailyRateMinor);

  const accruedMinor = accrualForDaily(month, accruedDays, dailyRateMinor);
  const monthAllowanceMinor = accrualForDaily(month, accrualDays, dailyRateMinor);

  const balanceMinor = month.openingBalanceMinor + adjustments + accruedMinor - spentMinor;
  const remainingDays = accrualDays - accruedDays;
  const projectedEndMinor = month.openingBalanceMinor + adjustments + monthAllowanceMinor - spentMinor;

  const daysIncludingToday = Math.max(1, remainingDays + (accruedDays > 0 ? 1 : 0));
  const safeDailyMinor = Math.floor(projectedEndMinor / daysIncludingToday);

  return {
    baseDailyMinor,
    dailyRateMinor,
    dailySavingsMinor,
    accruedDays,
    accrualDays,
    remainingDays,
    accruedMinor,
    spentMinor,
    balanceMinor,
    openingBalanceMinor: month.openingBalanceMinor,
    balanceAdjustmentsMinor: adjustments,
    limitMinor: month.limitMinor,
    monthAllowanceMinor,
    monthProgress: accruedDays / accrualDays,
    projectedEndMinor,
    safeDailyMinor,
  };
}

/** Месяц закончился, если сегодня уже позже его последнего дня. */
export function isMonthOver(monthId: string, today: IsoDate): boolean {
  return monthEndIso(monthId) < today;
}

/** Баланс месяца на момент его окончания — с ним закрывается месяц. */
export function closingBalanceOf(
  month: MonthRecord,
  spentMinor: number,
  settings?: Pick<Settings, 'dailyAccrualMinor'> | null,
): number {
  const adjustments = month.balanceAdjustmentsMinor ?? 0;
  const allowance = accrualForDaily(
    month,
    month.accrualDays,
    effectiveDailyAccrual(month, settings),
  );
  return month.openingBalanceMinor + adjustments + allowance - spentMinor;
}

/** Дневная норма: лимит, разделённый на число дней в этом месяце. */
export function dailyRateFor(limitMinor: number, monthId: string): number {
  return Math.round(limitMinor / daysInMonth(monthId));
}

/** Сколько начислится до конца месяца, если начать учёт с `startDay`. */
export function allowanceFor(limitMinor: number, monthId: string, startDay = 1): number {
  const total = daysInMonth(monthId);
  const days = clamp(total - startDay + 1, 0, total);
  return Math.round((limitMinor * days) / total);
}
