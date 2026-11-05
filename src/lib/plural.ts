import { getActiveLocale, translate, type Locale } from '@/lib/i18n';

/** Русские склонения: [1, 2-4, 5-0] */
export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function pluralForms(kind: 'day' | 'tx' | 'topUp', locale: Locale): [string, string, string] {
  return [
    translate(locale, `plural.${kind}.one`),
    translate(locale, `plural.${kind}.few`),
    translate(locale, `plural.${kind}.many`),
  ];
}

export function pluralDays(count: number, locale = getActiveLocale()): string {
  if (locale === 'en') return count === 1 ? `${count} day` : `${count} days`;
  return `${count} ${plural(count, pluralForms('day', locale))}`;
}

export function pluralTx(count: number, locale = getActiveLocale()): string {
  if (locale === 'en') return count === 1 ? `${count} expense` : `${count} expenses`;
  return `${count} ${plural(count, pluralForms('tx', locale))}`;
}

export function pluralTopUp(count: number, locale = getActiveLocale()): string {
  if (locale === 'en') return count === 1 ? `${count} top-up` : `${count} top-ups`;
  return `${count} ${plural(count, pluralForms('topUp', locale))}`;
}
