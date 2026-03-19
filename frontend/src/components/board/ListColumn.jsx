// frontend/src/components/board/ListColumn.jsx
// ✅ Professional Trello-dark style
// ✅ All logic preserved - only visual changes

import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import cardService from '@services/cardService';
import listService from '@services/listService';
import { useTranslation } from '@hooks/useTranslation';
import { SortableCard } from './SortableCard';

export default function ListColumn({ list, onCardAdded, onCardClick, onListUpdated }) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);

  const { setNodeRef, isOver } = useDroppable({ id: list._id });

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
        className="list-column"
        style={{
          outline: isOver ? '2px solid rgba(87,157,255,.6)' : 'none',
          outlineOffset: '-1px',
        }}
      >
        {/* ─── Column Header ─── */}
        <div className="list-column-header">
          <h3
            className="list-column-title"
            title={list.name}
            onClick={() => setIsEditing(true)}
          >
            {list.name}
          </h3>
          <span className="list-column-count">{cards.length}</span>

          <div className="list-column-actions">
            <button
              type="button"
              title={t('editList')}
              onClick={() => setIsEditing(true)}
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', borderRadius: '4px',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
                fontSize: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(166,197,226,.1)'; e.currentTarget.style.color = 'var(--color-text-heading)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3.5" r="1.25" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.25" fill="currentColor"/>
                <circle cx="8" cy="12.5" r="1.25" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Card List ─── */}
        <div
          className="custom-scrollbar"
          style={{
            padding: '0 8px 4px',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <SortableContext
            items={cards.map(c => c._id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map(card => (
              <button
                key={card._id}
                type="button"
                onClick={() => onCardClick && onCardClick(card._id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'block',
                  textAlign: 'left',
                }}
              >
                <SortableCard card={card} />
              </button>
            ))}
          </SortableContext>

          {!cards.length && (
            <div style={{
              padding: '8px 6px',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}>
              {t('noCardsYet')}
            </div>
          )}
        </div>

        {/* ─── Add Card Area ─── */}
        <div style={{ padding: '4px 8px 8px' }}>
          {isAdding ? (
            <div>
              <textarea
                autoFocus
                className="input"
                rows={3}
                placeholder={t('cardTitlePlaceholder')}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                  if (e.key === 'Escape') { setIsAdding(false); setTitle(''); }
                }}
                style={{
                  resize: 'none',
                  marginBottom: 8,
                  borderRadius: '4px',
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,.3)',
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddCard}
                >
                  {t('addCard')}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setTitle(''); }}
                  style={{
                    width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: '4px',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: 16,
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(166,197,226,.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="add-card-btn"
              onClick={() => setIsAdding(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {t('addNewCard')}
            </button>
          )}
        </div>
      </div>

      {/* ─── Edit List Name Modal ─── */}
      {isEditing && (
        <div
          className="modal-overlay"
          onClick={() => { setIsEditing(false); setName(list.name); }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 360, padding: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: 16, fontWeight: 600, marginBottom: 16,
              color: 'var(--color-text-heading)',
            }}>
              {t('renameList')}
            </h3>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleUpdateList();
                if (e.key === 'Escape') { setIsEditing(false); setName(list.name); }
              }}
              autoFocus
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteList}
              >
                {t('deleteList')}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setIsEditing(false); setName(list.name); }}
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