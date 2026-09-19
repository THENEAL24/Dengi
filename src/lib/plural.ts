/** Русские склонения: [1, 2-4, 5-0] */
export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function pluralDays(count: number): string {
  return `${count} ${plural(count, ['день', 'дня', 'дней'])}`;
}

export function pluralTx(count: number): string {
  return `${count} ${plural(count, ['трата', 'траты', 'трат'])}`;
}
