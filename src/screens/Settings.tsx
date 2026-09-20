import { useRef, useState } from 'react';
import { AmountSheet } from '@/components/AmountSheet';
import { BalanceSheet } from '@/components/BalanceSheet';
import { CategoriesSheet } from '@/components/CategoriesSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { DailyAccrualSheet } from '@/components/DailyAccrualSheet';
import { SavingsSheet } from '@/components/SavingsSheet';
import { SavingsStrategySheet } from '@/components/SavingsStrategySheet';
import { List, ListRow } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { CheckIcon } from '@/components/ui/icons';
import type { Settings as SettingsRecord, Theme } from '@/db/db';
import {
  applyMonthlyLimit,
  exportSnapshot,
  importSnapshot,
  resetAll,
  updateSettings,
  type Snapshot,
} from '@/db/repo';
import { useCategories, useCurrentMonthView, useMonthRecord, useSavingsTotal } from '@/state/hooks';
import { cn } from '@/lib/cn';
import { currentMonthId, monthTitle, todayIso } from '@/lib/date';
import { strategyLabel } from '@/lib/savings-strategy';
import { pluralDays } from '@/lib/plural';
import { currencySymbol, formatMoney } from '@/lib/money';
import { haptic } from '@/lib/haptics';

const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'BYN', 'UAH', 'GEL', 'TRY', 'AMD', 'THB'];

type Props = { settings: SettingsRecord };

