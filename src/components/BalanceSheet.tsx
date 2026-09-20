import { useState } from 'react';
import { AmountSheet } from './AmountSheet';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { topUpAvailable, transferFromSavings, transferToSavings } from '@/db/balanceActions';
import { formatMoney } from '@/lib/money';

type Mode = 'to_savings' | 'from_savings' | 'topup';

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  balanceMinor: number;
  savingsMinor: number;
};

const modes: Array<{ id: Mode; label: string; hint: string }> = [
  {
    id: 'to_savings',
    label: 'В копилку',
    hint: 'Перевести из доступных в копилку. Сумма сразу уменьшит «Доступно».',
  },
  {
    id: 'from_savings',
    label: 'Из копилки',
    hint: 'Перевести из копилки в доступные. Можно потратить сразу.',
  },
  {
    id: 'topup',
    label: 'Пополнить',
    hint: 'Добавить к «Доступно» сверх лимита — например, если пришли деньги.',
  },
];

export function BalanceSheet({ open, onClose, currency, balanceMinor, savingsMinor }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(cause instanceof Error ? cause.message : 'Не удалось выполнить операцию');
    }
  };

  return (
    <>
      <Sheet
        open={open && mode === null}
        onClose={onClose}
        title="Доступные средства"
        className="max-h-[80dvh]"
      >
        <div className="px-4 pb-4">
          <div className="glass rounded-[var(--radius-card)] p-4 text-center">
            <p className="text-[13px] text-[var(--label-secondary)]">Сейчас доступно</p>
            <p className="money mt-1 text-[36px] font-bold">
              {formatMoney(balanceMinor, currency, { cents: false, signed: true })}
            </p>
            <p className="mt-2 text-[14px] text-[var(--label-secondary)]">
              Копилка: {formatMoney(savingsMinor, currency, { cents: false })}
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
        submitLabel="Применить"
        onSubmit={submit}
      />
    </>
  );
}
