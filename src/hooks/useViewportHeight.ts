import { useEffect } from 'react';

/** iOS PWA: window.innerHeight надёжнее 100dvh/svh — убирает чёрную полосу под tab bar. */
export function useViewportHeight(): void {
  useEffect(() => {
    const apply = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    apply();
    window.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);

    return () => {
      window.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
    };
  }, []);
}
