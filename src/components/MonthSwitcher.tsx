import { ChevronLeftIcon, ChevronRightIcon } from './ui/icons';
import { cn } from '@/lib/cn';
import { monthTitle } from '@/lib/date';
import { haptic } from '@/lib/haptics';

type Props = {
  monthId: string;
  /** Месяцы от новых к старым */
  monthIds: string[];
  onChange: (monthId: string) => void;
};

export function MonthSwitcher({ monthId, monthIds, onChange }: Props) {
  const index = monthIds.indexOf(monthId);
  const hasOlder = index >= 0 && index < monthIds.length - 1;
  const hasNewer = index > 0;

  const step = (delta: number) => {
    const next = monthIds[index + delta];
    if (!next) return;
    haptic('light');
    onChange(next);
  };

  return (
    <div className="flex items-center justify-between px-[var(--page-gutter)] pb-2">
      <ArrowButton disabled={!hasOlder} onClick={() => step(1)} label="Предыдущий месяц">
        <ChevronLeftIcon size={20} />
      </ArrowButton>
      <span className="text-[17px] font-semibold">{monthTitle(monthId)}</span>
      <ArrowButton disabled={!hasNewer} onClick={() => step(-1)} label="Следующий месяц">
        <ChevronRightIcon size={20} />
      </ArrowButton>
    </div>
  );
}

function ArrowButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={cn(
        'glass pressable grid size-9 place-items-center rounded-full',
        disabled ? 'opacity-30' : 'text-[var(--link)]',
      )}
    >
      {children}
    </button>
  );
}
