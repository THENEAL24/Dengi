import { cn } from '@/lib/cn';
import { currencySymbol, keypadDisplay } from '@/lib/money';

type Props = {
  /** Строка ввода с клавиатуры */
  digits: string;
  currency: string;
  className?: string;
  placeholderDimmed?: boolean;
};

/** Размер подбирается под длину, чтобы сумма не переносилась на вторую строку */
function fontSizeFor(length: number): number {
  if (length <= 6) return 64;
  if (length <= 8) return 54;
  if (length <= 10) return 46;
  return 38;
}

export function AmountDisplay({ digits, currency, className, placeholderDimmed = true }: Props) {
  const text = keypadDisplay(digits);
  const empty = digits === '';
  const size = fontSizeFor(text.length);

  return (
    <div
      className={cn(
        'money flex items-baseline justify-center gap-1.5 leading-none',
        empty && placeholderDimmed && 'text-[var(--label-tertiary)]',
        className,
      )}
      style={{ fontSize: size, fontWeight: 700 }}
    >
      <span>{text}</span>
      <span style={{ fontSize: size * 0.56 }} className="text-[var(--label-secondary)]">
        {currencySymbol(currency)}
      </span>
    </div>
  );
}
