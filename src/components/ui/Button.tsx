import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';

type Variant = 'filled' | 'tinted' | 'plain' | 'destructive';
type Size = 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

const variants: Record<Variant, string> = {
  filled: 'bg-[var(--link)] text-white font-semibold',
  tinted: 'bg-[var(--fill-secondary)] text-[var(--link)] font-semibold',
  plain: 'text-[var(--link)] font-medium',
  destructive: 'bg-[var(--fill-secondary)] text-[var(--negative)] font-semibold',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-[17px] rounded-[var(--radius-control)]',
  lg: 'h-[52px] px-5 text-[18px] rounded-[18px]',
};

export function Button({
  children,
  variant = 'filled',
  size = 'md',
  full,
  className,
  onClick,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        'pressable inline-flex items-center justify-center gap-2 disabled:opacity-40',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      onClick={(event) => {
        haptic('light');
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
