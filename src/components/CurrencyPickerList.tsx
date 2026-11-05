import { cn } from '@/lib/cn';
import {
  CIS_CURRENCY_CODES,
  WORLD_CURRENCY_CODES,
  getCurrency,
  getCurrencyName,
  type CurrencyDef,
} from '@/lib/currencies';
import { haptic } from '@/lib/haptics';
import { useTranslation } from '@/state/I18nContext';
import { CheckIcon } from './ui/icons';

type Props = {
  value: string;
  onChange: (code: string) => void;
  className?: string;
};

export function CurrencyPickerList({ value, onChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('no-scrollbar min-h-0 flex-1 overflow-y-auto', className)}>
      <CurrencyGroup
        title={t('currency.group.cis')}
        codes={CIS_CURRENCY_CODES}
        value={value}
        onChange={onChange}
      />
      <CurrencyGroup
        title={t('currency.group.world')}
        codes={WORLD_CURRENCY_CODES}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function CurrencyGroup({
  title,
  codes,
  value,
  onChange,
}: {
  title: string;
  codes: string[];
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <section className="pb-3">
      <p className="px-1 pb-2 text-[13px] font-semibold tracking-wide text-[var(--label-tertiary)] uppercase">
        {title}
      </p>
      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        {codes.map((code, index) => (
          <CurrencyRow
            key={code}
            def={getCurrency(code)}
            active={code === value}
            last={index === codes.length - 1}
            onSelect={() => {
              haptic('light');
              onChange(code);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function CurrencyRow({
  def,
  active,
  last,
  onSelect,
}: {
  def: CurrencyDef;
  active: boolean;
  last: boolean;
  onSelect: () => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        !last && 'hairline-b',
        active && 'bg-[var(--fill-secondary)]',
      )}
    >
      <span className="text-[26px] leading-none" aria-hidden>
        {def.flag}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-medium">{getCurrencyName(def.code, locale)}</span>
        <span className="block text-[14px] text-[var(--label-secondary)]">
          {def.code} · {def.symbol}
          {def.decimals === 2 ? t('currency.preciseInput') : ''}
        </span>
      </span>
      {active && <CheckIcon size={20} className="shrink-0 text-[var(--link)]" />}
    </button>
  );
}
