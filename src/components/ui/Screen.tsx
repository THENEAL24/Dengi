import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  title: string;
  children: ReactNode;
  /** Кнопка справа в шапке */
  action?: ReactNode;
  /** Подзаголовок под large title */
  subtitle?: ReactNode;
  /** Оставить место под tab bar (по умолчанию да) */
  withTabBar?: boolean;
};

export function Screen({ title, children, action, subtitle, withTabBar = true }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [titleHidden, setTitleHidden] = useState(false);
  const raf = useRef(0);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
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
          <div className="flex items-center gap-2">{action}</div>
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
          paddingTop: 'calc(var(--safe-top) + 44px)',
          paddingBottom: withTabBar
            ? 'calc(var(--tabbar-height) + var(--safe-bottom) + 28px)'
            : 'calc(var(--safe-bottom) + 28px)',
        }}
      >
        <div className="px-[var(--page-gutter)] pt-1 pb-3">
          <h1 className="text-[34px] leading-tight font-bold tracking-[-0.035em]">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[15px] text-[var(--label-secondary)]">{subtitle}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
