import {
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  db,
  type Category,
  type MonthRecord,
  type SavingsEntry,
  type Settings,
  type Tx,
} from './db';
import {
  currentMonthId,
  daysInMonth,
  dayOf,
  monthIdOf,
  todayIso,
  type IsoDate,
  type MonthId,
} from '@/lib/date';

export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(1);
}

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get(1);
  if (existing) return existing;

  const fresh: Settings = {
    ...DEFAULT_SETTINGS,
    startDate: todayIso(),
    createdAt: Date.now(),
  };
  await db.settings.put(fresh);
  return fresh;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.settings.update(1, patch);
}

/** Проверка и вставка идут одной транзакцией: иначе два параллельных вызова
 *  (например из StrictMode) заводят каждый свой набор категорий. */
export async function seedCategoriesIfEmpty(): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const count = await db.categories.count();
    if (count === 0) await db.categories.bulkAdd(DEFAULT_CATEGORIES as Category[]);
  });
}

export async function getMonth(monthId: MonthId): Promise<MonthRecord | undefined> {
  return db.months.get(monthId);
}

export async function listMonths(): Promise<MonthRecord[]> {
  const months = await db.months.toArray();
  return months.sort((a, b) => (a.id < b.id ? 1 : -1));
}

export async function createMonth(input: {
  id: MonthId;
  limitMinor: number;
  accrualStartDay?: number;
  openingBalanceMinor?: number;
}): Promise<MonthRecord> {
  const startDay = input.accrualStartDay ?? 1;
  const total = daysInMonth(input.id);
  const month: MonthRecord = {
    id: input.id,
    limitMinor: input.limitMinor,
    accrualStartDay: startDay,
    accrualDays: total - startDay + 1,
    openingBalanceMinor: input.openingBalanceMinor ?? 0,
    balanceAdjustmentsMinor: 0,
    externalTopUpsMinor: 0,
    status: 'open',
    createdAt: Date.now(),
  };
  await db.months.put(month);
  return month;
}

export async function updateMonth(
  monthId: MonthId,
  patch: Partial<Omit<MonthRecord, 'id'>>,
): Promise<void> {
  await db.months.update(monthId, patch);
}

/** Месяц может понадобиться до того, как он наступил — например при вводе траты вперёд. */
export async function ensureMonth(monthId: MonthId): Promise<MonthRecord> {
  const existing = await db.months.get(monthId);
  if (existing) return existing;

  const settings = await ensureSettings();
  const isFirstMonth = monthId === monthIdOf(settings.startDate);
  return createMonth({
    id: monthId,
    limitMinor: settings.monthlyLimitMinor,
    accrualStartDay: isFirstMonth ? dayOf(settings.startDate) : 1,
  });
}

export async function addTx(input: {
  date: IsoDate;
  amountMinor: number;
  categoryId?: number;
  note?: string;
}): Promise<void> {
  const monthId = monthIdOf(input.date);
  await ensureMonth(monthId);
  await db.tx.add({
    monthId,
    date: input.date,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    note: input.note?.trim() || undefined,
    createdAt: Date.now(),
  } as Tx);
}

export async function updateTx(
  id: number,
  patch: { date?: IsoDate; amountMinor?: number; categoryId?: number; note?: string },
): Promise<void> {
  const next: Partial<Tx> = { ...patch };
  if (patch.date) {
    next.monthId = monthIdOf(patch.date);
    await ensureMonth(next.monthId);
  }
  if ('note' in patch) next.note = patch.note?.trim() || undefined;
  await db.tx.update(id, next);
}

export async function deleteTx(id: number): Promise<void> {
  await db.tx.delete(id);
}

