import { useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { TrashIcon } from './ui/icons';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';

const ACTION_WIDTH = 84;
const SNAP_THRESHOLD = 44;
const INSTANT_DELETE = 150;
const SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const;

type Props = {
  children: ReactNode;
  onDelete: () => void;
};

/** Свайп влево открывает «Удалить»; резкий свайп до конца удаляет сразу, как в iOS. */
export function SwipeRow({ children, onDelete }: Props) {
  const x = useMotionValue(0);
  // Строка стеклянная, поэтому на время свайпа ей нужен непрозрачный фон,
  // иначе красная кнопка просвечивает сквозь содержимое.
  const [raised, setRaised] = useState(false);

  const close = () => {
    void animate(x, 0, SPRING).then(() => setRaised(false));
  };

  const remove = () => {
    haptic('warning');
    onDelete();
  };

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={remove}
        className={cn(
          'absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--negative)] text-white transition-opacity',
          raised ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ width: ACTION_WIDTH }}
        aria-label="Удалить"
      >
        <TrashIcon size={21} />
      </button>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        style={{ x }}
        onDragStart={() => setRaised(true)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -INSTANT_DELETE) {
            remove();
            return;
          }
          if (info.offset.x < -SNAP_THRESHOLD) {
            void animate(x, -ACTION_WIDTH, SPRING);
            return;
          }
          close();
        }}
        onClickCapture={(event) => {
          // Сдвинутую строку тап только возвращает на место. Проверяем именно смещение:
          // onDragEnd приходит позже click, поэтому флаг состояния тут не помог бы.
          if (Math.abs(x.get()) > 4) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
        className={cn('relative', raised ? 'bg-[var(--glass-solid-strong)]' : 'bg-transparent')}
      >
        {children}
      </motion.div>
    </div>
  );
}