export function Settings({ settings }: Props) {
  const view = useCurrentMonthView();
  const month = useMonthRecord(currentMonthId());
  const savings = useSavingsTotal();
  const categories = useCategories();
  const fileInput = useRef<HTMLInputElement>(null);

  const [limitOpen, setLimitOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const currency = settings.currency;
  const math = view?.math;

  const exportData = async () => {
    const snapshot = await exportSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const fileName = `dengi-${todayIso()}.json`;
    const file = new File([json], fileName, { type: 'application/json' });

    // На iPhone «Поделиться» даёт сохранение в Файлы и отправку в мессенджеры
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Резервная копия «Деньги»' });
        return;
      } catch {
        // пользователь отменил — просто падаем в обычное скачивание
      }
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Файл сохранён');
  };

  const pickFile = () => fileInput.current?.click();

  const readFile = async (file: File) => {
    try {
      const snapshot = JSON.parse(await file.text()) as Snapshot;
      if (snapshot?.app !== 'dengi') throw new Error('bad file');
      setImportOpen(snapshot);
    } catch {
      setStatus('Не удалось прочитать файл');
    }
  };

  return (
    <Screen title="Настройки">
      <List header="Бюджет">
        <ListRow
          label="Лимит на месяц"
          value={formatMoney(settings.monthlyLimitMinor, currency, { cents: false })}
          chevron
          onClick={() => setLimitOpen(true)}
        />
        <ListRow
          label="На «Доступно» в день"
          value={math ? formatMoney(math.dailyRateMinor, currency, { cents: false }) : '—'}
          chevron
          onClick={() => setDailyOpen(true)}
        />
        {math && math.dailySavingsMinor > 0 && (
          <ListRow
            label="В копилку из лимита"
            value={formatMoney(math.dailySavingsMinor, currency, { cents: false })}
          />
        )}
        <ListRow
          label="Стратегия откладывания"
          value={strategyLabel(settings.savingsStrategy)}
          chevron
          onClick={() => setStrategyOpen(true)}
        />
        <ListRow
          label="Доступно сейчас"
          value={math ? formatMoney(math.balanceMinor, currency, { cents: false, signed: true }) : '—'}
          chevron
          onClick={() => setBalanceOpen(true)}
        />
        <ListRow
          label="Копилка"
          value={formatMoney(savings, currency, { cents: false })}
          chevron
          onClick={() => setSavingsOpen(true)}
        />
        <ListRow
          label="Категории"
          value={String(categories.length)}
          chevron
          onClick={() => setCategoriesOpen(true)}
          last
        />
      </List>

      {math && (
        <List
          header={monthTitle(currentMonthId())}
          footer="Пополнения и переводы в/из копилки учитываются в «Доступно» через корректировки месяца."
        >
          <ListRow
            label="Перенос с прошлого месяца"
            value={formatMoney(math.openingBalanceMinor, currency, { cents: false, signed: true })}
          />
          {math.externalTopUpsMinor > 0 && (
            <ListRow
              label="Зачислено извне"
              value={formatMoney(math.externalTopUpsMinor, currency, { cents: false })}
            />
          )}
          {math.balanceAdjustmentsMinor !== 0 && (
            <ListRow
              label="Корректировки"
              value={formatMoney(math.balanceAdjustmentsMinor, currency, { cents: false, signed: true })}
            />
          )}
          <ListRow label="Дней начисления" value={pluralDays(math.accrualDays)} />
          <ListRow
            label="Начислится за месяц"
            value={formatMoney(math.monthAllowanceMinor, currency, { cents: false })}
          />
          <ListRow label="Начислено" value={formatMoney(math.accruedMinor, currency, { cents: false })} />
          <ListRow
            label="Потрачено"
            value={formatMoney(math.spentMinor, currency, { cents: false })}
            last
          />
        </List>
      )}

      <List header="Внешний вид">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 hairline-b">
          <span className="text-[17px]">Тема</span>
          <Segmented<Theme>
            className="w-[210px]"
            value={settings.theme}
            onChange={(theme) => void updateSettings({ theme })}
            options={[
              { value: 'auto', label: 'Авто' },
              { value: 'dark', label: 'Тёмная' },
              { value: 'light', label: 'Светлая' },
            ]}
          />
        </div>
        <ListRow
          label="Валюта"
          value={`${currency} ${currencySymbol(currency)}`}
          chevron
          onClick={() => setCurrencyOpen(true)}
          last
        />
      </List>

      <List
        header="Данные"
        footer="Все данные хранятся только на этом устройстве. Резервная копия — единственный способ перенести их на другой телефон."
      >
        <ListRow label="Сохранить копию" chevron onClick={exportData} />
        <ListRow label="Восстановить из копии" chevron onClick={pickFile} />
        <ListRow label="Удалить все данные" destructive onClick={() => setResetOpen(true)} last />
      </List>

      {status && (
        <p className="px-[var(--page-gutter)] pt-3 text-center text-[13px] text-[var(--label-secondary)]">
          {status}
        </p>
      )}

      <p className="px-[var(--page-gutter)] pt-4 text-center text-[13px] text-[var(--label-tertiary)]">
        Деньги · версия 1.0
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void readFile(file);
        }}
      />

      <AmountSheet
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        title="Лимит на месяц"
        hint="Новый лимит применится к текущему и будущим месяцам. Закрытые месяцы останутся как есть."
        currency={currency}
        initialMinor={settings.monthlyLimitMinor}
        onSubmit={(minor) => applyMonthlyLimit(minor)}
      />

      {month && (
        <>
          <DailyAccrualSheet
            open={dailyOpen}
            onClose={() => setDailyOpen(false)}
            currency={currency}
            settings={settings}
            month={month}
          />
          <SavingsStrategySheet
            open={strategyOpen}
            onClose={() => setStrategyOpen(false)}
            currency={currency}
            settings={settings}
            month={month}
            savingsMinor={savings}
          />
        </>
      )}

      {math && (
        <BalanceSheet
          open={balanceOpen}
          onClose={() => setBalanceOpen(false)}
          currency={currency}
          balanceMinor={math.balanceMinor}
          savingsMinor={savings}
        />
      )}

      <SavingsSheet
        open={savingsOpen}
        onClose={() => setSavingsOpen(false)}
        currency={currency}
        totalMinor={savings}
        balanceMinor={math?.balanceMinor}
        onTransferToSavings={() => {
          setSavingsOpen(false);
          setBalanceOpen(true);
        }}
        onTransferFromSavings={() => {
          setSavingsOpen(false);
          setBalanceOpen(true);
        }}
      />

      <CategoriesSheet open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />

      <Sheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Валюта">
        <div className="px-4 pb-4">
          <div className="glass overflow-hidden rounded-[var(--radius-card)]">
            {CURRENCIES.map((code, index) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  haptic('light');
                  void updateSettings({ currency: code });
                  setCurrencyOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left',
                  index < CURRENCIES.length - 1 && 'hairline-b',
                )}
              >
                <span className="money w-8 text-[17px]">{currencySymbol(code)}</span>
                <span className="flex-1 text-[17px]">{code}</span>
                {code === currency && <CheckIcon size={18} className="text-[var(--link)]" />}
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Удалить все данные?"
        message="Траты, месяцы, копилка и настройки будут стёрты с устройства. Отменить это нельзя."
        confirmLabel="Удалить всё"
        destructive
        onConfirm={async () => {
          await resetAll();
          haptic('warning');
        }}
      />

      <ConfirmSheet
        open={importOpen !== null}
        onClose={() => setImportOpen(null)}
        title="Восстановить из копии?"
        message={
          importOpen
            ? `В файле ${importOpen.tx?.length ?? 0} трат и ${importOpen.months?.length ?? 0} месяцев. Текущие данные будут заменены.`
            : ''
        }
        confirmLabel="Восстановить"
        destructive
        onConfirm={async () => {
          if (!importOpen) return;
          await importSnapshot(importOpen);
          haptic('success');
          setStatus('Данные восстановлены');
        }}
      />
    </Screen>
  );
}
