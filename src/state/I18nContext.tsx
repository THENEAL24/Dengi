import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import {
  createT,
  DEFAULT_LOCALE,
  setActiveLocale,
  translate,
  type Locale,
  type TranslateParams,
} from '@/lib/i18n';
import { useSettings } from '@/state/hooks';

type I18nContextValue = {
  locale: Locale;
  t: (key: string, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const settingsQuery = useSettings();
  const locale: Locale = settingsQuery?.value?.locale ?? DEFAULT_LOCALE;

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      t: createT(locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Pass forcedLocale during onboarding before settings are saved. */
export function useTranslation(forcedLocale?: Locale) {
  const ctx = useContext(I18nContext);
  if (forcedLocale && forcedLocale !== ctx.locale) {
    return {
      locale: forcedLocale,
      t: createT(forcedLocale),
    };
  }
  return ctx;
}
