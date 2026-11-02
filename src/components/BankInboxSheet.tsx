import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { acceptBankInboxItem, listPendingBankInbox, rejectBankInboxItem } from '@/db/bankSmsActions';
import { formatMoney } from '@/lib/money';
import { haptic } from '@/lib/haptics';
import type { Settings } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
};

export function BankInboxSheet({ open, onClose, settings }: Props) {
  const items = useLiveQuery(() => listPendingBankInbox(), [open], []);
  const [busyId, setBusyId] = useState<number | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title="Входящие из банка">
      <div className="max-h-[60vh] overflow-y-auto px-4 pb-6">
        {!items?.length ? (
          <p className="py-8 text-center text-[15px] text-[var(--label-secondary)]">Нет новых операций</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="glass rounded-[var(--radius-card)] p-4">
                <p className="text-[17px] font-medium">{item.rawPreview}</p>
                <p className="mt-1 text-[13px] text-[var(--label-secondary)]">{item.date}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="filled"
                    className="flex-1"
                    disabled={busyId === item.id}
                    onClick={async () => {
                      if (!item.id) return;
                      setBusyId(item.id);
                      try {
                        await acceptBankInboxItem(item.id, {
                          categoryId: item.suggestedCategoryId,
                        });
                        haptic('success');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Принять
                  </Button>
                  <Button
                    variant="tinted"
                    disabled={busyId === item.id}
                    onClick={async () => {
                      if (!item.id) return;
                      setBusyId(item.id);
                      try {
                        await rejectBankInboxItem(item.id);
                        haptic('light');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Отклонить
                  </Button>
                </div>
                {item.amountMinor != null && (
                  <p className="mt-2 text-[13px] text-[var(--label-tertiary)]">
                    {formatMoney(item.amountMinor, settings.currency)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
