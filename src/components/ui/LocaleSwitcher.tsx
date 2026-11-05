import { motion } from 'motion/react';
import { flagEmoji } from '@/lib/currencies';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';
import type { Locale } from '@/lib/i18n/locale';
import { useTranslation } from '@/state/I18nContext';

const OPTIONS: Array<{ value: Locale; iso2: string; caption: string }> = [
  { value: 'ru', iso2: 'RU', caption: 'RU' },
  { value: 'en', iso2: 'GB', caption: 'EN' },
];

type Props = {
  value: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
  /** Для онбординга до сохранения настроек */
  layoutId?: string;
};

export function LocaleSwitcher({ value, onChange, className, layoutId = 'locale-switch' }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex gap-0.5 rounded-[12px] bg-[var(--fill-tertiary)] p-0.5',
        className,
      )}
      role="group"
      aria-label={t('language.label')}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (active) return;
              haptic('light');
              onChange(option.value);
            }}
            className="relative flex min-w-[38px] flex-col items-center rounded-[10px] px-1.5 py-1"
            aria-pressed={active}
            aria-label={
              option.value === 'ru' ? t('language.switchToRu') : t('language.switchToEn')
            }
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[10px] bg-[var(--surface-solid)] shadow-sm"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative text-[20px] leading-none" aria-hidden>
              {flagEmoji(option.iso2)}
            </span>
            <span
              className={cn(
                'relative mt-0.5 text-[9px] font-semibold tracking-wide uppercase',
                active ? 'text-[var(--label)]' : 'text-[var(--label-tertiary)]',
              )}
            >
              {option.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}
