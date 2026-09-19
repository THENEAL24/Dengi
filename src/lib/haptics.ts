// iOS Safari не поддерживает navigator.vibrate, поэтому на iPhone это no-op,
// но работает на Android и не требует отдельных проверок в UI-коде.
type Strength = 'light' | 'medium' | 'success' | 'warning';

const patterns: Record<Strength, number | number[]> = {
  light: 8,
  medium: 16,
  success: [10, 40, 14],
  warning: [18, 60, 18],
};

export function haptic(strength: Strength = 'light'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(patterns[strength]);
  } catch {
    // вибрация недоступна — не повод ломать взаимодействие
  }
}
