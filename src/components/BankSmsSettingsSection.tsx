import { useState } from 'react';
import { ListRow } from '@/components/ui/List';
import { Segmented } from '@/components/ui/Segmented';
import { BankInboxSheet } from '@/components/BankInboxSheet';
import { BankSmsSetupSheet } from '@/components/BankSmsSetupSheet';
import type { Settings } from '@/db/db';
import { disableBankSmsSync, enableBankSmsSync, rotateBankSmsKeys } from '@/db/bankSmsEnroll';
import { updateSettings } from '@/db/repo';
import { usePendingBankInboxCount } from '@/state/bankSmsHooks';
import { syncBankSmsIfEnabled, testBankSmsChannel } from '@/sync/bankSmsSync';
import { haptic } from '@/lib/haptics';

type Props = {
  settings: Settings;
  onStatus: (msg: string | null) => void;
};

export function BankSmsSettingsSection({ settings, onStatus }: Props) {
  const pending = usePendingBankInboxCount();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const enabled = settings.bankSmsEnabled === true;
  const mode = settings.bankSmsMode ?? 'inbox';

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disableBankSmsSync(settings);
        onStatus('Запись из SMS отключена');
        haptic('light');
      } else {
        await enableBankSmsSync();
        onStatus('Подключено. Установите команду и автоматизацию.');
        haptic('success');
        setSetupOpen(true);
      }
    } catch {
      onStatus('Не удалось подключить. Проверьте сеть и API.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ListRow
        label="Запись из SMS (Сбер 9-00)"
        value={enabled ? 'Вкл' : 'Выкл'}
        chevron={false}
        onClick={busy ? undefined : () => void toggle()}
      />
      {enabled && (
        <>
          <div className="px-4 py-3">
            <p className="mb-2 text-[13px] text-[var(--label-secondary)]">Как добавлять операции</p>
            <Segmented
              value={mode}
              onChange={(v) => {
                void updateSettings({ bankSmsMode: v as 'inbox' | 'auto' });
                haptic('light');
              }}
              options={[
                { value: 'inbox', label: 'Входящие' },
                { value: 'auto', label: 'Сразу' },
              ]}
            />
          </div>
          <ListRow label="Установить команду и SMS" chevron onClick={() => setSetupOpen(true)} />
          {mode === 'inbox' && (
            <ListRow
              label="Входящие"
              value={pending > 0 ? String(pending) : undefined}
              chevron
              onClick={() => setInboxOpen(true)}
            />
          )}
          <ListRow
            label="Синхронизировать"
            chevron
            onClick={async () => {
              const r = await syncBankSmsIfEnabled();
              onStatus(r.error ? 'Ошибка синхронизации' : `Обработано: ${r.processed}`);
            }}
          />
          <ListRow
            label="Проверить канал"
            chevron
            onClick={async () => {
              try {
                await testBankSmsChannel(settings);
                onStatus('Тест отправлен. Проверьте входящие или траты.');
                haptic('success');
              } catch {
                onStatus('Тест не прошёл');
              }
            }}
          />
          <ListRow
            label="Перевыпустить ключи"
            chevron
            onClick={async () => {
              await rotateBankSmsKeys(settings);
              onStatus('Ключи обновлены. Переустановите команду.');
              setSetupOpen(true);
            }}
          />
        </>
      )}

      <BankInboxSheet open={inboxOpen} onClose={() => setInboxOpen(false)} settings={settings} />
      <BankSmsSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} settings={settings} />
    </>
  );
}
