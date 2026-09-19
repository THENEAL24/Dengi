import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import type { Category, Settings } from '@/db/db';
import { db } from '@/db/db';
import { listTxByMonth } from '@/db/repo';
import { computeMonth } from '@/lib/budget';
import { cn } from '@/lib/cn';
import { currentMonthId, dayOf, daysInMonth, weekdayShort } from '@/lib/date';
import { pluralDays } from '@/lib/plural';
import { formatCompact, formatMoney } from '@/lib/money';
import { useCategories, useMonthIds, useToday } from '@/state/hooks';

type Props = { settings: Settings };
type Mode = 'categories' | 'days';

const NO_CATEGORY = -1;

export function Stats({ settings }: Props) {
  const today = useToday();
  const monthIds = useMonthIds();
  const categories = useCategories();
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('categories');

  const monthId = selected ?? monthIds[0] ?? currentMonthId();
  const currency = settings.currency;

  const data = useLiveQuery(async () => {
    const [month, items] = await Promise.all([db.months.get(monthId), listTxByMonth(monthId)]);
    return { month, items };
  }, [monthId]);

  const items = data?.items ?? [];
  const month = data?.month;
  const spentMinor = items.reduce((sum, tx) => sum + tx.amountMinor, 0);
  const math = month ? computeMonth(month, spentMinor, today) : null;

  const byCategory = useMemo(() => {
    const totals = new Map<number, number>();
    for (const tx of items) {
      const key = tx.categoryId ?? NO_CATEGORY;
      totals.set(key, (totals.get(key) ?? 0) + tx.amountMinor);
    }
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    return [...totals.entries()]
      .map(([id, total]) => ({
        id,
        total,
        category: categoryById.get(id),
      }))
      .sort((a, b) => b.total - a.total);
  }, [items, categories]);

  const byDay = useMemo(() => {
    const total = daysInMonth(monthId);
    const sums = new Array<number>(total).fill(0);
    for (const tx of items) sums[dayOf(tx.date) - 1] += tx.amountMinor;
    return sums;
  }, [items, monthId]);

  const daysPassed = math ? Math.max(1, math.accruedDays) : 1;
  const averagePerDay = Math.round(spentMinor / daysPassed);
  const paceDelta = math ? averagePerDay - math.dailyRateMinor : 0;
  const daysWithSpending = byDay.filter((value) => value > 0).length;

  return (
    <Screen title="Статистика" subtitle={month ? undefined : 'Нет данных за месяц'}>
      <MonthSwitcher monthId={monthId} monthIds={monthIds} onChange={setSelected} />

      <div className="space-y-2.5 px-[var(--page-gutter)]">
        <GlassCard>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[13px] text-[var(--label-secondary)]">В среднем в день</p>
              <p className="money mt-0.5 text-[30px] font-bold">
                {formatMoney(averagePerDay, currency, { cents: false })}
              </p>
            </div>
            {math && (
              <div className="text-right">
                <p className="text-[13px] text-[var(--label-secondary)]">Норма</p>
                <p className="money mt-0.5 text-[20px] font-semibold">
                  {formatMoney(math.dailyRateMinor, currency, { cents: false })}
                </p>
              </div>
            )}
          </div>

          {math && (
            <p
              className={cn(
                'mt-2.5 text-[14px]',
                paceDelta > 0 ? 'text-[var(--ios-orange)]' : 'text-[var(--accent)]',
              )}
            >
              {paceDelta > 0
                ? `Темп выше нормы на ${formatMoney(paceDelta, currency, { cents: false })} в день`
                : `Темп ниже нормы на ${formatMoney(Math.abs(paceDelta), currency, { cents: false })} в день`}
            </p>
          )}
        </GlassCard>

        <div className="grid grid-cols-2 gap-2.5">
          <MiniCard
            label="Всего за месяц"
            value={formatMoney(spentMinor, currency, { cents: false })}
          />
          <MiniCard label="Трат" value={String(items.length)} />
          <MiniCard label="Дней с тратами" value={pluralDays(daysWithSpending)} />
          <MiniCard
            label="Средняя трата"
            value={formatMoney(items.length ? Math.round(spentMinor / items.length) : 0, currency, {
              cents: false,
            })}
          />
        </div>

        <Segmented
          className="mt-1"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'categories', label: 'Категории' },
            { value: 'days', label: 'По дням' },
          ]}
        />

        {spentMinor === 0 ? (
          <GlassCard className="text-center">
            <p className="text-[15px] text-[var(--label-secondary)]">
              За этот месяц трат ещё нет.
            </p>
          </GlassCard>
        ) : mode === 'categories' ? (
          <GlassCard>
            <div className="flex justify-center py-1">
              <Donut
                segments={byCategory.map((entry) => ({
                  value: entry.total,
                  color: entry.category?.color ?? 'var(--ios-gray)',
                }))}
                total={spentMinor}
                centerLabel={formatCompact(spentMinor, currency)}
              />
            </div>

            <div className="mt-3 space-y-2.5">
              {byCategory.map((entry) => (
                <CategoryBar
                  key={entry.id}
                  category={entry.category}
                  total={entry.total}
                  share={entry.total / spentMinor}
                  currency={currency}
                />
              ))}
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <DayBars
              values={byDay}
              monthId={monthId}
              dailyRateMinor={math?.dailyRateMinor ?? 0}
              currency={currency}
            />
          </GlassCard>
        )}
      </div>
    </Screen>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard>
      <p className="text-[13px] text-[var(--label-secondary)]">{label}</p>
      <p className="money mt-1 text-[20px] font-bold">{value}</p>
    </GlassCard>
  );
}

