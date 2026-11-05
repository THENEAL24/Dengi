/** Даты живут как локальные строки 'YYYY-MM-DD', месяцы — как 'YYYY-MM'.
 *  Никаких UTC-конверсий: с ними «сегодня» уезжает на день назад. */

import { getActiveLocale, translate, type Locale } from '@/lib/i18n';

export type IsoDate = string;
export type MonthId = string;

const pad = (value: number) => String(value).padStart(2, '0');

export function toIso(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIso(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayIso(): IsoDate {
  return toIso(new Date());
}

/** Время создания записи — «14:05» */
export function timeOf(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function monthIdOf(iso: IsoDate): MonthId {
  return iso.slice(0, 7);
}

export function currentMonthId(): MonthId {
  return monthIdOf(todayIso());
}

export function dayOf(iso: IsoDate): number {
  return Number(iso.slice(8, 10));
}

export function daysInMonth(monthId: MonthId): number {
  const [year, month] = monthId.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function shiftMonth(monthId: MonthId, delta: number): MonthId {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function monthStartIso(monthId: MonthId): IsoDate {
  return `${monthId}-01`;
}

export function monthEndIso(monthId: MonthId): IsoDate {
  return `${monthId}-${pad(daysInMonth(monthId))}`;
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

function monthName(monthIndex: number, locale: Locale): string {
  return translate(locale, `date.month.${monthIndex + 1}`);
}

function monthNameGenitive(monthIndex: number, locale: Locale): string {
  return translate(locale, `date.monthGenitive.${monthIndex + 1}`);
}

function weekdayName(dayIndex: number, locale: Locale): string {
  return translate(locale, `date.weekday.${dayIndex}`);
}

function weekdayShortName(dayIndex: number, locale: Locale): string {
  return translate(locale, `date.weekdayShort.${dayIndex}`);
}

export function monthTitle(monthId: MonthId, withYear = true, locale = getActiveLocale()): string {
  const [year, month] = monthId.split('-').map(Number);
  const name = monthName(month - 1, locale);
  return withYear ? `${name} ${year}` : name;
}

export function monthTitleShort(monthId: MonthId, locale = getActiveLocale()): string {
  const [year, month] = monthId.split('-').map(Number);
  const nowYear = new Date().getFullYear();
  const name = monthName(month - 1, locale);
  return year === nowYear ? name : `${name} ${year}`;
}

/** «Сегодня», «Вчера» или «19 сентября» */
export function dayTitle(iso: IsoDate, locale = getActiveLocale()): string {
  const today = todayIso();
  if (iso === today) return translate(locale, 'date.today');
  if (iso === addDays(today, -1)) return translate(locale, 'date.yesterday');
  if (iso === addDays(today, 1)) return translate(locale, 'date.tomorrow');

  const date = fromIso(iso);
  const base = `${date.getDate()} ${monthNameGenitive(date.getMonth(), locale)}`;
  return date.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} ${date.getFullYear()}`;
}

export function dayWithWeekday(iso: IsoDate, locale = getActiveLocale()): string {
  const date = fromIso(iso);
  return `${dayTitle(iso, locale)}, ${weekdayName(date.getDay(), locale)}`;
}

/** «19 сентября, суббота» — без «Сегодня», чтобы не дублировать заголовок экрана */
export function dateWithWeekday(iso: IsoDate, locale = getActiveLocale()): string {
  const date = fromIso(iso);
  return `${date.getDate()} ${monthNameGenitive(date.getMonth(), locale)}, ${weekdayName(date.getDay(), locale)}`;
}

export function weekdayShort(iso: IsoDate, locale = getActiveLocale()): string {
  return weekdayShortName(fromIso(iso).getDay(), locale);
}

export function fullDate(iso: IsoDate, locale = getActiveLocale()): string {
  const date = fromIso(iso);
  return `${date.getDate()} ${monthNameGenitive(date.getMonth(), locale)} ${date.getFullYear()}`;
}

export function monthTitleLower(monthId: MonthId, locale = getActiveLocale()): string {
  return monthTitleShort(monthId, locale).toLocaleLowerCase(locale === 'en' ? 'en-US' : 'ru-RU');
}
