import { useMemo, useState } from 'react';
import { AmountSheet } from './AmountSheet';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { topUpAvailable, transferFromSavings, transferToSavings } from '@/db/balanceActions';
import { formatMoney } from '@/lib/money';
import { translateMaybe } from '@/lib/i18n';
import { useTranslation } from '@/state/I18nContext';

type Mode = 'to_savings' | 'from_savings' | 'topup';

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  balanceMinor: number;
  savingsMinor: number;
};

export function BalanceSheet({ open, onClose, currency, balanceMinor, savingsMinor }: Props) {
  const { t, locale } = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modes = useMemo(
    () =>
      [
        {
          id: 'to_savings' as const,
          label: t('balance.toSavings'),
          hint: t('balance.toSavingsHint'),
        },
        {
          id: 'from_savings' as const,
          label: t('balance.fromSavings'),
          hint: t('balance.fromSavingsHint'),
        },
        {
          id: 'topup' as const,
          label: t('balance.topUp'),
          hint: t('balance.topUpHint'),
        },
      ] as const,
    [t],
  );

  const active = modes.find((item) => item.id === mode);

  const submit = async (minor: number) => {
    setError(null);
    try {
      if (mode === 'to_savings') await transferToSavings(minor);
      else if (mode === 'from_savings') await transferFromSavings(minor);
      else if (mode === 'topup') await topUpAvailable(minor);
      setMode(null);
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'error.operationFailed';
      setError(translateMaybe(locale, message));
    }
  };

  return (
    <>
      <Sheet
        open={open && mode === null}
        onClose={onClose}
        title={t('balance.title')}
        className="max-h-[80dvh]"
      >
        <div className="px-4 pb-4">
          <div className="glass rounded-[var(--radius-card)] p-4 text-center">
            <p className="text-[13px] text-[var(--label-secondary)]">{t('balance.availableNow')}</p>
            <p className="money mt-1 text-[36px] font-bold">
              {formatMoney(balanceMinor, currency, { cents: 'auto', signed: true })}
            </p>
            <p className="mt-2 text-[14px] text-[var(--label-secondary)]">
              {t('balance.savingsLine', {
                amount: formatMoney(savingsMinor, currency, { cents: false }),
              })}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {modes.map((item) => (
              <Button
                key={item.id}
                full
                variant={item.id === 'to_savings' ? 'tinted' : 'plain'}
                onClick={() => {
                  setError(null);
                  setMode(item.id);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-center text-[14px] text-[var(--negative)]">{error}</p>
          )}
        </div>
      </Sheet>

      <AmountSheet
        open={mode !== null}
        onClose={() => setMode(null)}
        title={active?.label ?? ''}
        hint={active?.hint}
        currency={currency}
        submitLabel={t('common.apply')}
        onSubmit={submit}
      />
    </>
  );
}
