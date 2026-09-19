import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SwipeRow } from '@/components/SwipeRow';
import { TxRow } from '@/components/TxRow';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import type { Settings, Tx } from '@/db/db';
import { db } from '@/db/db';
import { deleteTx, listTxByMonth } from '@/db/repo';
import { useCategories, useMonthIds, useToday } from '@/state/hooks';
import { computeMonth } from '@/lib/budget';
import { cn } from '@/lib/cn';
import { currentMonthId, dayTitle, type IsoDate } from '@/lib/date';
import { pluralTx } from '@/lib/plural';
import { formatMoney } from '@/lib/money';

type Props = {
  settings: Settings;
  onEdit: (tx: Tx) => void;
};

export function History({ settings, onEdit }: Props) {
  const today = useToday();
  const monthIds = useMonthIds();
  const [selected, setSelected] = useState<string | null>(null);
  const monthId = selected ?? monthIds[0] ?? currentMonthId();

  const data = useLiveQuery(async () => {
    const [month, items] = await Promise.all([db.months.get(monthId), listTxByMonth(monthId)]);
    return { month, items };
  }, [monthId]);

  const categories = useCategories();
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const items = data?.items ?? [];
  const month = data?.month;

  const spentMinor = items.reduce((sum, tx) => sum + tx.amountMinor, 0);
  const math = month ? computeMonth(month, spentMinor, today) : null;

  const groups = useMemo(() => {
    const byDate = new Map<IsoDate, Tx[]>();
    for (const tx of items) {
      const bucket = byDate.get(tx.date);
      if (bucket) bucket.push(tx);
      else byDate.set(tx.date, [tx]);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  return (
    <Screen title="История" subtitle={items.length ? pluralTx(items.length) : 'Пока пусто'}>
      <MonthSwitcher monthId={monthId} monthIds={monthIds} onChange={setSelected} />

      <div className="px-[var(--page-gutter)]">
        <GlassCard>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[13px] text-[var(--label-secondary)]">Потрачено за месяц</p>
              <p className="money mt-0.5 text-[28px] font-bold">
                {formatMoney(spentMinor, settings.currency, { cents: false })}
              </p>
            </div>
            {math && (
              <div className="text-right">
                <p className="text-[13px] text-[var(--label-secondary)]">
                  {month?.status === 'closed' ? 'Итог месяца' : 'Баланс'}
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
                    { cents: false, signed: true },
                  )}
                </p>
              </div>
            )}
          </div>

          {month?.status === 'closed' && (
            <p className="mt-3 text-[13px] text-[var(--label-secondary)]">
              Месяц закрыт ·{' '}
              {month.carryDecision === 'carry'
                ? 'остаток перенесён на следующий месяц'
                : 'остаток учтён в копилке'}
            </p>
          )}

          {math && month?.status !== 'closed' && (
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

      {groups.length === 0 ? (
        <div className="px-[var(--page-gutter)] pt-3">
          <GlassCard className="text-center">
            <p className="text-[15px] text-[var(--label-secondary)]">
              В этом месяце трат нет.
            </p>
          </GlassCard>
        </div>
      ) : (
        groups.map(([date, dayItems]) => {
          const dayTotal = dayItems.reduce((sum, tx) => sum + tx.amountMinor, 0);
          return (
            <section key={date} className="px-[var(--page-gutter)] pt-4">
              <div className="flex items-baseline justify-between px-1 pb-1.5">
                <h3 className="text-[15px] font-semibold">{dayTitle(date)}</h3>
                <span className="money text-[14px] text-[var(--label-secondary)]">
                  {formatMoney(dayTotal, settings.currency, { cents: false })}
                </span>
              </div>

              <div className="glass overflow-hidden rounded-[var(--radius-card)]">
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
              </div>
            </section>
          );
        })
      )}
    </Screen>
  );
}
