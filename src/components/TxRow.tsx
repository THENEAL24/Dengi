import type { Category, Tx } from '@/db/db';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

type Props = {
  tx: Tx;
  category?: Category;
  currency: string;
  onClick?: () => void;
  last?: boolean;
  /** Показать дату вместо времени — нужно в списке «последних трат» */
  showDate?: boolean;
};

function timeOf(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TxRow({ tx, category, currency, onClick, last, showDate }: Props) {
  const title = category?.name ?? tx.note ?? 'Трата';
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
