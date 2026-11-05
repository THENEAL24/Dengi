import { useRef, useState } from 'react';
import { AmountSheet } from '@/components/AmountSheet';
import { BalanceSheet } from '@/components/BalanceSheet';
import { CategoriesSheet } from '@/components/CategoriesSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { CurrencyPickerList } from '@/components/CurrencyPickerList';
import { DailyAccrualSheet } from '@/components/DailyAccrualSheet';
import { SavingsSheet } from '@/components/SavingsSheet';
import { SavingsStrategySheet } from '@/components/SavingsStrategySheet';
import { List, ListRow } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import type { AmountRounding, Settings as SettingsRecord, Theme } from '@/db/db';
import {
  applyAmountRounding,
  applyMonthlyLimit,
  changeCurrency,
  exportSnapshot,
  importSnapshot,
  resetAll,
  updateSettings,
  type Snapshot,
} from '@/db/repo';
import { useCategories, useCurrentMonthView, useMonthRecord, useSavingsTotal } from '@/state/hooks';
import { currentMonthId, monthTitle, todayIso } from '@/lib/date';
import { strategyLabel } from '@/lib/savings-strategy';
import { pluralDays } from '@/lib/plural';
import { effectiveAmountRounding, getCurrency } from '@/lib/currencies';
import { currencyPairRateLabel, roundingLabel } from '@/lib/currencyConvert';
import {
  formatExchangeRatesUpdated,
  refreshExchangeRatesOnline,
} from '@/lib/exchangeRates';
import { currencySymbol, formatMoney } from '@/lib/money';
import { haptic } from '@/lib/haptics';
import { useTranslation } from '@/state/I18nContext';

type Props = { settings: SettingsRecord };

