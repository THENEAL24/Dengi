import { enMessages } from './messages.en';
import { ruMessages } from './messages.ru';
import {
  DEFAULT_LOCALE,
  getActiveLocale,
  intlLocale,
  localeLabel,
  setActiveLocale,
  type Locale,
} from './locale';

export type { Locale };
export { DEFAULT_LOCALE, getActiveLocale, intlLocale, localeLabel, setActiveLocale };

export type TranslateParams = Record<string, string | number>;

const catalogs: Record<Locale, Record<string, string>> = {
  ru: ruMessages,
  en: enMessages,
};

export function translate(locale: Locale, key: string, params?: TranslateParams): string {
  const table = catalogs[locale] ?? ruMessages;
  let text = table[key] ?? ruMessages[key] ?? enMessages[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function createT(locale: Locale) {
  return (key: string, params?: TranslateParams) => translate(locale, key, params);
}

/** If message is an i18n key, translate it; otherwise return as-is. */
export function translateMaybe(locale: Locale, message: string): string {
  if (message.startsWith('error.') && (ruMessages[message] || enMessages[message])) {
    return translate(locale, message);
  }
  return message;
}
