/** Ввод суммы хранится строкой вида '1234' или '1234.5' — так проще не терять
 *  ведущий ноль дробной части и не воевать с float. */

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const MAX_WHOLE_DIGITS = 9;

export function applyKeypadInput(
  current: string,
  key: KeypadKey,
  maxFractionDigits: 0 | 2 = 2,
): string {
  if (key === 'back') return current.slice(0, -1);

  if (key === '.') {
    if (maxFractionDigits === 0) return current;
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }

  const [whole, fraction] = current.split('.');
  const hasFraction = current.includes('.');

  if (hasFraction) {
    if (maxFractionDigits === 0) return current;
    if ((fraction ?? '').length >= maxFractionDigits) return current;
    return `${current}${key}`;
  }

  if (whole === '0') return key === '0' ? '0' : key;
  if (whole.length >= MAX_WHOLE_DIGITS) return current;
  return `${current}${key}`;
}
