import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AmountSheet } from '@/components/AmountSheet';
import { BalanceSheet } from '@/components/BalanceSheet';
import { Screen } from '@/components/ui/Screen';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ArrowDownIcon, PlusIcon } from '@/components/ui/icons';
import { topUpAvailable } from '@/db/balanceActions';
import { TxRow } from '@/components/TxRow';
import type { Settings, Tx } from '@/db/db';
import { listRecentTx } from '@/db/repo';
import { useCategories, useCurrentMonthView, useSavingsTotal, useToday } from '@/state/hooks';
import { effectiveAmountRounding } from '@/lib/currencies';
import { cn } from '@/lib/cn';
import { dateWithWeekday } from '@/lib/date';
import { pluralDays } from '@/lib/plural';
import { formatMoney } from '@/lib/money';
import { haptic } from '@/lib/haptics';
import { useTranslation } from '@/state/I18nContext';

type Props = {
  settings: Settings;
  onAddExpense: () => void;
  onEditExpense: (tx: Tx) => void;
  onOpenHistory: () => void;
};

export function Today({ settings, onAddExpense, onEditExpense, onOpenHistory }: Props) {
  const { t } = useTranslation();
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const today = useToday();
  const view = useCurrentMonthView();
  const savings = useSavingsTotal();
  const categories = useCategories();
  const recent = useLiveQuery(() => listRecentTx(5), [], []);

  const math = view?.math;
  const currency = settings.currency;
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const spentTodayMinor = view?.spentTodayMinor ?? 0;
  const dailyNormMinor = math?.dailyRateMinor ?? 0;
  const dailyRingProgress =
    dailyNormMinor > 0 ? spentTodayMinor / dailyNormMinor : spentTodayMinor > 0 ? 1.01 : 0;
  const dailyOverNorm = dailyNormMinor > 0 && spentTodayMinor > dailyNormMinor;
  const overspent = Boolean(math && math.balanceMinor < 0);
  const amountRounding = effectiveAmountRounding(currency, settings.amountRounding);
  const balanceText = math
    ? formatMoney(math.balanceMinor, currency, { cents: 'auto', rounding: amountRounding })
    : '—';

  return (
    <Screen title={t('tab.today')} subtitle={dateWithWeekday(today)} compactTop>
      <div className="flex flex-col items-center px-[var(--page-gutter)] pt-0">
        <button type="button" className="pressable" onClick={() => setBalanceOpen(true)}>
          <ProgressRing progress={dailyRingProgress} size={228}>
            <div>
              <p className="text-[13px] font-medium tracking-wide text-[var(--label-secondary)] uppercase">
                {t('app.available')}
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
                <p
                  className={cn(
                    'mt-2 text-[13px] text-[var(--label-secondary)]',
                    dailyOverNorm && 'text-[var(--ios-orange)]',
                  )}
                >
                  {t('today.spentTodayInline', { amount: formatMoney(spentTodayMinor, currency, { cents: 'auto' }) })}
                  {dailyNormMinor > 0 && (
                    <>{t('today.normInline', { amount: formatMoney(dailyNormMinor, currency, { cents: 'auto' }) })}</>
                  )}
                </p>
              )}
            </div>
          </ProgressRing>
        </button>

        <div className="mt-5 flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              haptic('medium');
              onAddExpense();
            }}
            className="pressable flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--link)] text-[18px] font-semibold text-white"
          >
            <PlusIcon size={20} />
            {t('today.addExpenseBtn')}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic('medium');
              setTopUpOpen(true);
            }}
            className="pressable flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--ios-green)] text-[18px] font-semibold text-white"
          >
            <ArrowDownIcon size={20} />
            {t('today.topUp')}
          </button>
        </div>
      </div>

      {math && (
        <div className="mt-4 px-[var(--page-gutter)]">
          <GlassCard className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-[var(--label-secondary)]">{t('today.topUpsMonth')}</p>
              <p className="text-[15px]">{t('today.topUpsExternal')}</p>
            </div>
            <p className="money text-[24px] font-bold text-[var(--ios-green)]">
              {formatMoney(math.externalTopUpsMinor, currency, {
                cents: false,
                signed: math.externalTopUpsMinor > 0,
              })}
            </p>
          </GlassCard>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5 px-[var(--page-gutter)]">
        <StatCard
          label={t('today.spentToday')}
          value={formatMoney(view?.spentTodayMinor ?? 0, currency, { cents: false })}
          hint={
            math
              ? t('today.normHint', { amount: formatMoney(math.dailyRateMinor, currency, { cents: 'auto' }) })
              : undefined
          }
          warn={Boolean(math && (view?.spentTodayMinor ?? 0) > math.dailyRateMinor)}
        />
        <StatCard
          label={t('today.safeDaily')}
          value={math ? formatMoney(Math.max(0, math.safeDailyMinor), currency, { cents: 'auto' }) : '—'}
          hint={math ? t('today.daysLeft', { days: pluralDays(math.remainingDays) }) : undefined}
        />
        <StatCard
          label={t('today.spentMonth')}
          value={math ? formatMoney(math.spentMinor, currency, { cents: false }) : '—'}
          hint={
            math
              ? t('today.ofAllowance', { amount: formatMoney(math.monthAllowanceMinor, currency, { cents: false }) })
              : undefined
          }
        />
        <StatCard
          label={t('settings.savings')}
          value={formatMoney(savings, currency, { cents: false })}
          hint={
            math?.dailySavingsMinor
              ? t('today.savingsAuto', { amount: formatMoney(math.dailySavingsMinor, currency, { cents: false }) })
              : math && math.openingBalanceMinor !== 0
                ? t('today.carryOpening', { amount: formatMoney(math.openingBalanceMinor, currency, { cents: false, signed: true }) })
                : undefined
          }
          onClick={() => setBalanceOpen(true)}
        />
      </div>

      {math && (
        <div className="mt-2.5 px-[var(--page-gutter)]">
          <GlassCard className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[var(--label-secondary)]">{t('today.ifNoSpend')}</p>
              <p className="text-[15px]">{t('today.projectedEnd')}</p>
            </div>
            <p
              className={cn(
                'money text-[22px] font-bold',
                math.projectedEndMinor < 0 && 'text-[var(--negative)]',
              )}
            >
              {formatMoney(math.projectedEndMinor, currency, { cents: 'auto', signed: true })}
            </p>
          </GlassCard>
        </div>
      )}

      <section className="mt-4 px-[var(--page-gutter)]">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <h3 className="text-[20px] font-bold tracking-[-0.02em]">{t('today.recentExpenses')}</h3>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-[15px] font-medium text-[var(--link)]"
            >
              {t('common.all')}
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <GlassCard className="text-center">
            <p className="text-[15px] text-[var(--label-secondary)]">
              {t('today.noExpenses')}
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
                onClick={() => onEditExpense(tx)}
              />
            ))}
          </div>
        )}
      </section>

      {math && (
        <BalanceSheet
          open={balanceOpen}
          onClose={() => setBalanceOpen(false)}
          currency={currency}
          balanceMinor={math.balanceMinor}
          savingsMinor={savings}
        />
      )}

      <AmountSheet
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title={t('today.topUpTitle')}
        hint={t('today.topUpHint')}
        currency={currency}
        submitLabel={t('today.topUp')}
        onSubmit={async (minor) => {
          if (minor <= 0) return;
          await topUpAvailable(minor);
          haptic('success');
        }}
      />
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
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="text-[13px] leading-tight text-[var(--label-secondary)]">{label}</p>
      <p className={cn('money mt-1.5 text-[24px] font-bold', warn && 'text-[var(--ios-orange)]')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-[var(--label-tertiary)]">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="pressable w-full text-left">
        <GlassCard className="min-h-[92px]">{body}</GlassCard>
      </button>
    );
  }

  return <GlassCard className="min-h-[92px]">{body}</GlassCard>;
}
