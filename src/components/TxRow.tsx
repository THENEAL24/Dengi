import type { Category, Tx } from '@/db/db';
import { cn } from '@/lib/cn';
import { timeOf } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { useTranslation } from '@/state/I18nContext';

type Props = {
  tx: Tx;
  category?: Category;
  currency: string;
  onClick?: () => void;
  last?: boolean;
  /** Показать дату вместо времени — нужно в списке «последних трат» */
  showDate?: boolean;
};

export function TxRow({ tx, category, currency, onClick, last, showDate }: Props) {
  const { t } = useTranslation();
  const title = category?.name ?? tx.note ?? t('expense.defaultTitle');
  const subtitle = category && tx.note ? tx.note : showDate ? undefined : timeOf(tx.createdAt);

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        !last && 'hairline-b',
        onClick && 'active:bg-[var(--fill-tertiary)]',
      )}
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full text-[17px]"
        style={{
          backgroundColor: category ? `color-mix(in srgb, ${category.color} 22%, transparent)` : 'var(--fill-tertiary)',
        }}
      >
        {category?.emoji ?? '💸'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] leading-tight">{title}</p>
        {subtitle && (
          <p className="truncate text-[13px] text-[var(--label-secondary)]">{subtitle}</p>
        )}
      </div>

      <span className="money shrink-0 text-[17px] font-semibold">
        {formatMoney(tx.amountMinor, currency)}
      </span>
    </div>
  );
}
