import { useEffect, useMemo, useState } from 'react';
import { AmountDisplay } from './AmountDisplay';
import { Keypad } from './Keypad';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import type { MonthRecord, Settings } from '@/db/db';
import { applyDailyAccrual, resetDailyAccrual } from '@/db/balanceActions';
import { baseDailyFromLimit, effectiveDailyAccrual } from '@/lib/budget';
import { formatMoney, keypadToMinor } from '@/lib/money';

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  settings: Settings;
  month: MonthRecord;
};

export function DailyAccrualSheet({ open, onClose, currency, settings, month }: Props) {
  const baseDaily = baseDailyFromLimit(month);
  const currentDaily = effectiveDailyAccrual(month, settings);
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDigits(String(Math.round(currentDaily / 100)));
  }, [open, currentDaily]);

  const dailyMinor = keypadToMinor(digits);
  const toSavings = Math.max(0, baseDaily - dailyMinor);
  const isCustom = dailyMinor !== baseDaily && dailyMinor > 0;

  const monthAvailable = useMemo(
    () => Math.round(dailyMinor * month.accrualDays),
    [dailyMinor, month.accrualDays],
  );

  const monthSavings = useMemo(
    () => Math.round(toSavings * month.accrualDays),
    [toSavings, month.accrualDays],
  );

  const save = async () => {
    if (dailyMinor <= 0) return;
    setBusy(true);
    try {
      if (dailyMinor === baseDaily) await resetDailyAccrual();
      else await applyDailyAccrual(dailyMinor);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Дневное начисление">
      <div className="px-4 pb-4">
        <p className="pb-3 text-[14px] leading-snug text-[var(--label-secondary)]">
          Из лимита {formatMoney(month.limitMinor, currency, { cents: false })} получается{' '}
          {formatMoney(baseDaily, currency, { cents: false })} в день. Задай, сколько из этого
          идёт на «Доступно» — остальное можно автоматически отправлять в копилку.
        </p>

        <AmountDisplay digits={digits} currency={currency} />
        <p className="mt-2 text-center text-[14px] text-[var(--label-secondary)]">
          на «Доступно» в день
        </p>

        <Keypad value={digits} onChange={setDigits} className="mt-3" />

        <div className="glass mt-4 space-y-2 rounded-[var(--radius-card)] p-4 text-[15px]">
          <Row
            label="В копилку в день"
            value={formatMoney(toSavings, currency, { cents: false })}
            accent={toSavings > 0}
          />
          <Row
            label="На «Доступно» за месяц"
            value={formatMoney(monthAvailable, currency, { cents: false })}
          />
          <Row
            label="В копилку за месяц"
            value={formatMoney(monthSavings, currency, { cents: false })}
          />
        </div>

        {dailyMinor > baseDaily && (
          <p className="mt-3 text-center text-[14px] text-[var(--ios-orange)]">
            Больше базовой нормы ({formatMoney(baseDaily, currency, { cents: false })}). Автоотложение
            из лимита будет нулевым.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {isCustom && (
            <Button
              variant="plain"
              full
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await resetDailyAccrual();
                  onClose();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Сбросить
            </Button>
          )}
          <Button size="lg" full disabled={busy || dailyMinor <= 0} onClick={save}>
            Сохранить
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--label-secondary)]">{label}</span>
      <span className={`money font-semibold ${accent ? 'text-[var(--ios-green)]' : ''}`}>
        {value}
      </span>
    </div>
  );
}
