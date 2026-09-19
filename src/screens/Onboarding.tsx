import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AmountDisplay } from '@/components/AmountDisplay';
import { Keypad } from '@/components/Keypad';
import { Button } from '@/components/ui/Button';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { completeOnboarding } from '@/db/repo';
import { dailyRateFor } from '@/lib/budget';
import { cn } from '@/lib/cn';
import { dayOf, daysInMonth, fullDate, monthIdOf, monthStartIso, todayIso } from '@/lib/date';
import { pluralDays } from '@/lib/plural';
import { formatMoney, keypadToMinor } from '@/lib/money';

const CURRENCY = 'RUB';
const STEPS = 5;

type StartMode = 'today' | 'monthStart' | 'custom';

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [limit, setLimit] = useState('');
  const [savings, setSavings] = useState('');
  const [startMode, setStartMode] = useState<StartMode>('today');
  const [customDate, setCustomDate] = useState(todayIso());
  const [opening, setOpening] = useState('');
  const [openingSign, setOpeningSign] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);

  const today = todayIso();
  const startDate =
    startMode === 'today' ? today : startMode === 'monthStart' ? monthStartIso(monthIdOf(today)) : customDate;

  const limitMinor = keypadToMinor(limit);
  const savingsMinor = keypadToMinor(savings);
  const openingMinor = keypadToMinor(opening) * openingSign;

  const accrualDays = useMemo(() => {
    const monthId = monthIdOf(startDate);
    return daysInMonth(monthId) - dayOf(startDate) + 1;
  }, [startDate]);

  const dailyRate = useMemo(
    () => dailyRateFor(limitMinor, monthIdOf(startDate), dayOf(startDate)),
    [limitMinor, startDate],
  );

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding({
        monthlyLimitMinor: limitMinor,
        savingsMinor,
        startDate,
        openingBalanceMinor: openingMinor,
        currency: CURRENCY,
      });
    } finally {
      setSaving(false);
    }
  };

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
          aria-label="Назад"
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
        <div className="size-9" />
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
              title="Сколько можно тратить в месяц?"
              hint="Это фиксированная сумма на месяц. Приложение разделит её по дням и будет ежедневно пополнять бюджет."
              footer={
                <Button size="lg" full disabled={limitMinor <= 0} onClick={() => go(1)}>
                  Далее
                </Button>
              }
            >
              <AmountDisplay digits={limit} currency={CURRENCY} />
              <p className="mt-3 text-center text-[15px] text-[var(--label-secondary)]">
                {limitMinor > 0
                  ? `≈ ${formatMoney(dailyRate, CURRENCY, { cents: false })} в день`
                  : 'Например, 60 000'}
              </p>
              <Keypad value={limit} onChange={setLimit} className="mt-auto" />
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              title="Сколько уже накоплено?"
              hint="Копилка живёт отдельно от месячного бюджета. В конце месяца остаток можно отправлять туда, а перерасход — покрывать из неё."
              footer={
                <Button size="lg" full onClick={() => go(2)}>
                  {savingsMinor > 0 ? 'Далее' : 'Пропустить'}
                </Button>
              }
            >
              <AmountDisplay digits={savings} currency={CURRENCY} />
              <p className="mt-3 text-center text-[15px] text-[var(--label-secondary)]">
                Можно оставить ноль и заполнить позже
              </p>
              <Keypad value={savings} onChange={setSavings} className="mt-auto" />
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="С какого дня начинаем?"
              hint="От этой даты считается дневная норма первого месяца."
              footer={
                <Button size="lg" full onClick={() => go(3)}>
                  Далее
                </Button>
              }
            >
              <div className="space-y-2">
                <OptionRow
                  label="С сегодня"
                  value={fullDate(today)}
                  active={startMode === 'today'}
                  onClick={() => setStartMode('today')}
                />
                <OptionRow
                  label="С начала месяца"
                  value={fullDate(monthStartIso(monthIdOf(today)))}
                  active={startMode === 'monthStart'}
                  onClick={() => setStartMode('monthStart')}
                />
                <OptionRow
                  label="Своя дата"
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

              <div className="glass mt-4 rounded-[var(--radius-card)] p-4">
                <p className="text-[15px] text-[var(--label-secondary)]">
                  {formatMoney(limitMinor, CURRENCY, { cents: false })} на {pluralDays(accrualDays)}
                </p>
                <p className="money mt-1 text-[28px] font-bold">
                  {formatMoney(dailyRate, CURRENCY, { cents: false })}
                  <span className="ml-1.5 text-[15px] font-normal text-[var(--label-secondary)]">
                    в день
                  </span>
                </p>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title="Есть остаток за этот месяц?"
              hint="Если ты уже что-то откладывал или перетратил до начала учёта — укажи это здесь. Иначе просто пропусти."
              footer={
                <Button size="lg" full onClick={() => go(4)}>
                  {openingMinor !== 0 ? 'Далее' : 'Пропустить'}
                </Button>
              }
            >
              <AmountDisplay
                digits={opening}
                currency={CURRENCY}
                className={openingSign === -1 ? 'text-[var(--negative)]' : undefined}
              />
              <div className="mt-4 flex justify-center gap-2">
                <SignButton
                  active={openingSign === 1}
                  onClick={() => setOpeningSign(1)}
                  label="В плюс"
                />
                <SignButton
                  active={openingSign === -1}
                  onClick={() => setOpeningSign(-1)}
                  label="В минус"
                />
              </div>
              <Keypad value={opening} onChange={setOpening} className="mt-auto" />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              title="Всё готово"
              hint="Проверь настройки — потом их можно поменять в любой момент."
              footer={
                <Button size="lg" full disabled={saving} onClick={finish}>
                  {saving ? 'Создаём…' : 'Начать'}
                </Button>
              }
            >
              <div className="glass space-y-0 overflow-hidden rounded-[var(--radius-card)]">
                <SummaryRow label="Лимит на месяц" value={formatMoney(limitMinor, CURRENCY)} />
                <SummaryRow
                  label="Норма в день"
                  value={formatMoney(dailyRate, CURRENCY, { cents: false })}
                />
                <SummaryRow label="Копилка" value={formatMoney(savingsMinor, CURRENCY)} />
                <SummaryRow label="Старт" value={fullDate(startDate)} />
                {openingMinor !== 0 && (
                  <SummaryRow
                    label="Начальный остаток"
                    value={formatMoney(openingMinor, CURRENCY, { signed: true })}
                  />
                )}
                <SummaryRow label="Дней в первом месяце" value={pluralDays(accrualDays)} last />
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
  children,
  footer,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-[var(--page-gutter)]">
      <h1 className="pt-3 text-[30px] leading-[1.15] font-bold tracking-[-0.035em]">{title}</h1>
      <p className="mt-2 text-[15px] leading-snug text-[var(--label-secondary)]">{hint}</p>
      <div className="mt-6 flex min-h-0 flex-1 flex-col">{children}</div>
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
        'glass flex w-full items-center justify-between rounded-[var(--radius-control)] px-4 py-3 text-left',
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
    <div
      className={cn('flex items-center justify-between px-4 py-3', !last && 'hairline-b')}
    >
      <span className="text-[16px] text-[var(--label-secondary)]">{label}</span>
      <span className="money text-[17px] font-semibold">{value}</span>
    </div>
  );
}
