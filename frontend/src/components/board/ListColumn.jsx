import { useMemo, useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cardService from '@services/cardService';
import listService from '@services/listService';
import { useTranslation } from '@hooks/useTranslation';
import { SortableCard } from './SortableCard';

export default function ListColumn({ list, onCardAdded, onCardClick, onListUpdated, columnWidth }) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: list._id, data: { type: 'list' } });

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
        className="list-column"
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          width: columnWidth,
          minWidth: columnWidth,
          outline: isOver ? '2px solid rgba(125,211,252,.45)' : 'none',
          outlineOffset: '-2px',
          opacity: isDragging ? 0.45 : 1,
          boxShadow: isDragging ? '0 24px 44px rgba(15,23,42,.24)' : undefined,
        }}
      >
        <div className="list-column-header">
          <div
            className="min-w-0 flex flex-1 items-center gap-2.5"
            {...attributes}
            {...listeners}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(125,211,252,.95), rgba(45,212,191,.85))',
                boxShadow: '0 0 0 4px rgba(125,211,252,.08)',
                flexShrink: 0,
              }}
            />
            <h3
              className="list-column-title"
              title={list.name}
              onClick={() => setIsEditing(true)}
            >
              {list.name}
            </h3>
          </div>

          <div className="list-column-actions" style={{ opacity: 1 }}>
            <span className="list-column-count">{cards.length}</span>
            <button
              type="button"
              title={t('editList')}
              onClick={() => setIsEditing(true)}
              style={{
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,.06)',
                borderRadius: '10px',
                background: 'rgba(255,255,255,.04)',
                color: 'rgba(255,255,255,.55)',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
                fontSize: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.1)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.04)';
                e.currentTarget.style.color = 'rgba(255,255,255,.55)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
                <circle cx="8" cy="8" r="1.25" fill="currentColor" />
                <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
              </svg>
            </button>
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

        <div
          className="custom-scrollbar"
          style={{
            padding: '2px 10px 6px',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <SortableContext items={cards.map((card) => card._id)} strategy={verticalListSortingStrategy}>
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
            <div
              style={{
                padding: '12px 8px 10px',
                fontSize: 12,
                color: 'rgba(255,255,255,.42)',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              {t('noCardsYet')}
            </div>
          )}
        </div>

        <div style={{ padding: '6px 10px 10px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          {isAdding ? (
            <div>
              <textarea
                className="w-full p-2 border rounded-lg shadow-sm mb-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Card title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddCard();
                  }
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setTitle('');
                  }
                }}
                style={{
                  resize: 'none',
                  marginBottom: 8,
                  borderRadius: '12px',
                  fontSize: 14,
                  boxShadow: '0 8px 20px rgba(0,0,0,.18)',
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddCard}>
                  {t('addCard')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setTitle('');
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  x
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="add-card-btn" onClick={() => setIsAdding(true)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {t('addNewCard')}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="modal-overlay" onClick={() => {
          setIsEditing(false);
          setName(list.name);
        }}>
          <div
            className="modal-content"
            style={{ maxWidth: 360, padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 16,
                color: 'var(--color-text-heading)',
              }}
            >
              {t('renameList')}
            </h3>
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
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteList}>
                {t('deleteList')}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
      )}
    </>
  );
}