export function Settings({ settings }: Props) {
  const { t } = useTranslation();
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
  const [currencyConfirm, setCurrencyConfirm] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const currency = settings.currency;
  const currencyMeta = getCurrency(currency);
  const rounding = effectiveAmountRounding(settings.currency, settings.amountRounding);
  const math = view?.math;
  const fmt = (minor: number, opts?: Parameters<typeof formatMoney>[2]) =>
    formatMoney(minor, currency, { rounding, ...opts });

  const exportData = async () => {
    const snapshot = await exportSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const fileName = `dengi-${todayIso()}.json`;
    const file = new File([json], fileName, { type: 'application/json' });

    // На iPhone «Поделиться» даёт сохранение в Файлы и отправку в мессенджеры
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('settings.shareBackupTitle') });
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
    setStatus(t('settings.fileSaved'));
  };

  const pickFile = () => fileInput.current?.click();

  const readFile = async (file: File) => {
    try {
      const snapshot = JSON.parse(await file.text()) as Snapshot;
      if (snapshot?.app !== 'dengi') throw new Error('bad file');
      setImportOpen(snapshot);
    } catch {
      setStatus(t('error.readFileFailed'));
    }
  };

  return (
    <Screen title={t('settings.title')} showLocaleSwitcher>
      <List header={t('settings.section.budget')}>
        <ListRow
          label={t('settings.monthlyLimit')}
          value={fmt(settings.monthlyLimitMinor, { cents: false })}
          chevron
          onClick={() => setLimitOpen(true)}
        />
        <ListRow
          label={t('settings.dailyAvailable')}
          value={math ? fmt(math.dailyRateMinor, { cents: 'auto' }) : '—'}
          chevron
          onClick={() => setDailyOpen(true)}
        />
        {math && math.dailySavingsMinor > 0 && (
          <ListRow
            label={t('settings.toSavingsFromLimit')}
            value={fmt(math.dailySavingsMinor, { cents: false })}
          />
        )}
        <ListRow
          label={t('settings.savingsStrategy')}
          value={strategyLabel(settings.savingsStrategy)}
          chevron
          onClick={() => setStrategyOpen(true)}
        />
        <ListRow
          label={t('settings.availableNow')}
          value={math ? fmt(math.balanceMinor, { cents: 'auto' }) : '—'}
          chevron
          onClick={() => setBalanceOpen(true)}
        />
        <ListRow
          label={t('settings.savings')}
          value={fmt(savings, { cents: false })}
          chevron
          onClick={() => setSavingsOpen(true)}
        />
        <ListRow
          label={t('settings.categories')}
          value={String(categories.length)}
          chevron
          onClick={() => setCategoriesOpen(true)}
          last
        />
      </List>

      {math && (
        <List
          header={monthTitle(currentMonthId())}
          footer={t('settings.monthFooter')}
        >
          <ListRow
            label={t('settings.carryOver')}
            value={fmt(math.openingBalanceMinor, { cents: false })}
          />
          {math.externalTopUpsMinor > 0 && (
            <ListRow
              label={t('settings.externalTopUps')}
              value={fmt(math.externalTopUpsMinor, { cents: false })}
            />
          )}
          {math.balanceAdjustmentsMinor !== 0 && (
            <ListRow
              label={t('settings.adjustments')}
              value={fmt(math.balanceAdjustmentsMinor, { cents: false })}
            />
          )}
          <ListRow label={t('settings.accrualDays')} value={pluralDays(math.accrualDays)} />
          <ListRow
            label={t('settings.willAccrue')}
            value={fmt(math.monthAllowanceMinor, { cents: false })}
          />
          <ListRow label={t('settings.accrued')} value={fmt(math.accruedMinor, { cents: false })} />
          <ListRow label={t('settings.spent')} value={fmt(math.spentMinor, { cents: false })} last />
        </List>
      )}

      <List header={t('settings.section.appearance')}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 hairline-b">
          <span className="text-[17px]">{t('theme.label')}</span>
          <Segmented<Theme>
            className="w-[210px]"
            value={settings.theme}
            onChange={(theme) => void updateSettings({ theme })}
            options={[
              { value: 'auto', label: t('theme.auto') },
              { value: 'dark', label: t('theme.dark') },
              { value: 'light', label: t('theme.light') },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 hairline-b">
          <span className="text-[17px]">{t('rounding.label')}</span>
          <Segmented<AmountRounding>
            className="w-[240px]"
            value={rounding}
            onChange={(mode) => void applyAmountRounding(mode)}
            options={[
              { value: 'precise', label: t('rounding.precise') },
              { value: 'whole', label: t('rounding.whole') },
            ]}
          />
        </div>
        <ListRow
          label={t('currency.label')}
          value={`${currencyMeta.flag} ${currency} ${currencySymbol(currency)}`}
          chevron
          onClick={() => {
            void refreshExchangeRatesOnline();
            setCurrencyOpen(true);
          }}
          last
        />
      </List>

      <List header={t('settings.section.data')} footer={t('settings.dataFooter')}>
        <ListRow label={t('settings.exportBackup')} chevron onClick={exportData} />
        <ListRow label={t('settings.importBackup')} chevron onClick={pickFile} />
        <ListRow label={t('settings.deleteAll')} destructive onClick={() => setResetOpen(true)} last />
      </List>

      {status && (
        <p className="px-[var(--page-gutter)] pt-3 text-center text-[13px] text-[var(--label-secondary)]">
          {status}
        </p>
      )}

      <p className="px-[var(--page-gutter)] pt-4 text-center text-[13px] text-[var(--label-tertiary)]">
        {t('app.version')}
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
        title={t('settings.monthlyLimit')}
        hint={t('settings.limitHint')}
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

      <Sheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} title={t('currency.label')}>
        <div className="flex max-h-[min(70dvh,520px)] flex-col px-4 pb-4">
          <p className="pb-3 text-[13px] leading-snug text-[var(--label-secondary)]">
            {formatExchangeRatesUpdated(settings) ??
              t('exchangeRates.offlineHint')}{' '}
            {t('exchangeRates.convertHint', { rounding: roundingLabel(rounding) })}
          </p>
          <CurrencyPickerList
            value={currency}
            onChange={(code) => {
              if (code === currency) return;
              setCurrencyConfirm(code);
            }}
          />
        </div>
      </Sheet>

      <ConfirmSheet
        open={currencyConfirm !== null}
        onClose={() => setCurrencyConfirm(null)}
        title={t('settings.changeCurrencyTitle')}
        message={
          currencyConfirm
            ? t('settings.changeCurrencyMessage', {
                currency: currencyConfirm,
                ratesKind: formatExchangeRatesUpdated(settings)
                  ? t('exchangeRates.liveRates')
                  : t('exchangeRates.savedRates'),
                pairRate: currencyPairRateLabel(currency, currencyConfirm),
              })
            : ''
        }
        confirmLabel={t('settings.recalculate')}
        onConfirm={async () => {
          if (!currencyConfirm) return;
          await changeCurrency(currencyConfirm);
          haptic('success');
          setCurrencyConfirm(null);
          setCurrencyOpen(false);
          setStatus(t('settings.amountsRecalculated'));
        }}
      />

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t('settings.deleteAllTitle')}
        message={t('settings.deleteAllMessage')}
        confirmLabel={t('settings.deleteAllConfirm')}
        destructive
        onConfirm={async () => {
          await resetAll();
          haptic('warning');
        }}
      />

      <ConfirmSheet
        open={importOpen !== null}
        onClose={() => setImportOpen(null)}
        title={t('settings.restoreTitle')}
        message={
          importOpen
            ? t('settings.restoreMessage', {
                txCount: importOpen.tx?.length ?? 0,
                monthCount: importOpen.months?.length ?? 0,
              })
            : ''
        }
        confirmLabel={t('settings.restoreConfirm')}
        destructive
        onConfirm={async () => {
          if (!importOpen) return;
          await importSnapshot(importOpen);
          haptic('success');
          setStatus(t('settings.dataRestored'));
        }}
      />
    </Screen>
  );
}
