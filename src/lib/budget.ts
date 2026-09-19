import type { MonthRecord } from '@/db/db';
import { dayOf, daysInMonth, monthEndIso, monthIdOf, type IsoDate } from './date';

export type MonthMath = {
  /** Сколько прибавляется к балансу каждый день */
  dailyRateMinor: number;
  /** Сколько дней уже начислено, включая сегодняшний */
  accruedDays: number;
  /** Всего дней начисления в месяце */
  accrualDays: number;
  /** Дней осталось после сегодняшнего */
  remainingDays: number;
  accruedMinor: number;
  spentMinor: number;
  /** Главное число приложения: сколько можно потратить прямо сейчас */
  balanceMinor: number;
  openingBalanceMinor: number;
  limitMinor: number;
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

export function computeMonth(month: MonthRecord, spentMinor: number, today: IsoDate): MonthMath {
  const accrualDays = Math.max(1, month.accrualDays);
  const accruedDays = accruedDaysFor(month, today);

  // Начисленное считаем от лимита, а не умножением дневной нормы:
  // иначе за месяц набегает ошибка округления в несколько копеек.
  const accruedMinor = Math.round((month.limitMinor * accruedDays) / accrualDays);
  const dailyRateMinor = Math.round(month.limitMinor / accrualDays);

  const balanceMinor = month.openingBalanceMinor + accruedMinor - spentMinor;
  const remainingDays = accrualDays - accruedDays;
  const projectedEndMinor = month.openingBalanceMinor + month.limitMinor - spentMinor;

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
export function closingBalanceOf(month: MonthRecord, spentMinor: number): number {
  return month.openingBalanceMinor + month.limitMinor - spentMinor;
}

/** Дневная норма для месяца, начатого посреди месяца. */
export function dailyRateFor(limitMinor: number, monthId: string, startDay = 1): number {
  const days = daysInMonth(monthId) - startDay + 1;
  return Math.round(limitMinor / Math.max(1, days));
}
