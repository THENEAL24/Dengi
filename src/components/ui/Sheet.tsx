import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Заголовок в шапке шита; если не нужен — не передавай */
  title?: string;
  /** Кнопка справа в шапке (например «Готово») */
  action?: ReactNode;
  /** Блокирует закрытие свайпом и тапом по фону — для обязательных решений */
  dismissable?: boolean;
  className?: string;
};

const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

export function Sheet({
  open,
  onClose,
  children,
  title,
  action,
  dismissable = true,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const backdropTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.28, ease: SHEET_EASE };

  const panelTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: 'tween' as const, duration: 0.4, ease: SHEET_EASE };

  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={dismissable ? onClose : undefined}
          />

          <motion.div
            className={cn(
              'glass-sheet relative w-full max-w-[520px] rounded-t-[var(--radius-sheet)] pb-[calc(var(--safe-bottom)+12px)] will-change-transform',
              className,
            )}
            style={{ transform: 'translateZ(0)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={panelTransition}
            drag={dismissable ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.65 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
          >
            {dismissable && (
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="h-[5px] w-9 rounded-full bg-[var(--label-quaternary)]" />
              </div>
            )}

            {(title || action) && (
              <div className="flex items-center justify-between px-5 pt-1 pb-3">
                <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
                {action}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
