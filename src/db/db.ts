import Dexie, { type EntityTable } from 'dexie';
import type { IsoDate, MonthId } from '@/lib/date';

export type Theme = 'auto' | 'dark' | 'light';

/** Как считается ежедневное автоотложение в копилку */
export type SavingsStrategy = 'manual' | 'remainder' | 'fixed' | 'smart' | 'goal';

export interface Settings {
  id: 1;
  currency: string;
  theme: Theme;
  onboarded: boolean;
  /** Базовый месячный лимит: применяется ко всем новым месяцам */
  monthlyLimitMinor: number;
  /** День, с которого начался учёт — нужен только первому, неполному месяцу */
  startDate: IsoDate;
  /** Своя дневная норма на «доступно». null — лимит / дней месяца */
  dailyAccrualMinor?: number | null;
  savingsStrategy: SavingsStrategy;
  /** Фиксированная сумма в день для стратегии fixed */
  fixedDailySavingsMinor?: number;
  /** Цель накопления для стратегии goal */
  savingsGoalMinor?: number;
  /** За сколько месяцев достичь цели (goal) */
  savingsGoalMonths?: number;
  createdAt: number;
}

export type MonthStatus = 'open' | 'closed';
export type CarryDecision = 'carry' | 'savings';

export interface MonthRecord {
  id: MonthId;
  /** Сколько можно потратить за месяц */
  limitMinor: number;
  /** С какого числа начисляется дневная норма (для первого, неполного месяца) */
  accrualStartDay: number;
  /** На сколько дней делится лимит */
  accrualDays: number;
  /** Перенесённый остаток предыдущего месяца, может быть отрицательным */
  openingBalanceMinor: number;
  /** Пополнения и переводы в/из копилки за текущий месяц */
  balanceAdjustmentsMinor?: number;
  /** Своя дневная норма для этого месяца. null — из настроек */
  dailyAccrualMinor?: number | null;
  /** До какого дня начислено автоотложение (включительно) */
  lastAutoSavingsDay?: IsoDate;
  status: MonthStatus;
  closedAt?: number;
  carryDecision?: CarryDecision;
  /** Итоговый баланс на момент закрытия — чтобы история не пересчитывалась */
  closingBalanceMinor?: number;
  createdAt: number;
}

export interface Tx {
  id?: number;
  monthId: MonthId;
  date: IsoDate;
  /** Всегда положительное: это расход */
  amountMinor: number;
  categoryId?: number;
  note?: string;
  createdAt: number;
}

export interface Category {
  id?: number;
  name: string;
  emoji: string;
  color: string;
  order: number;
}

export type SavingsKind =
  | 'initial'
  | 'rollover'
  | 'cover'
  | 'manual'
  | 'from_budget'
  | 'to_budget'
  | 'auto_daily';

export interface SavingsEntry {
  id?: number;
  date: IsoDate;
  /** Положительное — пополнение копилки, отрицательное — трата из неё */
  amountMinor: number;
  kind: SavingsKind;
  note?: string;
  monthId?: MonthId;
  createdAt: number;
}

export class DengiDb extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  months!: EntityTable<MonthRecord, 'id'>;
  tx!: EntityTable<Tx, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  savings!: EntityTable<SavingsEntry, 'id'>;

  constructor() {
    super('dengi');
    this.version(1).stores({
      settings: 'id',
      months: 'id, status',
      tx: '++id, monthId, date, categoryId, createdAt',
      categories: '++id, order',
      savings: '++id, date, kind, monthId',
    });

    this.version(2)
      .stores({
        settings: 'id',
        months: 'id, status',
        tx: '++id, monthId, date, categoryId, createdAt',
        categories: '++id, order',
        savings: '++id, date, kind, monthId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('months')
          .toCollection()
          .modify((month: MonthRecord) => {
            month.balanceAdjustmentsMinor ??= 0;
          });
        await tx
          .table('settings')
          .toCollection()
          .modify((settings: Settings) => {
            settings.savingsStrategy ??= 'remainder';
            settings.savingsGoalMonths ??= 12;
          });
      });
  }
}

export const db = new DengiDb();

export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id'>> = [
  { name: 'Продукты', emoji: '🛒', color: 'var(--ios-green)', order: 0 },
  { name: 'Кафе', emoji: '☕️', color: 'var(--ios-orange)', order: 1 },
  { name: 'Транспорт', emoji: '🚕', color: 'var(--ios-blue)', order: 2 },
  { name: 'Дом', emoji: '🏠', color: 'var(--ios-teal)', order: 3 },
  { name: 'Здоровье', emoji: '💊', color: 'var(--ios-red)', order: 4 },
  { name: 'Развлечения', emoji: '🎬', color: 'var(--ios-purple)', order: 5 },
  { name: 'Одежда', emoji: '👕', color: 'var(--ios-pink)', order: 6 },
  { name: 'Подарки', emoji: '🎁', color: 'var(--ios-yellow)', order: 7 },
  { name: 'Связь', emoji: '📱', color: 'var(--ios-indigo)', order: 8 },
  { name: 'Прочее', emoji: '✨', color: 'var(--ios-gray)', order: 9 },
];

export const DEFAULT_SETTINGS: Omit<Settings, 'createdAt' | 'startDate'> = {
  id: 1,
  currency: 'RUB',
  theme: 'auto',
  onboarded: false,
  monthlyLimitMinor: 0,
  dailyAccrualMinor: null,
  savingsStrategy: 'remainder',
  savingsGoalMonths: 12,
};
