import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { Settings } from '@/db/db';
import { webhookUrl, shortcutImportUrl } from '@/lib/syncApi';
import { haptic } from '@/lib/haptics';

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
};

const STEPS = [
  'Команды → Автоматизация → + → Сообщение.',
  'Отправитель: 9-00 или 900 (Сбер). По желанию: текст содержит «Покупка».',
  'Действие: выполнить команду «Деньги: банковское SMS», вход — текст сообщения.',
  'Включите «Выполнять сразу», без запроса подтверждения.',
];

export function BankSmsSetupSheet({ open, onClose, settings }: Props) {
  const token = settings.bankSmsWebhookToken;
  const key = settings.bankSmsIngressKey;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    haptic('success');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Автоматизация SMS">
      <div className="space-y-4 px-4 pb-6">
        <p className="text-[15px] text-[var(--label-secondary)]">
          Данные шифруются на телефоне до отправки. Сервер видит только зашифрованный blob.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[var(--label-primary)]">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {token && key && (
          <>
            <Button
              variant="filled"
              className="w-full"
              onClick={() => {
                window.location.href = shortcutImportUrl(token, key);
              }}
            >
              Установить команду
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
