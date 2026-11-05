import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { updateSettings } from '@/db/repo';
import type { Locale } from '@/lib/i18n/locale';
import { useSettings } from '@/state/hooks';

type Props = {
  title: string;
  children: ReactNode;
  /** Кнопка справа в шапке (слева от переключателя языка) */
  action?: ReactNode;
  /** Переключатель RU / EN напротив large title */
  showLocaleSwitcher?: boolean;
  /** Подзаголовок под large title */
  subtitle?: ReactNode;
  /** Оставить место под tab bar (по умолчанию да) */
  withTabBar?: boolean;
  /** Меньше отступ сверху до large title (главный экран) */
  compactTop?: boolean;
};

export function Screen({
  title,
  children,
  action,
  showLocaleSwitcher = false,
  subtitle,
  withTabBar = true,
  compactTop = false,
}: Props) {
  const settingsQuery = useSettings();
  const storedLocale = settingsQuery?.value?.locale ?? 'ru';

  const [scrolled, setScrolled] = useState(false);
  const [titleHidden, setTitleHidden] = useState(false);
  const raf = useRef(0);

  return (
    <div className="relative flex h-dvh flex-col">
      <header
        className={cn(
          'absolute inset-x-0 top-0 z-30 transition-[background-color,box-shadow] duration-200',
          scrolled && 'glass-flat border-0 hairline-b',
        )}
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex h-11 items-center justify-between px-[var(--page-gutter)]">
          <span
            className={cn(
              'text-[17px] font-semibold tracking-[-0.02em] transition-opacity duration-200',
              titleHidden ? 'opacity-100' : 'opacity-0',
            )}
          >
            {title}
          </span>
          <div className="flex items-center gap-2">
            {action}
            {showLocaleSwitcher && titleHidden && (
              <LocaleSwitcher
                value={storedLocale}
                onChange={(locale: Locale) => void updateSettings({ locale })}
                layoutId="screen-locale-collapsed"
              />
            )}
          </div>
        </div>
      </header>

      <div
        className="scroll-y no-scrollbar flex-1"
        onScroll={(event) => {
          const top = event.currentTarget.scrollTop;
          cancelAnimationFrame(raf.current);
          raf.current = requestAnimationFrame(() => {
            setScrolled(top > 2);
            setTitleHidden(top > 38);
          });
        }}
        style={{
          paddingTop: compactTop ? 'calc(var(--safe-top) + 36px)' : 'calc(var(--safe-top) + 44px)',
          paddingBottom: withTabBar
            ? 'calc(var(--safe-bottom) + var(--tabbar-height) + 28px)'
            : 'calc(var(--safe-bottom) + 28px)',
        }}
      >
        <div
          className={cn(
            'px-[var(--page-gutter)] pb-3',
            compactTop ? 'pt-0 pb-2' : 'pt-1',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[34px] leading-tight font-bold tracking-[-0.035em]">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 text-[15px] text-[var(--label-secondary)]">{subtitle}</p>
              )}
            </div>
            {showLocaleSwitcher && !titleHidden && (
              <LocaleSwitcher
                className="shrink-0"
                value={storedLocale}
                onChange={(locale: Locale) => void updateSettings({ locale })}
                layoutId="screen-locale"
              />
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
