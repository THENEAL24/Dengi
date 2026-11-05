import type { TopUp } from '@/db/db';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { useTranslation } from '@/state/I18nContext';

type Props = {
  topUp: TopUp;
  currency: string;
  last?: boolean;
};

function timeOf(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TopUpRow({ topUp, currency, last }: Props) {
  const { t } = useTranslation();
  const title = topUp.note ?? t('topUp.defaultTitle');

  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5', !last && 'hairline-b')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[17px]">
        💰
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] leading-tight">{title}</p>
        <p className="truncate text-[13px] text-[var(--label-secondary)]">{timeOf(topUp.createdAt)}</p>
      </div>

      <span className="money shrink-0 text-[17px] font-semibold text-[var(--accent)]">
        {formatMoney(topUp.amountMinor, currency, { signed: true })}
      </span>
    </div>
  );
}
