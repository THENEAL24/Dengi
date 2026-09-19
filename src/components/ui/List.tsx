import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';
import { ChevronRightIcon } from './icons';

type ListProps = {
  children: ReactNode;
  header?: string;
  footer?: ReactNode;
  className?: string;
};

/** Inset grouped list как в iOS Settings */
export function List({ children, header, footer, className }: ListProps) {
  return (
    <section className={cn('px-[var(--page-gutter)]', className)}>
      {header && (
        <h3 className="px-3 pt-4 pb-1.5 text-[13px] font-medium tracking-wide text-[var(--label-secondary)] uppercase">
          {header}
        </h3>
      )}
      <div className="glass overflow-hidden rounded-[var(--radius-card)]">{children}</div>
      {footer && (
        <p className="px-3 pt-2 text-[13px] leading-snug text-[var(--label-secondary)]">{footer}</p>
      )}
    </section>
  );
}

type RowProps = {
  label: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  iconColor?: string;
  onClick?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  last?: boolean;
};

export function ListRow({
  label,
  value,
  icon,
  iconColor,
  onClick,
  chevron,
  destructive,
  last,
}: RowProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? () => {
              haptic('light');
              onClick?.();
            }
          : undefined
      }
      className={cn(
        'flex min-h-[50px] items-center gap-3 px-4 py-2.5',
        !last && 'hairline-b',
        interactive && 'active:bg-[var(--fill-tertiary)]',
        destructive && 'text-[var(--negative)]',
      )}
    >
      {icon && (
        <span
          className="flex size-[29px] shrink-0 items-center justify-center rounded-[8px] text-white"
          style={{ backgroundColor: iconColor ?? 'var(--ios-gray)' }}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[17px]">{label}</span>
      {value !== undefined && (
        <span className="money shrink-0 text-[17px] text-[var(--label-secondary)]">{value}</span>
      )}
      {chevron && <ChevronRightIcon size={18} className="shrink-0 text-[var(--label-tertiary)]" />}
    </div>
  );
}
