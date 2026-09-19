import type { MonthRecord } from '@/db/db';
import { dayOf, daysInMonth, monthEndIso, monthIdOf, type IsoDate } from './date';

export type MonthMath = {
  /** Сколько прибавляется к балансу каждый день: лимит / число дней в месяце */
  dailyRateMinor: number;
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
  limitMinor: number;
  /** Сколько всего начислится за этот месяц: у неполного месяца меньше лимита */
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

/** Начисление за N дней. Считаем от лимита, а не умножением дневной нормы:
 *  иначе за месяц набегает ошибка округления в несколько копеек. */
function accrualFor(month: MonthRecord, days: number): number {
  return Math.round((month.limitMinor * days) / daysInMonth(month.id));
}

export function computeMonth(month: MonthRecord, spentMinor: number, today: IsoDate): MonthMath {
  const accrualDays = Math.max(1, month.accrualDays);
  const accruedDays = accruedDaysFor(month, today);

  // Дневная норма всегда делит лимит на полный месяц. Старт посреди месяца
  // не увеличивает норму — он просто уменьшает число дней начисления.
  const dailyRateMinor = Math.round(month.limitMinor / daysInMonth(month.id));
  const accruedMinor = accrualFor(month, accruedDays);
  const monthAllowanceMinor = accrualFor(month, accrualDays);

  // Баланс растёт от перенесённого остатка: за дни до старта ничего не начисляется.
  const balanceMinor = month.openingBalanceMinor + accruedMinor - spentMinor;
  const remainingDays = accrualDays - accruedDays;
  const projectedEndMinor = month.openingBalanceMinor + monthAllowanceMinor - spentMinor;

  // Сегодняшний день ещё можно «перетратить», поэтому он входит в делитель
  const daysIncludingToday = Math.max(1, remainingDays + (accruedDays > 0 ? 1 : 0));
  const safeDailyMinor = Math.floor(projectedEndMinor / daysIncludingToday);

  return {
    dailyRateMinor,
    accruedDays,
    accrualDays,
    remainingDays,
    accruedMinor,
    spentMinor,
    balanceMinor,
    openingBalanceMinor: month.openingBalanceMinor,
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

/** Баланс месяца на момент его окончания — с ним закрывается месяц.
 *  У неполного месяца начисляется не весь лимит, а только дни от старта. */
export function closingBalanceOf(month: MonthRecord, spentMinor: number): number {
  return month.openingBalanceMinor + accrualFor(month, month.accrualDays) - spentMinor;
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
