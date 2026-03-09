import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import cardService from '@services/cardService';
import listService from '@services/listService';
import { SortableCard } from './SortableCard';

export default function ListColumn({ list, onCardAdded, onCardClick, onListUpdated }) {
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
      console.error('Failed to create card:', err);
    }
  };

  const handleUpdateList = async () => {
    if (!name.trim()) return;
    try {
      await listService.updateList(list._id, { name: name.trim() });
      setIsEditing(false);
      if (onListUpdated) onListUpdated();
    } catch (err) {
      console.error('Failed to update list:', err);
    }
  };

  const handleDeleteList = async () => {
    const ok = window.confirm('Xóa danh sách này? Thẻ bên trong sẽ bị xóa.');
    if (!ok) return;
    try {
      await listService.deleteList(list._id);
      if (onListUpdated) onListUpdated();
    } catch (err) {
      console.error('Failed to delete list:', err);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={`list-column w-72 ${isOver ? 'ring-2 ring-white/70' : ''}`}
      >
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="list-pill">List</div>
            <h3 className="text-base font-semibold text-white mt-1 heading-soft">
              {list.name}
            </h3>
          </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-50/70 bg-white/10 px-2 py-1 rounded-full">
            {cards.length}
          </span>
          <button
            className="h-7 w-7 rounded-full border border-white/10 text-emerald-50/70 hover:text-white hover:border-white/30 transition flex items-center justify-center text-xs"
            onClick={() => setIsEditing(true)}
            title="Edit list"
            type="button"
          >
            ✎
          </button>
          <button
            className="h-7 w-7 rounded-full border border-white/10 text-red-200 hover:text-white hover:border-red-300 transition flex items-center justify-center text-xs"
            onClick={handleDeleteList}
            title="Delete list"
            type="button"
          >
            🗑
          </button>
        </div>
      </div>

        <div className="px-2 pb-2 flex-1 overflow-y-auto custom-scrollbar">
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
            <div className="text-xs text-emerald-50/60 italic px-1 py-2">
              No cards yet
            </div>
          )}
        </div>

        <div className="p-3 pt-2 border-t border-white/10">
          {isAdding ? (
            <div>
              <textarea
                className="w-full p-2 border rounded-lg shadow-sm mb-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Card title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleAddCard} className="btn btn-primary btn-sm">
                  Add card
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full p-2 text-slate-600 hover:bg-slate-100 text-left rounded-lg"
            >
              + Add new card
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
              <h3 className="text-lg font-semibold heading-soft">Rename list</h3>
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
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsEditing(false);
                  setName(list.name);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleUpdateList}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
