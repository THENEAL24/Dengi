import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AmountDisplay } from '@/components/AmountDisplay';
import { CurrencyPickerList } from '@/components/CurrencyPickerList';
import { Keypad } from '@/components/Keypad';
import { Button } from '@/components/ui/Button';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { completeOnboarding } from '@/db/repo';
import { allowanceFor, dailyRateFor } from '@/lib/budget';
import { cn } from '@/lib/cn';
import { getCurrency } from '@/lib/currencies';
import { dayOf, daysInMonth, fullDate, monthIdOf, todayIso } from '@/lib/date';
import { pluralDays } from '@/lib/plural';
import { formatMoney, keypadToMinor } from '@/lib/money';
import { useTranslation } from '@/state/I18nContext';
import { setActiveLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/locale';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';

const STEPS = 7;

type StartMode = 'today' | 'custom';

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [locale, setLocale] = useState<Locale>('ru');
  const { t } = useTranslation(locale);
  const [currency, setCurrency] = useState('RUB');
  const [limit, setLimit] = useState('');
  const [savings, setSavings] = useState('');
  const [startMode, setStartMode] = useState<StartMode>('today');
  const [customDate, setCustomDate] = useState(todayIso());
  const [opening, setOpening] = useState('');
  const [openingSign, setOpeningSign] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);

  const today = todayIso();
  const startDate = startMode === 'today' ? today : customDate;
  const currencyMeta = getCurrency(currency);

  const limitMinor = keypadToMinor(limit, currency);
  const savingsMinor = keypadToMinor(savings, currency);
  const openingMinor = keypadToMinor(opening, currency) * openingSign;

  const accrualDays = useMemo(() => {
    const monthId = monthIdOf(startDate);
    return daysInMonth(monthId) - dayOf(startDate) + 1;
  }, [startDate]);

  const dailyRate = useMemo(
    () => dailyRateFor(limitMinor, monthIdOf(startDate)),
    [limitMinor, startDate],
  );

  const firstMonthAllowance = useMemo(
    () => allowanceFor(limitMinor, monthIdOf(startDate), dayOf(startDate)),
    [limitMinor, startDate],
  );

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding({
        monthlyLimitMinor: limitMinor,
        savingsMinor,
        startDate,
        openingBalanceMinor: openingMinor,
        currency,
        locale,
      });
    } finally {
      setSaving(false);
    }
  };

  const localeSwitcher = (
    <LocaleSwitcher value={locale} onChange={setLocale} layoutId="onboarding-locale" />
  );

  return (
    <div className="flex h-dvh flex-col" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <div className="flex items-center gap-3 px-[var(--page-gutter)] pb-2">
        <button
          type="button"
          onClick={() => go(Math.max(0, step - 1))}
          className={cn(
            'pressable -ml-2 grid size-9 place-items-center rounded-full',
            step === 0 && 'pointer-events-none opacity-0',
          )}
          aria-label={t('common.back')}
        >
          <ChevronLeftIcon size={22} className="text-[var(--link)]" />
        </button>
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: STEPS }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-[3px] flex-1 rounded-full transition-colors duration-300',
                index <= step ? 'bg-[var(--link)]' : 'bg-[var(--fill-secondary)]',
              )}
            />
          ))}
        </div>
        <div className="size-9 shrink-0" />
      </div>

      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <motion.div
          key={step}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -28 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        >
          {step === 0 && (
            <StepShell
              titleTrailing={localeSwitcher}
              title={t('app.name')}
              center
              footer={
                <Button size="lg" full onClick={() => go(1)}>
                  {t('common.continue')}
                </Button>
              }
            >
              <div className="flex flex-col items-center text-center">
                <p className="text-[13px] font-medium tracking-wide text-[var(--label-secondary)] uppercase">
                  {t('app.available')}
                </p>
                <p className="money mt-2 text-[56px] leading-none font-bold tracking-tight text-[var(--label)]">
                  1&nbsp;234&nbsp;₽
                </p>
                <p className="mt-6 max-w-[300px] text-[17px] leading-snug text-[var(--label-secondary)]">
                  {t('onboarding.intro')}
                </p>
                <ul className="mt-8 w-full max-w-[320px] space-y-3 text-left text-[15px] text-[var(--label-secondary)]">
                  <li className="flex gap-3">
                    <span className="text-[var(--link)]">·</span>
                    <span>{t('onboarding.bullet.expenses')}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[var(--link)]">·</span>
                    <span>{t('onboarding.bullet.savings')}</span>
                  </li>
                </ul>
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              title={t('currency.label')}
              hint={t('onboarding.currencyHint')}
              compactBody
              footer={
                <Button size="lg" full onClick={() => go(2)}>
                  {t('common.continue')}
                </Button>
              }
            >
              <CurrencyPickerList value={currency} onChange={setCurrency} className="-mx-1 px-1" />
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title={t('settings.monthlyLimit')}
              hint={t('onboarding.limitHint')}
              footer={
                <Button size="lg" full disabled={limitMinor <= 0} onClick={() => go(3)}>
                  {t('common.continue')}
                </Button>
              }
            >
              <AmountDisplay digits={limit} currency={currency} />
              <p className="mt-3 text-center text-[15px] text-[var(--label-secondary)]">
                {limitMinor > 0
                  ? t('onboarding.dailyApprox', { amount: formatMoney(dailyRate, currency, { cents: 'auto' }) })
                  : currency === 'RUB'
                    ? t('onboarding.limitExampleRub')
                    : currency === 'USD'
                      ? t('onboarding.limitExampleUsd')
                      : t('onboarding.enterAmount')}
              </p>
              <Keypad value={limit} onChange={setLimit} currency={currency} className="mt-auto" />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title={t('settings.savings')}
              hint={t('onboarding.savingsHint')}
              footer={
                <Button size="lg" full onClick={() => go(4)}>
                  {savingsMinor > 0 ? t('common.continue') : t('common.skip')}
                </Button>
              }
            >
              <AmountDisplay digits={savings} currency={currency} />
              <Keypad value={savings} onChange={setSavings} currency={currency} className="mt-auto" />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              title={t('onboarding.startDayTitle')}
              hint={t('onboarding.startHint')}
              footer={
                <Button size="lg" full onClick={() => go(5)}>
                  {t('common.continue')}
                </Button>
              }
            >
              <div className="space-y-2">
                <OptionRow
                  label={t('onboarding.fromToday')}
                  value={fullDate(today)}
                  active={startMode === 'today'}
                  onClick={() => setStartMode('today')}
                />
                <OptionRow
                  label={t('onboarding.otherDate')}
                  active={startMode === 'custom'}
                  onClick={() => setStartMode('custom')}
                  value={
                    <input
                      type="date"
                      value={customDate}
                      max={today}
                      onChange={(event) => {
                        setCustomDate(event.target.value || today);
                        setStartMode('custom');
                      }}
                      className="rounded-[10px] bg-[var(--fill-tertiary)] px-2 py-1 text-[15px]"
                    />
                  }
                />
              </div>

              {limitMinor > 0 && (
                <div className="glass mt-4 rounded-[var(--radius-card)] p-4">
                  <p className="money text-[28px] font-bold">
                    {formatMoney(dailyRate, currency, { cents: 'auto' })}
                    <span className="ml-1.5 text-[15px] font-normal text-[var(--label-secondary)]">
                      {t('money.perDay')}
                    </span>
                  </p>
                  <p className="mt-2 text-[14px] text-[var(--label-secondary)]">
                    {t('onboarding.untilMonthEnd', {
                      amount: formatMoney(firstMonthAllowance, currency, { cents: 'auto' }),
                      days: pluralDays(accrualDays),
                    })}
                  </p>
                </div>
              )}
            </StepShell>
          )}

          {step === 5 && (
            <StepShell
              title={t('onboarding.openingMonthTitle')}
              hint={t('onboarding.openingHint')}
              footer={
                <Button size="lg" full onClick={() => go(6)}>
                  {openingMinor !== 0 ? t('common.continue') : t('common.skip')}
                </Button>
              }
            >
              <AmountDisplay
                digits={opening}
                currency={currency}
                className={openingSign === -1 ? 'text-[var(--negative)]' : undefined}
              />
              <div className="mt-4 flex justify-center gap-2">
                <SignButton active={openingSign === 1} onClick={() => setOpeningSign(1)} label={t('onboarding.inPlus')} />
                <SignButton
                  active={openingSign === -1}
                  onClick={() => setOpeningSign(-1)}
                  label={t('onboarding.inMinus')}
                />
              </div>
              <Keypad value={opening} onChange={setOpening} currency={currency} className="mt-auto" />
            </StepShell>
          )}

          {step === 6 && (
            <StepShell
              title={t('common.done')}
              footer={
                <Button size="lg" full disabled={saving} onClick={finish}>
                  {saving ? t('common.wait') : t('onboarding.openApp')}
                </Button>
              }
            >
              <div className="glass space-y-0 overflow-hidden rounded-[var(--radius-card)]">
                <SummaryRow
                  label={t('onboarding.summary.currency')}
                  value={`${currencyMeta.flag} ${currency}`}
                />
                <SummaryRow
                  label={t('onboarding.summary.limit')}
                  value={formatMoney(limitMinor, currency, { cents: 'auto' })}
                />
                <SummaryRow
                  label={t('onboarding.summary.daily')}
                  value={formatMoney(dailyRate, currency, { cents: 'auto' })}
                />
                <SummaryRow
                  label={t('onboarding.summary.savings')}
                  value={formatMoney(savingsMinor, currency, { cents: 'auto' })}
                />
                <SummaryRow
                  label={t('onboarding.summary.start')}
                  value={fullDate(startDate)}
                  last={openingMinor === 0}
                />
                {openingMinor !== 0 && (
                  <SummaryRow
                    label={t('onboarding.summary.opening')}
                    value={formatMoney(openingMinor, currency, { cents: 'auto' })}
                    last
                  />
                )}
              </div>
            </StepShell>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepShell({
  title,
  hint,
  titleTrailing,
  children,
  footer,
  compactBody,
  center,
}: {
  title: string;
  hint?: string;
  titleTrailing?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  compactBody?: boolean;
  center?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-[var(--page-gutter)]">
      <div className="flex items-start justify-between gap-3 pt-3">
        <h1 className="min-w-0 flex-1 text-[34px] leading-[1.1] font-bold tracking-[-0.04em]">
          {title}
        </h1>
        {titleTrailing}
      </div>
      {hint && (
        <p className="mt-2 text-[15px] leading-snug text-[var(--label-secondary)]">{hint}</p>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          hint ? 'mt-5' : 'mt-8',
          compactBody && 'overflow-hidden',
          center && 'justify-center pb-8',
        )}
      >
        {children}
      </div>
      <div className="pt-3 pb-[calc(var(--safe-bottom)+10px)]">{footer}</div>
    </div>
  );
}

function OptionRow({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value?: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'glass flex w-full items-center justify-between rounded-[var(--radius-control)] px-4 py-3.5 text-left',
        active && 'ring-2 ring-[var(--link)] ring-inset',
      )}
    >
      <span className="text-[17px] font-medium">{label}</span>
      <span className="text-[15px] text-[var(--label-secondary)]">{value}</span>
    </button>
  );
}

function SignButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pressable rounded-full px-4 py-2 text-[15px] font-semibold',
        active
          ? 'bg-[var(--link)] text-white'
          : 'bg-[var(--fill-tertiary)] text-[var(--label-secondary)]',
      )}
    >
      {label}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3.5', !last && 'hairline-b')}>
      <span className="text-[17px] text-[var(--label-secondary)]">{label}</span>
      <span className="money text-[17px] font-semibold">{value}</span>
    </div>
  );
}
