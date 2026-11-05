import { cn } from '@/lib/cn';
import { currencyDecimals } from '@/lib/currencies';
import { haptic } from '@/lib/haptics';
import { applyKeypadInput, type KeypadKey } from '@/lib/keypad';
import { useTranslation } from '@/state/I18nContext';
import { BackspaceIcon } from './ui/icons';

type Props = {
  value: string;
  onChange: (next: string) => void;
  currency?: string;
  className?: string;
};

const baseKeys: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

export function Keypad({ value, onChange, currency = 'RUB', className }: Props) {
  const { t } = useTranslation();
  const fractionDigits = currencyDecimals(currency);
  const keys = fractionDigits === 2 ? baseKeys : baseKeys.map((key) => (key === '.' ? 'spacer' : key));

  return (
    <div className={cn('grid grid-cols-3 gap-1.5', className)}>
      {keys.map((key, index) => {
        if (key === 'spacer') {
          return <span key={`spacer-${index}`} aria-hidden className="h-[58px]" />;
        }
        const keypadKey = key as KeypadKey;
        return (
          <button
            key={keypadKey}
            type="button"
            onClick={() => {
              haptic('light');
              onChange(applyKeypadInput(value, keypadKey, fractionDigits));
            }}
            onContextMenu={(event) => event.preventDefault()}
            className={cn(
              'money flex h-[58px] items-center justify-center rounded-[16px] text-[27px] font-medium',
              'transition-[background-color,transform] duration-100 active:scale-95 active:bg-[var(--fill-secondary)]',
              keypadKey === 'back' && 'text-[var(--label-secondary)]',
            )}
            aria-label={
              keypadKey === 'back'
                ? t('keypad.deleteAria')
                : keypadKey === '.'
                  ? t('keypad.decimalAria')
                  : keypadKey
            }
          >
            {keypadKey === 'back' ? <BackspaceIcon size={26} /> : keypadKey === '.' ? ',' : keypadKey}
          </button>
        );
      })}
    </div>
  );
}
