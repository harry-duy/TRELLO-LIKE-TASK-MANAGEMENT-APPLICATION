import { useMemo, useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cardService from '@services/cardService';
import listService from '@services/listService';
import { useTranslation } from '@hooks/useTranslation';
import { useUiStore } from '@store/uiStore';
import { SortableCard } from './SortableCard';

export default function ListColumn({ list, allLists = [], onCardAdded, onCardClick, onListUpdated, columnWidth }) {
  const { t } = useTranslation();
  const lang = useUiStore((state) => state.language) || 'vi';
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [deleteMode, setDeleteMode] = useState('move');
  const [targetListId, setTargetListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreatingTargetList, setIsCreatingTargetList] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: list._id, data: { type: 'list' } });

  const cards = useMemo(() => (Array.isArray(list.cards) ? list.cards : []), [list.cards]);
  const otherLists = useMemo(
    () => (Array.isArray(allLists) ? allLists.filter((item) => item._id !== list._id) : []),
    [allLists, list._id]
  );

  const resetEditState = () => {
    setIsEditing(false);
    setName(list.name);
    setDeleteMode('move');
    setTargetListId('');
    setNewListName('');
    setIsCreatingTargetList(false);
  };

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
      onCardAdded?.();
    } catch (err) {
      console.error(t('createCardError'), err);
    }
  };

  const handleUpdateList = async () => {
    if (!name.trim()) return;
    try {
      await listService.updateList(list._id, { name: name.trim() });
      setIsEditing(false);
      onListUpdated?.();
    } catch (err) {
      console.error(t('updateListError'), err);
    }
  };

  const handleDeleteList = async () => {
    try {
      if (cards.length === 0) {
        const ok = window.confirm(t('deleteListConfirm'));
        if (!ok) return;
        await listService.deleteList(list._id);
      } else if (deleteMode === 'move') {
        if (!targetListId) {
          window.alert(lang === 'vi' ? 'Hay chon danh sach dich de di chuyen card.' : 'Please choose a destination list first.');
          return;
        }

        await listService.deleteList(list._id, {
          strategy: 'move',
          targetListId,
        });
      } else {
        const ok = window.confirm(
          lang === 'vi'
            ? 'Luu tru tat ca card trong danh sach nay roi xoa danh sach? Ban van co the xem card trong muc luu tru.'
            : 'Archive all cards in this list and then delete the list? You can still view them in the archive.'
        );
        if (!ok) return;

        await listService.deleteList(list._id, {
          strategy: 'archive',
        });
      }

      resetEditState();
      onListUpdated?.();
    } catch (err) {
      console.error(t('deleteListError'), err);
    }
  };

  const handleCreateTargetList = async () => {
    const trimmedName = newListName.trim();
    if (!trimmedName || isCreatingTargetList) return;

    try {
      setIsCreatingTargetList(true);
      const response = await listService.createList({
        name: trimmedName,
        boardId: list.board,
      });
      const createdList = response?.data ?? response;
      if (createdList?._id) {
        setTargetListId(createdList._id);
        setNewListName('');
        onListUpdated?.();
      }
    } catch (err) {
      console.error(t('createListError'), err);
    } finally {
      setIsCreatingTargetList(false);
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
                onClick={() => onCardClick?.(card._id)}
                className="w-full text-left"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  display: 'block',
                }}
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
                autoFocus
                className="mb-2 w-full rounded-xl border border-white/12 bg-slate-950/85 px-3 py-2 text-sm text-white shadow-sm placeholder:text-white/35 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder={t('cardTitlePlaceholder')}
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
                  color: 'white',
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
        <div
          className="modal-overlay"
          onClick={resetEditState}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: 420,
              maxHeight: 'min(88vh, 640px)',
              padding: 20,
              background: 'linear-gradient(180deg, rgba(12,18,32,.98), rgba(16,24,40,.98))',
              border: '1px solid rgba(255,255,255,.08)',
              color: 'white',
              boxShadow: '0 24px 54px rgba(0,0,0,.45)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 16,
                color: 'rgba(255,255,255,.96)',
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
                  resetEditState();
                }
              }}
              autoFocus
              style={{
                background: 'rgba(2,6,23,.82)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'white',
              }}
            />
            {cards.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid rgba(255,255,255,.1)',
                }}
              >
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,.72)', lineHeight: 1.5 }}>
                  {lang === 'vi'
                    ? `Danh sach nay dang co ${cards.length} card. Hay chon cach xu ly truoc khi xoa.`
                    : `This list still contains ${cards.length} cards. Choose how to handle them before deleting.`}
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDeleteMode('move')}
                    style={deleteMode === 'move'
                      ? {
                        borderColor: 'rgba(59,130,246,.55)',
                        background: 'rgba(37,99,235,.2)',
                        color: '#bfdbfe',
                      }
                      : {
                        background: 'rgba(255,255,255,.08)',
                        borderColor: 'rgba(255,255,255,.08)',
                        color: 'rgba(255,255,255,.82)',
                      }}
                  >
                    {lang === 'vi' ? 'Di chuyen card' : 'Move cards'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDeleteMode('archive')}
                    style={deleteMode === 'archive'
                      ? {
                        borderColor: 'rgba(245,158,11,.55)',
                        background: 'rgba(245,158,11,.18)',
                        color: '#fde68a',
                      }
                      : {
                        background: 'rgba(255,255,255,.08)',
                        borderColor: 'rgba(255,255,255,.08)',
                        color: 'rgba(255,255,255,.82)',
                      }}
                  >
                    {lang === 'vi' ? 'Luu tru card' : 'Archive cards'}
                  </button>
                </div>
                {deleteMode === 'move' ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <select
                      className="input"
                      value={targetListId}
                      onChange={(event) => setTargetListId(event.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(2,6,23,.88)',
                        border: '1px solid rgba(255,255,255,.12)',
                        color: 'white',
                      }}
                    >
                      <option value="" style={{ background: '#0f172a', color: 'white' }}>
                        {lang === 'vi' ? 'Chon danh sach dich...' : 'Choose a destination list...'}
                      </option>
                      {otherLists.map((item) => (
                        <option key={item._id} value={item._id} style={{ background: '#0f172a', color: 'white' }}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
                        {lang === 'vi'
                          ? 'Hoac tao danh sach moi ngay tai day roi chuyen card sang do.'
                          : 'Or create a new list here and move the cards into it.'}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={newListName}
                          onChange={(event) => setNewListName(event.target.value)}
                          placeholder={lang === 'vi' ? 'Ten danh sach moi...' : 'New list name...'}
                          style={{
                            flex: 1,
                            background: 'rgba(2,6,23,.88)',
                            border: '1px solid rgba(255,255,255,.12)',
                            color: 'white',
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleCreateTargetList();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleCreateTargetList}
                          disabled={isCreatingTargetList || !newListName.trim()}
                          style={{
                            background: 'rgba(37,99,235,.18)',
                            borderColor: 'rgba(59,130,246,.35)',
                            color: '#bfdbfe',
                            opacity: isCreatingTargetList || !newListName.trim() ? 0.6 : 1,
                          }}
                        >
                          {isCreatingTargetList
                            ? (lang === 'vi' ? 'Dang tao...' : 'Creating...')
                            : (lang === 'vi' ? 'Tao list moi' : 'Create list')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.5 }}>
                    {lang === 'vi'
                      ? 'Tat ca card se duoc luu tru, sau do danh sach nay moi bi xoa.'
                      : 'All cards will be archived first, then this list will be deleted.'}
                  </p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteList}>
                {t('deleteList')}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={resetEditState}
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
