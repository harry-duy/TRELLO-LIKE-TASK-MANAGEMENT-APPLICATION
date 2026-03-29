import { useMemo, useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cardService from '@services/cardService';
import listService from '@services/listService';
import { useTranslation } from '@hooks/useTranslation';
import { SortableCard } from './SortableCard';

export default function ListColumn({ list, onCardAdded, onCardClick, onListUpdated, columnWidth, allLists = [] }) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);

  // State cho modal chuyển card khi xóa list
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetListId, setTargetListId]   = useState('');
  const [isDeleting, setIsDeleting]       = useState(false);

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

  const activeCards   = useMemo(() => cards.filter(c => !c.isArchived), [cards]);
  const otherLists    = useMemo(() => allLists.filter(l => l._id !== list._id), [allLists, list._id]);

  const handleDeleteList = () => {
    if (activeCards.length > 0) {
      // Còn card → mở modal chọn list đích
      setTargetListId(otherLists[0]?._id || '');
      setShowMoveModal(true);
      setIsEditing(false);
    } else {
      // Không có card → xác nhận rồi xóa luôn
      if (!window.confirm(t('deleteListConfirm'))) return;
      doDeleteList(null);
    }
  };

  const doDeleteList = async (moveToListId) => {
    setIsDeleting(true);
    try {
      await listService.deleteList(list._id, moveToListId || null);
      setShowMoveModal(false);
      setIsEditing(false);
      onListUpdated?.();
    } catch (err) {
      console.error(t('deleteListError'), err);
    }
    setIsDeleting(false);
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
                className="w-full p-2 border rounded-lg shadow-sm mb-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
          onClick={() => {
            setIsEditing(false);
            setName(list.name);
          }}
        >
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
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
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

      {/* ── Modal chuyển card khi xóa list còn card ── */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => !isDeleting && setShowMoveModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 400, padding: 24, background: 'rgba(13,22,41,.98)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>📦</span>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>
                  Chuyển card trước khi xóa
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                  List <strong style={{ color: 'rgba(255,255,255,.8)' }}>"{list.name}"</strong> đang chứa{' '}
                  <strong style={{ color: '#fbbf24' }}>{activeCards.length} card</strong>.
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 14 }}>
              Chọn list để chuyển toàn bộ card sang trước khi xóa:
            </p>

            {otherLists.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>
                  Không có list nào khác trong board này.
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 6 }}>
                  Hãy tạo thêm ít nhất một list mới trước khi xóa list này.
                </p>
              </div>
            ) : (
              <>
                <select
                  className="input"
                  style={{ width: '100%', marginBottom: 16 }}
                  value={targetListId}
                  onChange={(e) => setTargetListId(e.target.value)}
                >
                  {otherLists.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}
                      {l.cards?.length ? ` (${l.cards.length} card)` : ''}
                    </option>
                  ))}
                </select>

                {/* Preview */}
                {targetListId && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(52,211,153,.08)',
                    border: '1px solid rgba(52,211,153,.2)',
                    fontSize: 12,
                    color: 'rgba(167,243,208,.8)',
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}>
                    {activeCards.length} card từ <strong>"{list.name}"</strong> sẽ được chuyển sang{' '}
                    <strong>"{otherLists.find(l => l._id === targetListId)?.name}"</strong>,
                    sau đó list <strong>"{list.name}"</strong> sẽ bị xóa vĩnh viễn.
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowMoveModal(false)}
                disabled={isDeleting}
              >
                Huỷ
              </button>
              {otherLists.length > 0 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={!targetListId || isDeleting}
                  onClick={() => doDeleteList(targetListId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isDeleting ? (
                    <><div className="spinner" style={{ width: 12, height: 12 }} /> Đang xử lý...</>
                  ) : (
                    'Chuyển card & Xóa list'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
