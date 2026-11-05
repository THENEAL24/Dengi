import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SwipeRow } from '@/components/SwipeRow';
import { TopUpRow } from '@/components/TopUpRow';
import { TxRow } from '@/components/TxRow';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import type { Settings, Tx } from '@/db/db';
import { db } from '@/db/db';
import { deleteTopUp, deleteTx, listTopUpsByMonth, listTxByMonth } from '@/db/repo';
import { useCategories, useMonthIds, useToday } from '@/state/hooks';
import { computeMonth } from '@/lib/budget';
import { cn } from '@/lib/cn';
import { currentMonthId, dayTitle, type IsoDate } from '@/lib/date';
import { pluralTopUp, pluralTx } from '@/lib/plural';
import { formatMoney } from '@/lib/money';
import { useTranslation } from '@/state/I18nContext';

type Props = {
  settings: Settings;
  onEdit: (tx: Tx) => void;
};

type HistoryMode = 'expenses' | 'topups';

export function History({ settings, onEdit }: Props) {
  const { t } = useTranslation();
  const today = useToday();
  const monthIds = useMonthIds();
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<HistoryMode>('expenses');
  const monthId = selected ?? monthIds[0] ?? currentMonthId();

  const data = useLiveQuery(async () => {
    const [month, items, topUps] = await Promise.all([
      db.months.get(monthId),
      listTxByMonth(monthId),
      listTopUpsByMonth(monthId),
    ]);
    return { month, items, topUps };
  }, [monthId]);

  const categories = useCategories();
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const items = data?.items ?? [];
  const topUps = data?.topUps ?? [];
  const month = data?.month;

  const spentMinor = items.reduce((sum, tx) => sum + tx.amountMinor, 0);
  const topUpsMinor = topUps.reduce((sum, entry) => sum + entry.amountMinor, 0);
  const math = month ? computeMonth(month, spentMinor, today) : null;

  const expenseGroups = useMemo(() => groupByDate(items), [items]);
  const topUpGroups = useMemo(() => groupByDate(topUps), [topUps]);

  const listCount = mode === 'expenses' ? items.length : topUps.length;
  const subtitle =
    listCount === 0
      ? t('history.empty')
      : mode === 'expenses'
        ? pluralTx(listCount)
        : pluralTopUp(listCount);

  return (
    <Screen title={t('history.title')} subtitle={subtitle}>
      <MonthSwitcher monthId={monthId} monthIds={monthIds} onChange={setSelected} />

      <div className="px-[var(--page-gutter)]">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'expenses', label: t('history.expenses') },
            { value: 'topups', label: t('history.topUps') },
          ]}
        />
      </div>

      <div className="px-[var(--page-gutter)] pt-2.5">
        <GlassCard>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[13px] text-[var(--label-secondary)]">
                {mode === 'expenses' ? t('history.spentMonth') : t('history.topUpsMonth')}
              </p>
              <p className="money mt-0.5 text-[28px] font-bold">
                {formatMoney(mode === 'expenses' ? spentMinor : topUpsMinor, settings.currency, {
                  cents: false,
                })}
              </p>
            </div>
            {math && mode === 'expenses' && (
              <div className="text-right">
                <p className="text-[13px] text-[var(--label-secondary)]">
                  {month?.status === 'closed' ? t('history.monthTotal') : t('history.balance')}
                </p>
                <p
                  className={cn(
                    'money mt-0.5 text-[22px] font-bold',
                    (month?.status === 'closed'
                      ? (month.closingBalanceMinor ?? 0)
                      : math.balanceMinor) < 0 && 'text-[var(--negative)]',
                  )}
                >
                  {formatMoney(
                    month?.status === 'closed'
                      ? (month.closingBalanceMinor ?? 0)
                      : math.balanceMinor,
                    settings.currency,
                    { cents: 'auto', signed: true },
                  )}
                </p>
              </div>
            )}
          </div>

          {mode === 'expenses' && month?.status === 'closed' && (
            <p className="mt-3 text-[13px] text-[var(--label-secondary)]">
              {month.carryDecision === 'carry' ? t('history.closedCarry') : t('history.closedSavings')}
            </p>
          )}

          {mode === 'expenses' && math && month?.status !== 'closed' && (
            <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.min(100, (spentMinor / Math.max(1, math.monthAllowanceMinor)) * 100)}%`,
                  backgroundColor:
                    spentMinor > math.monthAllowanceMinor ? 'var(--negative)' : 'var(--accent)',
                }}
              />
            </div>
          )}
        </GlassCard>
      </div>

      {mode === 'expenses' ? (
        expenseGroups.length === 0 ? (
          <div className="px-[var(--page-gutter)] pt-3">
            <GlassCard className="text-center">
              <p className="text-[15px] text-[var(--label-secondary)]">{t('history.noExpensesMonth')}</p>
            </GlassCard>
          </div>
        ) : (
          expenseGroups.map(([date, dayItems]) => (
            <DaySection
              key={date}
              date={date}
              dayTotal={dayItems.reduce((sum, tx) => sum + tx.amountMinor, 0)}
              currency={settings.currency}
            >
              {dayItems.map((tx, index) => (
                <SwipeRow key={tx.id} onDelete={() => tx.id && void deleteTx(tx.id)}>
                  <TxRow
                    tx={tx}
                    category={tx.categoryId ? categoryById.get(tx.categoryId) : undefined}
                    currency={settings.currency}
                    last={index === dayItems.length - 1}
                    onClick={() => onEdit(tx)}
                  />
                </SwipeRow>
              ))}
            </DaySection>
          ))
        )
      ) : topUpGroups.length === 0 ? (
        <div className="px-[var(--page-gutter)] pt-3">
          <GlassCard className="text-center">
            <p className="text-[15px] text-[var(--label-secondary)]">
              {t('history.noTopUpsMonth')}
            </p>
          </GlassCard>
        </div>
      ) : (
        topUpGroups.map(([date, dayItems]) => (
          <DaySection
            key={date}
            date={date}
            dayTotal={dayItems.reduce((sum, entry) => sum + entry.amountMinor, 0)}
            currency={settings.currency}
            signedTotal
          >
            {dayItems.map((entry, index) => (
              <SwipeRow key={entry.id} onDelete={() => entry.id && void deleteTopUp(entry.id)}>
                <TopUpRow
                  topUp={entry}
                  currency={settings.currency}
                  last={index === dayItems.length - 1}
                />
              </SwipeRow>
            ))}
          </DaySection>
        ))
      )}
    </Screen>
  );
}

function groupByDate<T extends { date: IsoDate }>(entries: T[]): Array<[IsoDate, T[]]> {
  const byDate = new Map<IsoDate, T[]>();
  for (const entry of entries) {
    const bucket = byDate.get(entry.date);
    if (bucket) bucket.push(entry);
    else byDate.set(entry.date, [entry]);
  }
  return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function DaySection({
  date,
  dayTotal,
  currency,
  signedTotal,
  children,
}: {
  date: IsoDate;
  dayTotal: number;
  currency: string;
  signedTotal?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="px-[var(--page-gutter)] pt-4">
      <div className="flex items-baseline justify-between px-1 pb-1.5">
        <h3 className="text-[15px] font-semibold">{dayTitle(date)}</h3>
        <span
          className={cn(
            'money text-[14px]',
            signedTotal ? 'text-[var(--accent)]' : 'text-[var(--label-secondary)]',
          )}
        >
          {formatMoney(dayTotal, currency, { cents: false, signed: signedTotal })}
        </span>
      </div>

      <div className="glass overflow-hidden rounded-[var(--radius-card)]">{children}</div>
    </section>
  );
}
