import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';
import { applyKeypadInput, type KeypadKey } from '@/lib/keypad';
import { BackspaceIcon } from './ui/icons';

type Props = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

const keys: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

export function Keypad({ value, onChange, className }: Props) {
  return (
    <div className={cn('grid grid-cols-3 gap-1.5', className)}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            haptic('light');
            onChange(applyKeypadInput(value, key));
          }}
          onContextMenu={(event) => event.preventDefault()}
          className={cn(
            'money flex h-[58px] items-center justify-center rounded-[16px] text-[27px] font-medium',
            'transition-[background-color,transform] duration-100 active:scale-95 active:bg-[var(--fill-secondary)]',
            key === 'back' && 'text-[var(--label-secondary)]',
          )}
          aria-label={key === 'back' ? 'Удалить' : key === '.' ? 'Запятая' : key}
        >
          {key === 'back' ? <BackspaceIcon size={26} /> : key === '.' ? ',' : key}
        </button>
      ))}
    </div>
  );
}
