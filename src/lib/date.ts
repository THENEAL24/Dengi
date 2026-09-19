/** Даты живут как локальные строки 'YYYY-MM-DD', месяцы — как 'YYYY-MM'.
 *  Никаких UTC-конверсий: с ними «сегодня» уезжает на день назад. */

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

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const monthNamesGenitive = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const weekdays = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];

const weekdaysShort = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function monthTitle(monthId: MonthId, withYear = true): string {
  const [year, month] = monthId.split('-').map(Number);
  const name = monthNames[month - 1];
  return withYear ? `${name} ${year}` : name;
}

export function monthTitleShort(monthId: MonthId): string {
  const [year, month] = monthId.split('-').map(Number);
  const nowYear = new Date().getFullYear();
  const name = monthNames[month - 1];
  return year === nowYear ? name : `${name} ${year}`;
}

/** «Сегодня», «Вчера» или «19 сентября» */
export function dayTitle(iso: IsoDate): string {
  const today = todayIso();
  if (iso === today) return 'Сегодня';
  if (iso === addDays(today, -1)) return 'Вчера';
  if (iso === addDays(today, 1)) return 'Завтра';

  const date = fromIso(iso);
  const base = `${date.getDate()} ${monthNamesGenitive[date.getMonth()]}`;
  return date.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} ${date.getFullYear()}`;
}

export function dayWithWeekday(iso: IsoDate): string {
  const date = fromIso(iso);
  return `${dayTitle(iso)}, ${weekdays[date.getDay()]}`;
}

/** «19 сентября, суббота» — без «Сегодня», чтобы не дублировать заголовок экрана */
export function dateWithWeekday(iso: IsoDate): string {
  const date = fromIso(iso);
  return `${date.getDate()} ${monthNamesGenitive[date.getMonth()]}, ${weekdays[date.getDay()]}`;
}

export function weekdayShort(iso: IsoDate): string {
  return weekdaysShort[fromIso(iso).getDay()];
}

export function fullDate(iso: IsoDate): string {
  const date = fromIso(iso);
  return `${date.getDate()} ${monthNamesGenitive[date.getMonth()]} ${date.getFullYear()}`;
}

