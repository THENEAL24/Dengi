import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { Settings } from '@/db/db';
import { bankSmsRunScriptUrl, shortcutImportUrl, webhookUrl } from '@/lib/syncApi';
import { allowedSmsSenderHint, TEST_SMS_SENDER } from '@bank/sms';
import { haptic } from '@/lib/haptics';

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
};

const STEPS = [
  'Нажмите «Скопировать код JS» и вставьте в действие «Выполнить JavaScript» в новой команде.',
  'Имя команды: «Деньги: банковское SMS». Включите «Показывать при запуске» — выкл.',
  'Команды → Автоматизация → + → Сообщение.',
  `Отправитель: ${allowedSmsSenderHint()}. Фильтр: текст содержит «Покупка» (по желанию).`,
  'Действие: выполнить «Деньги: банковское SMS», вход — содержимое сообщения.',
  'Включите «Выполнять сразу», без подтверждения.',
  `Тест: «Проверить канал» в настройках или SMS на ${TEST_SMS_SENDER}.`,
  'После SMS откройте приложение или «Синхронизировать» — операции не появятся сами без sync.',
];

export function BankSmsSetupSheet({ open, onClose, settings }: Props) {
  const token = settings.bankSmsWebhookToken;
  const key = settings.bankSmsIngressKey;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    haptic('success');
  };

  const copyRunScript = async () => {
    if (!token || !key) return;
    const res = await fetch(bankSmsRunScriptUrl(token, key));
    if (!res.ok) throw new Error('script fetch failed');
    await copy(await res.text());
  };

  return (
    <Sheet open={open} onClose={onClose} title="Автоматизация SMS">
      <div className="space-y-4 px-4 pb-6">
        <p className="text-[15px] text-[var(--label-secondary)]">
          SMS шифруется на iPhone до отправки. Без команды и автоматизации включение в приложении только
          регистрирует канал на сервере.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[var(--label-primary)]">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {token && key && (
          <>
            <Button variant="filled" className="w-full" onClick={() => void copyRunScript()}>
              Скопировать код JS (надёжно)
            </Button>
            <Button
              variant="tinted"
              className="w-full"
              onClick={() => {
                window.location.href = shortcutImportUrl(token, key);
              }}
            >
              Попробовать установить команду
            </Button>
            <Button variant="tinted" className="w-full" onClick={() => void copy(webhookUrl(token))}>
              Скопировать URL webhook
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
