import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';
import { ChartIcon, GearIcon, ListIcon, WalletIcon } from './icons';

export type TabKey = 'today' | 'history' | 'stats' | 'settings';

const tabs: Array<{ key: TabKey; label: string; Icon: typeof WalletIcon }> = [
  { key: 'today', label: 'Сегодня', Icon: WalletIcon },
  { key: 'history', label: 'История', Icon: ListIcon },
  { key: 'stats', label: 'Статистика', Icon: ChartIcon },
  { key: 'settings', label: 'Настройки', Icon: GearIcon },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar z-40 border-0 hairline-t">
      <div className="mx-auto flex h-[var(--tabbar-height)] max-w-[520px] items-stretch">
        {tabs.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (!isActive) haptic('light');
                onChange(key);
              }}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 transition-colors',
                isActive ? 'text-[var(--link)]' : 'text-[var(--label-tertiary)]',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={25} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
