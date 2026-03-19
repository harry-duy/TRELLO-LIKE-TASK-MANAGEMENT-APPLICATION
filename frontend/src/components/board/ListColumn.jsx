import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import cardService from '@services/cardService';
import listService from '@services/listService';
import { useTranslation } from '@hooks/useTranslation';
import { SortableCard } from './SortableCard';

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M13.9 2.9a2.1 2.1 0 1 1 3 3L8 14.8l-3.7.7.7-3.7 8.9-8.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4.5 5.5h11m-9.8 0 .6 9.2a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9l.6-9.2m-6.2 0V3.8c0-.4.3-.8.8-.8h1.4c.4 0 .8.3.8.8v1.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ListColumn({ list, onCardAdded, onCardClick, onListUpdated }) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);

  const { setNodeRef, isOver } = useDroppable({
    id: list._id,
  });

  const cards = useMemo(
    () => (Array.isArray(list.cards) ? list.cards : []),
    [list.cards]
  );

  const handleAddCard = async () => {
    if (!title.trim()) return;
    try {
      await cardService.create({
        title: title.trim(),
        listId: list._id,
        boardId: list.board,
      });
      setTitle('');
      setIsAdding(false);
      if (onCardAdded) onCardAdded();
    } catch (err) {
      console.error(t('createCardError'), err);
    }
  };

  const handleUpdateList = async () => {
    if (!name.trim()) return;
    try {
      await listService.updateList(list._id, { name: name.trim() });
      setIsEditing(false);
      if (onListUpdated) onListUpdated();
    } catch (err) {
      console.error(t('updateListError'), err);
    }
  };

  const handleDeleteList = async () => {
    const ok = window.confirm(t('deleteListConfirm'));
    if (!ok) return;
    try {
      await listService.deleteList(list._id);
      if (onListUpdated) onListUpdated();
    } catch (err) {
      console.error(t('deleteListError'), err);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={`list-column w-[290px] ${isOver ? 'ring-2 ring-sky-300/80' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <div className="list-pill">{t('listLabel')}</div>
            <h3 className="heading-soft mt-1 truncate text-xl font-semibold text-slate-900">
              {list.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {cards.length}
            </span>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              onClick={() => setIsEditing(true)}
              title={t('editList')}
              type="button"
            >
              <PencilIcon />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:text-red-500"
              onClick={handleDeleteList}
              title={t('deleteList')}
              type="button"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-3 pb-3">
          <SortableContext
            items={cards.map((card) => card._id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <button
                key={card._id}
                type="button"
                onClick={() => onCardClick && onCardClick(card._id)}
                className="w-full text-left"
              >
                <SortableCard card={card} />
              </button>
            ))}
          </SortableContext>

          {!cards.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm italic text-slate-400">
              {t('noCardsYet')}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
          {isAdding ? (
            <div>
              <textarea
                className="input mb-2 min-h-[96px]"
                placeholder={t('cardTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleAddCard} className="btn btn-primary btn-sm">
                  {t('addCard')}
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full rounded-2xl px-3 py-3 text-left font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {t('addNewCard')}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div
            className="modal-content card-modal max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4">
              <h3 className="heading-soft text-lg font-semibold">{t('renameList')}</h3>
            </header>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateList();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setName(list.name);
                }
              }}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsEditing(false);
                  setName(list.name);
                }}
              >
                {t('cancel')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleUpdateList}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
