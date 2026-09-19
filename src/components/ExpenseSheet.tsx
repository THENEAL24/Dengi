import { useEffect, useRef, useState } from 'react';
import { AmountDisplay } from './AmountDisplay';
import { Keypad } from './Keypad';
import { Sheet } from './ui/Sheet';
import { CalendarIcon, CheckIcon, NoteIcon, TrashIcon } from './ui/icons';
import type { Tx } from '@/db/db';
import { addTx, deleteTx, updateTx } from '@/db/repo';
import { useCategories } from '@/state/hooks';
import { cn } from '@/lib/cn';
import { dayTitle, todayIso } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { keypadToMinor } from '@/lib/money';

type Props = {
  open: boolean;
  onClose: () => void;
  currency: string;
  /** Передан — режим правки существующей траты */
  editing?: Tx | null;
};

/** Сумма в копейках → строка для клавиатуры ('125000' → '1250') */
function minorToDigits(minor: number): string {
  const whole = Math.trunc(minor / 100);
  const cents = minor % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`;
}

export function ExpenseSheet({ open, onClose, currency, editing }: Props) {
  const categories = useCategories();
  const [digits, setDigits] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [noteMode, setNoteMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const noteInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDigits(editing ? minorToDigits(editing.amountMinor) : '');
    setCategoryId(editing?.categoryId);
    setNote(editing?.note ?? '');
    setDate(editing?.date ?? todayIso());
    setNoteMode(false);
  }, [open, editing]);

  useEffect(() => {
    if (noteMode) noteInput.current?.focus();
  }, [noteMode]);

  const amountMinor = keypadToMinor(digits);
  const canSave = amountMinor > 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      if (editing?.id) {
        await updateTx(editing.id, { amountMinor, categoryId, note, date });
      } else {
        await addTx({ amountMinor, categoryId, note, date });
      }
      haptic('success');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    setBusy(true);
    try {
      await deleteTx(editing.id);
      haptic('warning');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex items-center justify-between px-4 pb-1">
        <button
          type="button"
          onClick={onClose}
          className="px-1 py-1 text-[17px] text-[var(--link)]"
        >
          Отмена
        </button>
        <span className="text-[17px] font-semibold">
          {editing ? 'Трата' : 'Новая трата'}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={cn(
            'px-1 py-1 text-[17px] font-semibold',
            canSave ? 'text-[var(--link)]' : 'text-[var(--label-quaternary)]',
          )}
        >
          {editing ? 'Готово' : 'Добавить'}
        </button>
      </div>

      <div className="px-4 pt-4 pb-2">
        <AmountDisplay digits={digits} currency={currency} />
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-4 py-2">
        {categories.map((category) => {
          const active = category.id === categoryId;
          return (
            <button
              key={category.id}
              type="button"
              ref={(node) => {
                // при правке выбранная категория может быть далеко в списке
                if (node && active && editing) {
                  node.scrollIntoView({ block: 'nearest', inline: 'center' });
                }
              }}
              onClick={() => {
                haptic('light');
                setCategoryId(active ? undefined : category.id);
              }}
              className={cn(
                'pressable flex shrink-0 items-center gap-1.5 rounded-full py-2 pr-3.5 pl-2.5 text-[15px] font-medium whitespace-nowrap',
                active ? 'text-white' : 'bg-[var(--fill-tertiary)] text-[var(--label)]',
              )}
              style={active ? { backgroundColor: category.color } : undefined}
            >
              <span className="text-[16px]">{category.emoji}</span>
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-4 pt-1 pb-3">
        <label className="pressable relative flex items-center gap-1.5 rounded-full bg-[var(--fill-tertiary)] px-3 py-2 text-[15px]">
          <CalendarIcon size={17} className="text-[var(--label-secondary)]" />
          {dayTitle(date)}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || todayIso())}
            className="absolute inset-0 opacity-0"
            aria-label="Дата траты"
          />
        </label>

        <button
          type="button"
          onClick={() => setNoteMode(true)}
          className={cn(
            'pressable flex min-w-0 items-center gap-1.5 rounded-full px-3 py-2 text-[15px]',
            note ? 'bg-[var(--fill-secondary)]' : 'bg-[var(--fill-tertiary)]',
          )}
        >
          <NoteIcon size={17} className="text-[var(--label-secondary)]" />
          <span className="max-w-[160px] truncate">{note || 'Заметка'}</span>
        </button>

        {editing && (
          <button
            type="button"
            onClick={remove}
            className="pressable ml-auto grid size-9 place-items-center rounded-full bg-[var(--fill-tertiary)] text-[var(--negative)]"
            aria-label="Удалить трату"
          >
            <TrashIcon size={18} />
          </button>
        )}
      </div>

      {noteMode ? (
        <div className="flex items-center gap-2 px-4 pb-4">
          <input
            ref={noteInput}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setNoteMode(false);
            }}
            placeholder="На что потратил?"
            maxLength={80}
            className="h-11 flex-1 rounded-[var(--radius-control)] bg-[var(--fill-tertiary)] px-3.5 outline-none placeholder:text-[var(--label-tertiary)]"
          />
          <button
            type="button"
            onClick={() => setNoteMode(false)}
            className="pressable grid size-11 place-items-center rounded-[var(--radius-control)] bg-[var(--link)] text-white"
            aria-label="Готово"
          >
            <CheckIcon size={20} />
          </button>
        </div>
      ) : (
        <Keypad value={digits} onChange={setDigits} className="px-3 pb-1" />
      )}
    </Sheet>
  );
}
