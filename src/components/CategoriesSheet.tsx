import { useState } from 'react';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { CloseIcon, PlusIcon, TrashIcon } from './ui/icons';
import { addCategory, deleteCategory, updateCategory } from '@/db/repo';
import { useCategories } from '@/state/hooks';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';

const PALETTE = [
  'var(--ios-green)',
  'var(--ios-blue)',
  'var(--ios-orange)',
  'var(--ios-red)',
  'var(--ios-purple)',
  'var(--ios-pink)',
  'var(--ios-teal)',
  'var(--ios-yellow)',
  'var(--ios-indigo)',
  'var(--ios-mint)',
  'var(--ios-brown)',
  'var(--ios-gray)',
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CategoriesSheet({ open, onClose }: Props) {
  const categories = useCategories();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: '', emoji: '🏷️', color: PALETTE[0] });
  const [creating, setCreating] = useState(false);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft({ name: '', emoji: '🏷️', color: PALETTE[0] });
  };

  const startEdit = (id: number) => {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    setCreating(false);
    setEditingId(id);
    setDraft({ name: category.name, emoji: category.emoji, color: category.color });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) return;
    if (creating) await addCategory({ name, emoji: draft.emoji || '🏷️', color: draft.color });
    else if (editingId) await updateCategory(editingId, { ...draft, name });
    haptic('success');
    setCreating(false);
    setEditingId(null);
  };

  const editorOpen = creating || editingId !== null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Категории"
      action={
        <button
          type="button"
          onClick={onClose}
          className="text-[17px] font-semibold text-[var(--link)]"
        >
          Готово
        </button>
      }
      className="max-h-[86dvh]"
    >
      <div className="scroll-y max-h-[62dvh] px-4 pb-2">
        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5',
                index < categories.length - 1 && 'hairline-b',
              )}
            >
              <button
                type="button"
                onClick={() => category.id && startEdit(category.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full text-[17px]"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${category.color} 22%, transparent)`,
                  }}
                >
                  {category.emoji}
                </span>
                <span className="truncate text-[17px]">{category.name}</span>
              </button>
              <button
                type="button"
                onClick={() => category.id && void deleteCategory(category.id)}
                className="pressable grid size-8 place-items-center rounded-full text-[var(--negative)]"
                aria-label={`Удалить ${category.name}`}
              >
                <TrashIcon size={17} />
              </button>
            </div>
          ))}
        </div>

        <p className="px-2 pt-2 text-[13px] text-[var(--label-secondary)]">
          Траты удалённой категории останутся в истории — они просто станут без категории.
        </p>

        {editorOpen ? (
          <div className="glass mt-3 rounded-[var(--radius-card)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold">
                {creating ? 'Новая категория' : 'Изменить категорию'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditingId(null);
                }}
                className="grid size-8 place-items-center rounded-full bg-[var(--fill-tertiary)]"
                aria-label="Закрыть редактор"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={draft.emoji}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, emoji: [...event.target.value].slice(-1)[0] ?? '' }))
                }
                className="h-11 w-14 rounded-[var(--radius-control)] bg-[var(--fill-tertiary)] text-center text-[22px] outline-none"
                aria-label="Эмодзи"
              />
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Название"
                maxLength={24}
                className="h-11 flex-1 rounded-[var(--radius-control)] bg-[var(--fill-tertiary)] px-3.5 outline-none placeholder:text-[var(--label-tertiary)]"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, color }))}
                  className={cn(
                    'size-8 rounded-full transition-transform',
                    draft.color === color && 'scale-110 ring-2 ring-[var(--label)] ring-offset-2 ring-offset-transparent',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Цвет ${color}`}
                />
              ))}
            </div>

            <Button full className="mt-4" disabled={!draft.name.trim()} onClick={save}>
              {creating ? 'Добавить' : 'Сохранить'}
            </Button>
          </div>
        ) : (
          <Button full variant="tinted" className="mt-3" onClick={startCreate}>
            <PlusIcon size={18} />
            Новая категория
          </Button>
        )}
      </div>
    </Sheet>
  );
}
