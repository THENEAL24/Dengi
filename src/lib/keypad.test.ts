import { describe, expect, it } from 'vitest';
import { applyKeypadInput } from './keypad';
import { keypadDisplay, keypadToMinor } from './money';

describe('applyKeypadInput', () => {
  it('набирает целую часть', () => {
    let value = '';
    for (const key of ['1', '2', '5', '0'] as const) value = applyKeypadInput(value, key);
    expect(value).toBe('1250');
  });

  it('не плодит ведущие нули', () => {
    expect(applyKeypadInput('', '0')).toBe('0');
    expect(applyKeypadInput('0', '0')).toBe('0');
    expect(applyKeypadInput('0', '5')).toBe('5');
  });

  it('разделитель ставится один раз и перед ним подставляется ноль', () => {
    expect(applyKeypadInput('', '.')).toBe('0.');
    expect(applyKeypadInput('12', '.')).toBe('12.');
    expect(applyKeypadInput('12.', '.')).toBe('12.');
    expect(applyKeypadInput('12.5', '.')).toBe('12.5');
  });

  it('копеек не больше двух', () => {
    expect(applyKeypadInput('12.5', '7')).toBe('12.57');
    expect(applyKeypadInput('12.57', '9')).toBe('12.57');
  });

  it('стирает по одному символу', () => {
    expect(applyKeypadInput('12.5', 'back')).toBe('12.');
    expect(applyKeypadInput('12.', 'back')).toBe('12');
    expect(applyKeypadInput('', 'back')).toBe('');
  });

  it('ограничивает длину целой части', () => {
    expect(applyKeypadInput('123456789', '1')).toBe('123456789');
  });
});

describe('перевод ввода в копейки', () => {
  it('считает и целые, и дробные суммы', () => {
    expect(keypadToMinor('')).toBe(0);
    expect(keypadToMinor('1250')).toBe(125_000);
    expect(keypadToMinor('12.5')).toBe(1250);
    expect(keypadToMinor('12.57')).toBe(1257);
    expect(keypadToMinor('0.05')).toBe(5);
  });

  it('показывает ввод с разделителями разрядов', () => {
    // Intl в ru-RU разделяет разряды неразрывным пробелом
    expect(keypadDisplay('')).toBe('0');
    expect(keypadDisplay('1250')).toBe('1\u00a0250');
    expect(keypadDisplay('12.')).toBe('12,');
    expect(keypadDisplay('12.5')).toBe('12,5');
  });
});
