import { useEffect, useMemo, useState } from 'react';
import { AmountDisplay } from './AmountDisplay';
import { Keypad } from './Keypad';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import type { MonthRecord, Settings } from '@/db/db';
import { applyDailyAccrual, resetDailyAccrual } from '@/db/balanceActions';
import { baseDailyFromLimit, effectiveDailyAccrual } from '@/lib/budget';
import { formatMoney, keypadToMinor, minorToKeypadDigits } from '@/lib/money';
import { useTranslation } from '@/state/I18nContext';

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  settings: Settings;
  month: MonthRecord;
};

export function DailyAccrualSheet({ open, onClose, currency, settings, month }: Props) {
  const { t } = useTranslation();
  const baseDaily = baseDailyFromLimit(month);
  const currentDaily = effectiveDailyAccrual(month, settings);
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDigits(minorToKeypadDigits(currentDaily, currency));
  }, [open, currentDaily, currency]);

  const dailyMinor = keypadToMinor(digits, currency);
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

  const limitFmt = formatMoney(month.limitMinor, currency, { cents: false });
  const baseFmt = formatMoney(baseDaily, currency, { cents: false });

  return (
    <Sheet open={open} onClose={onClose} title={t('dailyAccrual.title')}>
      <div className="px-4 pb-4">
        <p className="pb-3 text-[14px] leading-snug text-[var(--label-secondary)]">
          {t('dailyAccrual.intro', { limit: limitFmt, baseDaily: baseFmt })}
        </p>

        <AmountDisplay digits={digits} currency={currency} />
        <p className="mt-2 text-center text-[14px] text-[var(--label-secondary)]">
          {t('dailyAccrual.perDayLabel')}
        </p>

        <Keypad value={digits} onChange={setDigits} currency={currency} className="mt-3" />

        <div className="glass mt-4 space-y-2 rounded-[var(--radius-card)] p-4 text-[15px]">
          <Row
            label={t('dailyAccrual.toSavingsDay')}
            value={formatMoney(toSavings, currency, { cents: false })}
            accent={toSavings > 0}
          />
          <Row
            label={t('dailyAccrual.availableMonth')}
            value={formatMoney(monthAvailable, currency, { cents: false })}
          />
          <Row
            label={t('dailyAccrual.toSavingsMonth')}
            value={formatMoney(monthSavings, currency, { cents: false })}
          />
        </div>

        {dailyMinor > baseDaily && (
          <p className="mt-3 text-center text-[14px] text-[var(--ios-orange)]">
            {t('dailyAccrual.aboveBase', { baseDaily: baseFmt })}
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
              {t('common.reset')}
            </Button>
          )}
          <Button size="lg" full disabled={busy || dailyMinor <= 0} onClick={save}>
            {t('common.save')}
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
