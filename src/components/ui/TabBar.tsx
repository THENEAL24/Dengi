import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';
import { useTranslation } from '@/state/I18nContext';
import { ChartIcon, GearIcon, ListIcon, WalletIcon } from './icons';

export type TabKey = 'today' | 'history' | 'stats' | 'settings';

const tabs: Array<{ key: TabKey; labelKey: string; Icon: typeof WalletIcon }> = [
  { key: 'today', labelKey: 'tab.today', Icon: WalletIcon },
  { key: 'history', labelKey: 'tab.history', Icon: ListIcon },
  { key: 'stats', labelKey: 'tab.stats', Icon: ChartIcon },
  { key: 'settings', labelKey: 'tab.settings', Icon: GearIcon },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export function TabBar({ active, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <nav
      className="glass-flat fixed inset-x-0 bottom-0 z-40 border-0 hairline-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[var(--tabbar-height)] w-full max-w-[520px] items-stretch">
        {tabs.map(({ key, labelKey, Icon }) => {
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
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-3 transition-colors',
                isActive ? 'text-[var(--link)]' : 'text-[var(--label-tertiary)]',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={28} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[11px] font-medium tracking-tight">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
