import { useState } from 'react';
import { ListRow } from '@/components/ui/List';
import { Segmented } from '@/components/ui/Segmented';
import { BankInboxSheet } from '@/components/BankInboxSheet';
import { BankSmsSetupSheet } from '@/components/BankSmsSetupSheet';
import type { Settings } from '@/db/db';
import { disableBankSmsSync, enableBankSmsSync, rotateBankSmsKeys } from '@/db/bankSmsEnroll';
import { updateSettings } from '@/db/repo';
import { usePendingBankInboxCount } from '@/state/bankSmsHooks';
import { allowedSmsSenderHint, TEST_SMS_SENDER } from '@bank/sms';
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
    onStatus('Подключение к серверу…');
    try {
      if (enabled) {
        await disableBankSmsSync(settings);
        onStatus('Запись из SMS отключена');
        haptic('light');
      } else {
        await enableBankSmsSync();
        haptic('success');
        setSetupOpen(true);
        onStatus('Подключено. Настройте команду в открывшейся инструкции.');
        void syncBankSmsIfEnabled().then((sync) => {
          if (sync.error) onStatus(`Sync: ${sync.error}`);
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'missing_upstash_env') {
        onStatus('Нет Upstash на Vercel. Подключите Integration и redeploy.');
      } else if (msg === 'timeout') {
        onStatus('Таймаут API. Проверьте интернет или обновите PWA после деплоя.');
      } else if (msg.startsWith('HTTP 5')) {
        onStatus(`API: ${msg}. Проверьте деплой и логи Vercel.`);
      } else {
        onStatus(`Не удалось подключить: ${msg || 'сеть'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ListRow
        label="Запись из SMS (Сбер 9-00)"
        value={busy ? '…' : enabled ? 'Вкл' : 'Выкл'}
        chevron
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
              onStatus(
                r.error
                  ? `Sync: ${r.error}`
                  : r.processed === 0
                    ? 'Новых событий нет (SMS ещё не дошли или команда не настроена)'
                    : `Обработано событий: ${r.processed}`,
              );
            }}
          />
          <ListRow
            label="Проверить канал (формат Сбера)"
            chevron
            onClick={async () => {
              try {
                await testBankSmsChannel(settings);
                onStatus('Тест OK. Смотрите «Входящие» или траты (режим «Сразу»).');
                haptic('success');
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'unknown';
                onStatus(`Тест: ${msg}`);
              }
            }}
          />
          <p className="px-4 pb-2 text-[12px] leading-snug text-[var(--label-tertiary)]">
            Тест с телефона: перешлите SMS покупки на {TEST_SMS_SENDER}, автоматизация — отправитель{' '}
            {allowedSmsSenderHint()}.
          </p>
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
