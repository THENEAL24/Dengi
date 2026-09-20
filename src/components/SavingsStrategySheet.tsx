import { useEffect, useState } from 'react';
import { AmountSheet } from './AmountSheet';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { CheckIcon } from './ui/icons';
import type { MonthRecord, SavingsStrategy, Settings } from '@/db/db';
import { updateSettings } from '@/db/repo';
import {
  previewStrategy,
  smartDailySavingsRate,
  strategyLabel,
  type StrategyPreview,
} from '@/lib/savings-strategy';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

const STRATEGIES: SavingsStrategy[] = ['remainder', 'smart', 'fixed', 'goal', 'manual'];

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  settings: Settings;
  month: MonthRecord;
  savingsMinor: number;
};

export function SavingsStrategySheet({
  open,
  onClose,
  currency,
  settings,
  month,
  savingsMinor,
}: Props) {
  const [previews, setPreviews] = useState<Partial<Record<SavingsStrategy, StrategyPreview>>>({});
  const [fixedOpen, setFixedOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [smartHint, setSmartHint] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const next: Partial<Record<SavingsStrategy, StrategyPreview>> = {};
      for (const strategy of STRATEGIES) {
        next[strategy] = await previewStrategy(strategy, month, settings, savingsMinor);
      }
      setPreviews(next);
      setSmartHint(await smartDailySavingsRate());
    })();
  }, [open, month, settings, savingsMinor]);

  const activePreview = previews[settings.savingsStrategy];

  const pick = async (strategy: SavingsStrategy) => {
    if (strategy === 'fixed') {
      setFixedOpen(true);
      return;
    }
    if (strategy === 'goal') {
      setGoalOpen(true);
      return;
    }
    await updateSettings({ savingsStrategy: strategy });
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Стратегия откладывания" className="max-h-[88dvh]">
        <div className="scroll-y max-h-[72dvh] px-4 pb-4">
          <p className="pb-3 text-[14px] leading-snug text-[var(--label-secondary)]">
            Каждый день приложение может автоматически пополнять копилку. Стратегия «Остаток от
            лимита» работает вместе с настройкой дневного начисления на «Доступно».
          </p>

          {smartHint !== null && smartHint > 0 && (
            <div className="glass mb-3 rounded-[var(--radius-card)] p-3 text-[14px] text-[var(--label-secondary)]">
              По закрытым месяцам в среднем оставалось{' '}
              <span className="money font-semibold text-[var(--label-primary)]">
                {formatMoney(smartHint, currency, { cents: false })}
              </span>{' '}
              в день — можно использовать стратегию «По истории трат».
            </div>
          )}

          <div className="glass overflow-hidden rounded-[var(--radius-card)]">
            {STRATEGIES.map((strategy, index) => {
              const preview = previews[strategy];
              const active = settings.savingsStrategy === strategy;
              return (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => void pick(strategy)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left',
                    index < STRATEGIES.length - 1 && 'hairline-b',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-medium">{strategyLabel(strategy)}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--label-secondary)]">
                      {preview?.description}
                    </p>
                    {preview && preview.dailyMinor > 0 && (
                      <p className="money mt-1 text-[15px] font-semibold text-[var(--ios-green)]">
                        ≈ {formatMoney(preview.dailyMinor, currency, { cents: false })}/день ·{' '}
                        {formatMoney(preview.monthlyMinor, currency, { cents: false })}/мес
                      </p>
                    )}
                  </div>
                  {active && <CheckIcon size={18} className="mt-1 shrink-0 text-[var(--link)]" />}
                </button>
              );
            })}
          </div>

          {activePreview && activePreview.dailyMinor > 0 && (
            <p className="mt-3 text-center text-[13px] text-[var(--label-tertiary)]">
              Автоотложение начисляется при открытии приложения за каждый прошедший день.
            </p>
          )}

          <Button full variant="plain" className="mt-4" onClick={onClose}>
            Готово
          </Button>
        </div>
      </Sheet>

      <AmountSheet
        open={fixedOpen}
        onClose={() => setFixedOpen(false)}
        title="Фиксированная сумма в день"
        hint="Столько будет уходить в копилку каждый день автоматически."
        currency={currency}
        initialMinor={settings.fixedDailySavingsMinor ?? 0}
        onSubmit={async (minor) => {
          if (minor <= 0) return;
          await updateSettings({ savingsStrategy: 'fixed', fixedDailySavingsMinor: minor });
        }}
      />

      <AmountSheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Цель накопления"
        hint={`Сейчас в копилке ${formatMoney(savingsMinor, currency, { cents: false })}. Укажи цель — посчитаем дневную сумму на ${settings.savingsGoalMonths ?? 12} мес.`}
        currency={currency}
        initialMinor={settings.savingsGoalMinor ?? 0}
        onSubmit={async (minor) => {
          if (minor <= 0) return;
          await updateSettings({ savingsStrategy: 'goal', savingsGoalMinor: minor });
        }}
      />
    </>
  );
}
