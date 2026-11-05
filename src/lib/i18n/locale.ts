export type Locale = 'ru' | 'en';

export const DEFAULT_LOCALE: Locale = 'ru';

let activeLocale: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function intlLocale(): string {
  return activeLocale === 'en' ? 'en-US' : 'ru-RU';
}

export function localeLabel(locale: Locale): string {
  return locale === 'en' ? 'English' : 'Русский';
}

export function isLocale(value: string): value is Locale {
  return value === 'ru' || value === 'en';
}