export async function listTxByMonth(monthId: MonthId): Promise<Tx[]> {
  const items = await db.tx.where('monthId').equals(monthId).toArray();
  return items.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

export async function listRecentTx(limit = 5): Promise<Tx[]> {
  return db.tx.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function spentInMonth(monthId: MonthId): Promise<number> {
  let total = 0;
  await db.tx
    .where('monthId')
    .equals(monthId)
    .each((item) => {
      total += item.amountMinor;
    });
  return total;
}

export async function spentOnDate(date: IsoDate): Promise<number> {
  let total = 0;
  await db.tx
    .where('date')
    .equals(date)
    .each((item) => {
      total += item.amountMinor;
    });
  return total;
}

export async function listCategories(): Promise<Category[]> {
  const items = await db.categories.toArray();
  return items.sort((a, b) => a.order - b.order);
}

export async function addCategory(input: Omit<Category, 'id' | 'order'>): Promise<void> {
  const count = await db.categories.count();
  await db.categories.add({ ...input, order: count } as Category);
}

export async function updateCategory(
  id: number,
  patch: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  await db.categories.update(id, patch);
}

/** Категория удаляется, но траты остаются — им просто снимается категория. */
export async function deleteCategory(id: number): Promise<void> {
  await db.transaction('rw', db.categories, db.tx, async () => {
    await db.tx.where('categoryId').equals(id).modify({ categoryId: undefined });
    await db.categories.delete(id);
  });
}

export async function addSavings(entry: Omit<SavingsEntry, 'id' | 'createdAt'>): Promise<void> {
  await db.savings.add({ ...entry, createdAt: Date.now() } as SavingsEntry);
}

export async function deleteSavings(id: number): Promise<void> {
  await db.savings.delete(id);
}

export async function savingsTotal(): Promise<number> {
  let total = 0;
  await db.savings.each((entry) => {
    total += entry.amountMinor;
  });
  return total;
}

export async function listSavings(): Promise<SavingsEntry[]> {
  const items = await db.savings.toArray();
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export type Snapshot = {
  app: 'dengi';
  version: 1;
  exportedAt: string;
  settings: Settings | undefined;
  months: MonthRecord[];
  tx: Tx[];
  categories: Category[];
  savings: SavingsEntry[];
};

export async function exportSnapshot(): Promise<Snapshot> {
  const [settings, months, tx, categories, savings] = await Promise.all([
    db.settings.get(1),
    db.months.toArray(),
    db.tx.toArray(),
    db.categories.toArray(),
    db.savings.toArray(),
  ]);
  return {
    app: 'dengi',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    months,
    tx,
    categories,
    savings,
  };
}

export async function importSnapshot(snapshot: Snapshot): Promise<void> {
  if (snapshot?.app !== 'dengi') throw new Error('Файл не похож на резервную копию «Деньги»');

  await db.transaction('rw', db.settings, db.months, db.tx, db.categories, db.savings, async () => {
    await Promise.all([
      db.settings.clear(),
      db.months.clear(),
      db.tx.clear(),
      db.categories.clear(),
      db.savings.clear(),
    ]);
    if (snapshot.settings) await db.settings.put(snapshot.settings);
    if (snapshot.months?.length) await db.months.bulkPut(snapshot.months);
    if (snapshot.tx?.length) await db.tx.bulkPut(snapshot.tx);
    if (snapshot.categories?.length) await db.categories.bulkPut(snapshot.categories);
    if (snapshot.savings?.length) await db.savings.bulkPut(snapshot.savings);
  });
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.settings, db.months, db.tx, db.categories, db.savings, async () => {
    await Promise.all([
      db.settings.clear(),
      db.months.clear(),
      db.tx.clear(),
      db.categories.clear(),
      db.savings.clear(),
    ]);
  });
}

/** Первый месяц создаётся вместе с настройками — дальше месяцы появляются по мере надобности. */
export async function completeOnboarding(input: {
  monthlyLimitMinor: number;
  savingsMinor: number;
  startDate: IsoDate;
  /** Остаток или долг, с которым пользователь входит в первый месяц */
  openingBalanceMinor?: number;
  currency?: string;
}): Promise<void> {
  const monthId = monthIdOf(input.startDate);

  await db.transaction('rw', db.settings, db.months, db.categories, db.savings, async () => {
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      currency: input.currency ?? 'RUB',
      monthlyLimitMinor: input.monthlyLimitMinor,
      startDate: input.startDate,
      onboarded: true,
      createdAt: Date.now(),
    });

    const total = daysInMonth(monthId);
    const startDay = dayOf(input.startDate);
    await db.months.put({
      id: monthId,
      limitMinor: input.monthlyLimitMinor,
      accrualStartDay: startDay,
      accrualDays: total - startDay + 1,
      openingBalanceMinor: input.openingBalanceMinor ?? 0,
      balanceAdjustmentsMinor: 0,
      externalTopUpsMinor: 0,
      status: 'open',
      createdAt: Date.now(),
    });

    if (input.savingsMinor !== 0) {
      await db.savings.add({
        date: input.startDate,
        amountMinor: input.savingsMinor,
        kind: 'initial',
        note: 'Начальная копилка',
        createdAt: Date.now(),
      } as SavingsEntry);
    }

    const categoriesCount = await db.categories.count();
    if (categoriesCount === 0) await db.categories.bulkAdd(DEFAULT_CATEGORIES as Category[]);
  });
}

/** Лимит меняется «с текущего месяца и дальше», прошлое не переписываем. */
export async function applyMonthlyLimit(limitMinor: number): Promise<void> {
  const nowId = currentMonthId();
  await db.transaction('rw', db.settings, db.months, async () => {
    await db.settings.update(1, { monthlyLimitMinor: limitMinor });
    const months = await db.months.toArray();
    for (const month of months) {
      if (month.id >= nowId && month.status === 'open') {
        await db.months.update(month.id, { limitMinor });
      }
    }
  });
}
