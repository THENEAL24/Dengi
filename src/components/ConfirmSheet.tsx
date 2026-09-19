import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Продолжить',
  destructive,
  onConfirm,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pt-2 pb-2">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
        <p className="mt-1.5 text-[15px] leading-snug text-[var(--label-secondary)]">{message}</p>

        <div className="mt-5 space-y-2">
          <Button
            size="lg"
            full
            variant={destructive ? 'destructive' : 'filled'}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
          <Button size="lg" full variant="tinted" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
