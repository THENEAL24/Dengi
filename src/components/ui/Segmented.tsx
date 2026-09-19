import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';

type Props<T extends string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Segmented<T extends string>({ options, value, onChange, className }: Props<T>) {
  return (
    <div
      className={cn(
        'flex gap-0.5 rounded-[11px] bg-[var(--fill-tertiary)] p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (!isActive) haptic('light');
              onChange(option.value);
            }}
            className="relative flex-1 py-[7px] text-[13px] font-semibold"
          >
            {isActive && (
              <motion.span
                layoutId="segmented-indicator"
                className="absolute inset-0 rounded-[9px] bg-[var(--surface-solid)] shadow-sm"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className={cn('relative', !isActive && 'text-[var(--label-secondary)]')}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
