import { useEffect, useState } from 'react';
import { AmountDisplay } from './AmountDisplay';
import { Keypad } from './Keypad';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { cn } from '@/lib/cn';
import { keypadToMinor } from '@/lib/money';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  currency: string;
  initialMinor?: number;
  /** Показывает переключатель «плюс/минус» — нужно для операций с копилкой */
  signed?: boolean;
  submitLabel?: string;
  onSubmit: (minor: number) => void | Promise<void>;
};

function minorToDigits(minor: number): string {
  const absolute = Math.abs(minor);
  const whole = Math.trunc(absolute / 100);
  const cents = absolute % 100;
  if (absolute === 0) return '';
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`;
}

export function AmountSheet({
  open,
  onClose,
  title,
  hint,
  currency,
  initialMinor = 0,
  signed = false,
  submitLabel = 'Сохранить',
  onSubmit,
}: Props) {
  const [digits, setDigits] = useState('');
  const [sign, setSign] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDigits(minorToDigits(initialMinor));
    setSign(initialMinor < 0 ? -1 : 1);
  }, [open, initialMinor]);

  const minor = keypadToMinor(digits) * (signed ? sign : 1);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(minor);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="px-4 pb-1">
        {hint && (
          <p className="pb-3 text-[14px] leading-snug text-[var(--label-secondary)]">{hint}</p>
        )}
        <div className="pt-2 pb-1">
          <AmountDisplay
            digits={digits}
            currency={currency}
            className={signed && sign === -1 ? 'text-[var(--negative)]' : undefined}
          />
        </div>

        {signed && (
          <div className="flex justify-center gap-2 pt-3">
            {([1, -1] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSign(option)}
                className={cn(
                  'pressable rounded-full px-4 py-2 text-[15px] font-semibold',
                  sign === option
                    ? option === 1
                      ? 'bg-[var(--link)] text-white'
                      : 'bg-[var(--negative)] text-white'
                    : 'bg-[var(--fill-tertiary)] text-[var(--label-secondary)]',
                )}
              >
                {option === 1 ? 'Пополнить' : 'Снять'}
              </button>
            ))}
          </div>
        )}

        <Keypad value={digits} onChange={setDigits} className="mt-3" />

        <Button
          size="lg"
          full
          className="mt-2"
          disabled={busy || keypadToMinor(digits) === 0}
          onClick={submit}
        >
          {submitLabel}
        </Button>
      </div>
    </Sheet>
  );
}
