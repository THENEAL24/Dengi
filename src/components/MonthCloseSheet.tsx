import { useState } from 'react';
import { Sheet } from './ui/Sheet';
import { ArrowDownIcon, ArrowUpIcon, PiggyIcon } from './ui/icons';
import type { CarryDecision } from '@/db/db';
import { closeMonth, type PendingClose } from '@/db/monthActions';
import { allowanceFor } from '@/lib/budget';
import { cn } from '@/lib/cn';
import { monthTitle, monthTitleLower, monthTitleShort, shiftMonth } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { useTranslation } from '@/state/I18nContext';

type Props = {
  pending: PendingClose;
  currency: string;
  savingsMinor: number;
};

export function MonthCloseSheet({ pending, currency, savingsMinor }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { month, spentMinor, closingBalanceMinor } = pending;
  const positive = closingBalanceMinor >= 0;
  const nextMonthId = shiftMonth(month.id, 1);
  const nextMonth = monthTitleLower(nextMonthId);
  const nextMonthTitle = monthTitleShort(nextMonthId);

  const apply = async (decision: CarryDecision) => {
    setBusy(true);
    try {
      await closeMonth(month.id, decision);
      haptic('success');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={() => {}} dismissable={false}>
      <div className="px-5 pt-5">
        <p className="text-[13px] font-medium tracking-wide text-[var(--label-secondary)] uppercase">
          {t('monthClose.ended', { month: monthTitle(month.id) })}
        </p>
        <h2 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.03em]">
          {positive ? t('monthClose.surplusTitle') : t('monthClose.deficitTitle')}
        </h2>

        <p
          className={cn(
            'money mt-3 text-[46px] leading-none font-bold',
            !positive && 'text-[var(--negative)]',
          )}
        >
          {formatMoney(closingBalanceMinor, currency, { cents: false, signed: true })}
        </p>

        <div className="glass mt-4 overflow-hidden rounded-[var(--radius-card)]">
          <DetailRow
            label={t('monthClose.accrued')}
            value={formatMoney(
              allowanceFor(month.limitMinor, month.id, month.accrualStartDay),
              currency,
              { cents: false },
            )}
          />
          {month.openingBalanceMinor !== 0 && (
            <DetailRow
              label={t('monthClose.carryOver')}
              value={formatMoney(month.openingBalanceMinor, currency, {
                cents: false,
                signed: true,
              })}
            />
          )}
          <DetailRow
            label={t('monthClose.spent')}
            value={formatMoney(spentMinor, currency, { cents: false })}
          />
          <DetailRow
            label={t('monthClose.savingsNow')}
            value={formatMoney(savingsMinor, currency, { cents: false })}
            last
          />
        </div>

        <p className="mt-4 px-1 text-[15px] text-[var(--label-secondary)]">
          {positive ? t('monthClose.surplusQuestion') : t('monthClose.deficitQuestion')}
        </p>

        <div className="mt-2 space-y-2 pb-2">
          <ChoiceCard
            icon={positive ? <ArrowDownIcon size={20} /> : <ArrowUpIcon size={20} />}
            title={
              positive
                ? t('monthClose.carrySurplusTitle', { month: nextMonth })
                : t('monthClose.carryDebtTitle', { month: nextMonth })
            }
            description={
              positive
                ? t('monthClose.carrySurplusDesc', {
                    monthTitle: nextMonthTitle,
                    amount: formatMoney(closingBalanceMinor, currency, { cents: false }),
                  })
                : t('monthClose.carryDebtDesc', {
                    monthTitle: nextMonthTitle,
                    amount: formatMoney(Math.abs(closingBalanceMinor), currency, { cents: false }),
                  })
            }
            disabled={busy}
            onClick={() => apply('carry')}
          />
          <ChoiceCard
            icon={<PiggyIcon size={20} />}
            title={positive ? t('monthClose.toSavingsTitle') : t('monthClose.fromSavingsTitle')}
            description={t('monthClose.savingsDesc', {
              amount: formatMoney(savingsMinor + closingBalanceMinor, currency, { cents: false }),
              month: nextMonth,
            })}
            disabled={busy}
            onClick={() => apply('savings')}
          />
        </div>
      </div>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-2.5', !last && 'hairline-b')}>
      <span className="text-[15px] text-[var(--label-secondary)]">{label}</span>
      <span className="money text-[16px] font-semibold">{value}</span>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="glass pressable flex w-full items-start gap-3 rounded-[var(--radius-card)] p-4 text-left disabled:opacity-50"
    >
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[var(--fill-tertiary)] text-[var(--link)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[17px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[14px] leading-snug text-[var(--label-secondary)]">
          {description}
        </span>
      </span>
    </button>
  );
}
