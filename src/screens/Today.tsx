import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { PlusIcon } from '@/components/ui/icons';
import { TxRow } from '@/components/TxRow';
import type { Settings } from '@/db/db';
import { listRecentTx } from '@/db/repo';
import { useCategories, useCurrentMonthView, useSavingsTotal, useToday } from '@/state/hooks';
import { cn } from '@/lib/cn';
import { dateWithWeekday } from '@/lib/date';
import { pluralDays } from '@/lib/plural';
import { formatMoney } from '@/lib/money';
import { haptic } from '@/lib/haptics';

type Props = {
  settings: Settings;
  onAddExpense: () => void;
  onOpenHistory: () => void;
};

export function Today({ settings, onAddExpense, onOpenHistory }: Props) {
  const today = useToday();
  const view = useCurrentMonthView();
  const savings = useSavingsTotal();
  const categories = useCategories();
  const recent = useLiveQuery(() => listRecentTx(5), [], []);

  const math = view?.math;
  const currency = settings.currency;
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const spentShare = math && math.accruedMinor > 0 ? math.spentMinor / math.accruedMinor : 0;
  const overspent = Boolean(math && math.balanceMinor < 0);
  const ringColor = overspent ? 'var(--negative)' : 'var(--accent)';
  const balanceText = math ? formatMoney(math.balanceMinor, currency, { cents: false }) : '—';

  return (
    <Screen
      title="Сегодня"
      subtitle={dateWithWeekday(today)}
      action={
        <button
          type="button"
          onClick={() => {
            haptic('medium');
            onAddExpense();
          }}
          className="glass pressable grid size-9 place-items-center rounded-full"
          aria-label="Добавить трату"
        >
          <PlusIcon size={20} className="text-[var(--link)]" />
        </button>
      }
    >
      <div className="flex flex-col items-center px-[var(--page-gutter)] pt-2">
        <ProgressRing progress={spentShare} color={ringColor} size={228}>
          <div>
            <p className="text-[13px] font-medium tracking-wide text-[var(--label-secondary)] uppercase">
              Доступно
            </p>
            <p
              className={cn(
                'money mt-1 leading-none font-bold whitespace-nowrap',
                overspent && 'text-[var(--negative)]',
              )}
              style={{ fontSize: balanceFontSize(balanceText) }}
            >
              {balanceText}
            </p>
            {math && (
              <p className="mt-2 text-[13px] text-[var(--label-secondary)]">
                +{formatMoney(math.dailyRateMinor, currency, { cents: false })} в день
              </p>
            )}
          </div>
        </ProgressRing>

        <button
          type="button"
          onClick={() => {
            haptic('medium');
            onAddExpense();
          }}
          className="pressable mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--link)] text-[18px] font-semibold text-white"
        >
          <PlusIcon size={20} />
          Добавить трату
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 px-[var(--page-gutter)]">
        <StatCard
          label="Потрачено сегодня"
          value={formatMoney(view?.spentTodayMinor ?? 0, currency, { cents: false })}
          hint={
            math
              ? `норма ${formatMoney(math.dailyRateMinor, currency, { cents: false })}`
              : undefined
          }
          warn={Boolean(math && (view?.spentTodayMinor ?? 0) > math.dailyRateMinor)}
        />
        <StatCard
          label="Можно в день"
          value={math ? formatMoney(Math.max(0, math.safeDailyMinor), currency, { cents: false }) : '—'}
          hint={math ? `осталось ${pluralDays(math.remainingDays)}` : undefined}
        />
        <StatCard
          label="Потрачено за месяц"
          value={math ? formatMoney(math.spentMinor, currency, { cents: false }) : '—'}
          hint={
            math
              ? `из ${formatMoney(math.monthAllowanceMinor, currency, { cents: false })}`
              : undefined
          }
        />
        <StatCard
          label="Копилка"
          value={formatMoney(savings, currency, { cents: false })}
          hint={
            math && math.openingBalanceMinor !== 0
              ? `перенос ${formatMoney(math.openingBalanceMinor, currency, { cents: false, signed: true })}`
              : undefined
          }
        />
      </div>

      {math && (
        <div className="mt-2.5 px-[var(--page-gutter)]">
          <GlassCard className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[var(--label-secondary)]">Если больше не тратить</p>
              <p className="text-[15px]">К концу месяца останется</p>
            </div>
            <p
              className={cn(
                'money text-[22px] font-bold',
                math.projectedEndMinor < 0 && 'text-[var(--negative)]',
              )}
            >
              {formatMoney(math.projectedEndMinor, currency, { cents: false, signed: true })}
            </p>
          </GlassCard>
        </div>
      )}

      <section className="mt-4 px-[var(--page-gutter)]">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <h3 className="text-[20px] font-bold tracking-[-0.02em]">Последние траты</h3>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-[15px] font-medium text-[var(--link)]"
            >
              Все
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <GlassCard className="text-center">
            <p className="text-[15px] text-[var(--label-secondary)]">
              Трат пока нет. Добавь первую — бюджет пересчитается сразу.
            </p>
          </GlassCard>
        ) : (
          <div className="glass overflow-hidden rounded-[var(--radius-card)]">
            {recent.map((tx, index) => (
              <TxRow
                key={tx.id}
                tx={tx}
                category={tx.categoryId ? categoryById.get(tx.categoryId) : undefined}
                currency={currency}
                last={index === recent.length - 1}
                onClick={onOpenHistory}
              />
            ))}
          </div>
        )}
      </section>
    </Screen>
  );
}

/** Внутри кольца одна строка, поэтому крупные суммы уменьшаются, а не переносятся */
function balanceFontSize(text: string): number {
  const length = text.length;
  if (length <= 8) return 40;
  if (length <= 10) return 34;
  if (length <= 12) return 29;
  return 24;
}

function StatCard({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <GlassCard className="min-h-[92px]">
      <p className="text-[13px] leading-tight text-[var(--label-secondary)]">{label}</p>
      <p className={cn('money mt-1.5 text-[24px] font-bold', warn && 'text-[var(--ios-orange)]')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-[var(--label-tertiary)]">{hint}</p>}
    </GlassCard>
  );
}