function Donut({
  segments,
  total,
  centerLabel,
}: {
  segments: Array<{ value: number; color: string }>;
  total: number;
  centerLabel: string;
}) {
  const size = 168;
  const thickness = 20;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--fill-tertiary)"
          strokeWidth={thickness}
        />
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          // маленький зазор между сегментами делает диаграмму читаемой
          const gap = segments.length > 1 ? 2 : 0;
          const dash = Math.max(0, length - gap);
          const element = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return element;
        })}
      </svg>
      <span className="money absolute text-[17px] font-bold">{centerLabel}</span>
    </div>
  );
}

function CategoryBar({
  category,
  total,
  share,
  currency,
}: {
  category?: Category;
  total: number;
  share: number;
  currency: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[15px]">{category?.emoji ?? '💸'}</span>
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {category?.name ?? 'Без категории'}
        </span>
        <span className="text-[13px] text-[var(--label-secondary)]">
          {Math.round(share * 100)}%
        </span>
        <span className="money w-[92px] text-right text-[15px] font-semibold">
          {formatMoney(total, currency, { cents: false })}
        </span>
      </div>
      <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(2, share * 100)}%`,
            backgroundColor: category?.color ?? 'var(--ios-gray)',
          }}
        />
      </div>
    </div>
  );
}

function DayBars({
  values,
  monthId,
  dailyRateMinor,
  currency,
}: {
  values: number[];
  monthId: string;
  dailyRateMinor: number;
  currency: string;
}) {
  const max = Math.max(dailyRateMinor, ...values, 1);
  const height = 132;

  return (
    <div>
      <div className="relative" style={{ height }}>
        {dailyRateMinor > 0 && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-[var(--label-tertiary)]"
            style={{ bottom: (dailyRateMinor / max) * height }}
          >
            <span className="absolute -top-4 right-0 text-[11px] text-[var(--label-tertiary)]">
              норма {formatCompact(dailyRateMinor, currency)}
            </span>
          </div>
        )}

        <div className="flex h-full items-end gap-[2px]">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-[3px]"
              style={{
                height: `${Math.max(value > 0 ? 3 : 1, (value / max) * height)}px`,
                backgroundColor:
                  value === 0
                    ? 'var(--fill-tertiary)'
                    : value > dailyRateMinor
                      ? 'var(--ios-orange)'
                      : 'var(--accent)',
              }}
              title={`${index + 1} · ${formatMoney(value, currency, { cents: false })}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-[var(--label-tertiary)]">
        <span>1 {weekdayShort(`${monthId}-01`)}</span>
        <span>
          {values.length} {weekdayShort(`${monthId}-${String(values.length).padStart(2, '0')}`)}
        </span>
      </div>
    </div>
  );
}
