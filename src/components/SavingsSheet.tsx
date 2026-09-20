import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AmountSheet } from './AmountSheet';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { TrashIcon } from './ui/icons';
import type { SavingsKind } from '@/db/db';
import { addSavings, deleteSavings, listSavings } from '@/db/repo';
import { cn } from '@/lib/cn';
import { fullDate, todayIso } from '@/lib/date';
import { formatMoney } from '@/lib/money';

const kindLabels: Record<SavingsKind, string> = {
  initial: 'Начальная сумма',
  rollover: 'Остаток месяца',
  cover: 'Покрытие перерасхода',
  manual: 'Вручную',
  from_budget: 'Из доступных',
  to_budget: 'В доступные',
  auto_daily: 'Автоотложение',
};

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  totalMinor: number;
  balanceMinor?: number;
  onTransferFromSavings?: () => void;
  onTransferToSavings?: () => void;
};

export function SavingsSheet({
  open,
  onClose,
  currency,
  totalMinor,
  balanceMinor,
  onTransferFromSavings,
  onTransferToSavings,
}: Props) {
  const entries = useLiveQuery(() => listSavings(), [], []);
  const [amountOpen, setAmountOpen] = useState(false);

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Копилка"
        action={
          <button
            type="button"
            onClick={onClose}
            className="text-[17px] font-semibold text-[var(--link)]"
          >
            Готово
          </button>
        }
        className="max-h-[86dvh]"
      >
        <div className="px-4 pb-2">
          <p className="money text-center text-[40px] leading-none font-bold">
            {formatMoney(totalMinor, currency)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {onTransferToSavings && (
              <Button full variant="tinted" onClick={onTransferToSavings}>
                Из доступных
              </Button>
            )}
            {onTransferFromSavings && (
              <Button full variant="plain" onClick={onTransferFromSavings}>
                В доступные
              </Button>
            )}
          </div>

          <Button full variant="plain" className="mt-2" onClick={() => setAmountOpen(true)}>
            Пополнить или снять вручную
          </Button>

          {balanceMinor !== undefined && (
            <p className="mt-2 text-center text-[13px] text-[var(--label-tertiary)]">
              Доступно сейчас: {formatMoney(balanceMinor, currency, { cents: false, signed: true })}
            </p>
          )}

          <div className="scroll-y mt-4 max-h-[46dvh]">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-[15px] text-[var(--label-secondary)]">
                Операций пока нет
              </p>
            ) : (
              <div className="glass overflow-hidden rounded-[var(--radius-card)]">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5',
                      index < entries.length - 1 && 'hairline-b',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px]">{entry.note ?? kindLabels[entry.kind]}</p>
                      <p className="text-[13px] text-[var(--label-secondary)]">
                        {fullDate(entry.date)} · {kindLabels[entry.kind]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'money text-[16px] font-semibold',
                        entry.amountMinor < 0 && 'text-[var(--negative)]',
                      )}
                    >
                      {formatMoney(entry.amountMinor, currency, { signed: true })}
                    </span>
                    <button
                      type="button"
                      onClick={() => entry.id && void deleteSavings(entry.id)}
                      className="pressable grid size-8 place-items-center rounded-full text-[var(--label-tertiary)]"
                      aria-label="Удалить операцию"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Sheet>

      <AmountSheet
        open={amountOpen}
        onClose={() => setAmountOpen(false)}
        title="Операция с копилкой"
        hint="Пополнение или снятие не влияет на месячный бюджет — копилка живёт отдельно."
        currency={currency}
        signed
        submitLabel="Применить"
        onSubmit={(minor) =>
          addSavings({ date: todayIso(), amountMinor: minor, kind: 'manual' })
        }
      />
    </>
  );
}
