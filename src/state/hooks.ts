import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Settings, type Theme } from '@/db/db';
import { findPendingClose } from '@/db/monthActions';
import { listCategories, savingsTotal, spentInMonth, spentOnDate } from '@/db/repo';
import { computeMonth, type MonthMath } from '@/lib/budget';
import { currentMonthId, todayIso, type MonthId } from '@/lib/date';

/** undefined — ещё грузим; { value: undefined } — записи нет */
export function useSettings(): { value: Settings | undefined } | undefined {
  return useLiveQuery(async () => ({ value: await db.settings.get(1) }), []);
}

export function useCategories() {
  return useLiveQuery(() => listCategories(), [], []);
}

export function useSavingsTotal() {
  return useLiveQuery(() => savingsTotal(), [], 0);
}

/** Дата обновляется при возврате в приложение — PWA часто висит открытой сутками. */
export function useToday(): string {
  const [today, setToday] = useState(todayIso);

  useEffect(() => {
    const sync = () => setToday(todayIso());
    const interval = window.setInterval(sync, 60_000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return today;
}

export type MonthView = {
  monthId: MonthId;
  math: MonthMath | null;
  spentTodayMinor: number;
};

export function useMonthView(monthId: MonthId, today: string): MonthView | undefined {
  return useLiveQuery(async () => {
    const [month, settings] = await Promise.all([db.months.get(monthId), db.settings.get(1)]);
    if (!month) return { monthId, math: null, spentTodayMinor: 0 };

    const [spent, spentToday] = await Promise.all([spentInMonth(monthId), spentOnDate(today)]);
    return {
      monthId,
      math: computeMonth(month, spent, today, {
        dailyAccrualMinor: settings?.dailyAccrualMinor,
      }),
      spentTodayMinor: spentToday,
    };
  }, [monthId, today]);
}

export function useCurrentMonthView() {
  const today = useToday();
  return useMonthView(currentMonthId(), today);
}

/** Месяц, который пора закрыть: пока он есть, приложение показывает обязательный диалог. */
export function usePendingClose(today: string) {
  return useLiveQuery(() => findPendingClose(today), [today]);
}

export function useMonthRecord(monthId: MonthId) {
  return useLiveQuery(() => db.months.get(monthId), [monthId]);
}

export function useMonthIds() {
  return useLiveQuery(async () => {
    const months = await db.months.toArray();
    return months.map((month) => month.id).sort((a, b) => (a < b ? 1 : -1));
  }, [], []);
}

/** Тема пишется в localStorage, чтобы index.html мог применить её до первой краски. */
export function useApplyTheme(theme: Theme | undefined) {
  useEffect(() => {
    if (!theme) return;
    localStorage.setItem('dengi:theme', theme);

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && !media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#08080c' : '#e7e9f1');
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
