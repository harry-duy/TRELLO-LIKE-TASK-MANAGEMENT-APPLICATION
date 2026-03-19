// frontend/src/components/board/BoardCanvas.jsx
// ✅ Professional Trello-dark redesign
// ✅ ALL logic/functions preserved — visual only changes
// ✅ FilterBar ✅ Members panel ✅ Archive zone ✅ Labels/DueDate ✅ Star

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, rectIntersection, PointerSensor,
  useSensor, useSensors, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { useUiStore }    from '@store/uiStore';
import { useAuthStore }  from '@store/authStore';
import boardService      from '@services/boardService';
import cardService       from '@services/cardService';
import listService       from '@services/listService';
import aiService         from '@services/aiService';
import ListColumn        from '@components/board/ListColumn';
import CardModal         from '@components/card/CardModal';
import StarButton        from '@components/board/StarButton';
import FilterBar, { applyFilters, countActiveFilters } from '@components/board/FilterBar';
import BoardMembersPanel from '@components/board/BoardMembersPanel';
import {
  initializeSocket, joinBoard, leaveBoard,
  onCardMoved, emitCardMove, onCommentAdded,
} from '@config/socket';
import toast from 'react-hot-toast';

/* ─── i18n ─── */
const L = {
  vi: {
    workspaceBoard:  'Bảng làm việc',
    filter:          'Lọc',
    members:         'Thành viên',
    share:           'Chia sẻ',
    star:            'Đánh dấu',
    unstar:          'Bỏ đánh dấu',
    aiSearchPh:      "AI Search: ví dụ 'task backend quá hạn'",
    aiSearching:     'Đang tìm...',
    aiSearchBtn:     'Tìm',
    aiSearchNoResult:'Không tìm thấy card phù hợp',
    aiSearchError:   'Không thể tìm kiếm với AI',
    listLabel:       'Danh sách',
    addAnotherList:  '+ Thêm danh sách',
    listNamePh:      'Tên danh sách...',
    addList:         'Thêm',
    cancel:          'Huỷ',
    trashHint:       'Kéo để xoá',
    archiveHint:     'Kéo để lưu trữ',
    loadingBoard:    'Đang tải...',
    boardError:      'Lỗi tải bảng',
    deleteCardError: 'Không thể xoá card',
    moveCardError:   'Không thể di chuyển card',
    createListError: 'Không thể tạo danh sách',
    archiveOk:       'Đã lưu trữ card',
    archiveFail:     'Không thể lưu trữ',
    filterActive:    n => `Lọc (${n})`,
    copiedLink:      'Đã sao chép link!',
    aiAssist:        'AI Search',
  },
  en: {
    workspaceBoard:  'Board',
    filter:          'Filter',
    members:         'Members',
    share:           'Share',
    star:            'Star',
    unstar:          'Starred',
    aiSearchPh:      "AI Search: e.g. 'overdue backend task'",
    aiSearching:     'Searching...',
    aiSearchBtn:     'Search',
    aiSearchNoResult:'No matching cards found',
    aiSearchError:   'Could not search with AI',
    listLabel:       'List',
    addAnotherList:  '+ Add a list',
    listNamePh:      'List name...',
    addList:         'Add list',
    cancel:          'Cancel',
    trashHint:       'Drag to delete',
    archiveHint:     'Drag to archive',
    loadingBoard:    'Loading...',
    boardError:      'Failed to load board',
    deleteCardError: 'Could not delete card',
    moveCardError:   'Could not move card',
    createListError: 'Could not create list',
    archiveOk:       'Card archived',
    archiveFail:     'Could not archive',
    filterActive:    n => `Filter (${n})`,
    copiedLink:      'Link copied!',
    aiAssist:        'AI Search',
  },
};

const EMPTY_FILTER = { keyword: '', labels: [], dueStatus: '' };

export default function BoardCanvas({ boardId, showHeader = true }) {
  const queryClient = useQueryClient();
  const lang = useUiStore(s => s.language) || 'vi';
  const l    = L[lang] || L.vi;

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeCard,     setActiveCard]     = useState(null);
  const [isAddingList,   setIsAddingList]   = useState(false);
  const [listName,       setListName]       = useState('');
  const [aiSearchQuery,  setAiSearchQuery]  = useState('');
  const [aiSearchResult, setAiSearchResult] = useState(null);
  const [showAiSearch,   setShowAiSearch]   = useState(false);
  const [showFilter,     setShowFilter]     = useState(false);
  const [filter,         setFilter]         = useState(EMPTY_FILTER);
  const [showMembers,    setShowMembers]    = useState(false);

  const trash   = useDroppable({ id: 'trash' });
  const archive = useDroppable({ id: 'archive' });
  const trashRef   = useRef(null);
  const archiveRef = useRef(null);
  const [trashHover,   setTrashHover]   = useState(false);
  const [archiveHover, setArchiveHover] = useState(false);
  const lastOverId  = useRef(null);
  const overZoneRef = useRef(null);

  /* ─── Query ─── */
  const { data: boardRaw, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn:  () => boardService.getBoardDetails(boardId),
    enabled:  !!boardId,
  });
  const board = boardRaw?.data ?? boardRaw;

  const aiSearchMutation = useMutation({
    mutationFn: ({ boardId: bid, query }) => aiService.searchCards({ boardId: bid, query }),
    onSuccess: res => {
      setAiSearchResult(res);
      if (!(res?.cards || []).length) toast(l.aiSearchNoResult);
    },
    onError: err => toast.error(err?.message || l.aiSearchError),
  });

  /* ─── Socket ─── */
  useEffect(() => {
    if (!boardId) return;
    initializeSocket();
    joinBoard(boardId);
    const u1 = onCardMoved(() => queryClient.invalidateQueries(['board', boardId]));
    const u2 = onCommentAdded(data => {
      if (selectedCardId === data.cardId) queryClient.invalidateQueries(['card', data.cardId]);
    });
    return () => { leaveBoard(boardId); u1?.(); u2?.(); };
  }, [boardId, queryClient, selectedCardId]);

  /* ─── DnD ─── */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const getZoneHit = (e) => {
    const hit = (ref) => {
      if (!ref.current) return false;
      const r = ref.current.getBoundingClientRect();
      const t = e?.active?.rect?.current?.translated;
      if (!t) return false;
      const cx = t.left + t.width / 2, cy = t.top + t.height / 2;
      return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    };
    return hit(trashRef) ? 'trash' : hit(archiveRef) ? 'archive' : null;
  };

  const handleDragStart = ({ active }) => {
    if (active?.data?.current?.type !== 'card') { setActiveCard(null); return; }
    const card = board?.lists?.flatMap(l => l.cards || []).find(c => c._id === active.id);
    setActiveCard(card || null);
  };

  const handleDragMove = (e) => {
    const z = getZoneHit(e);
    overZoneRef.current = z;
    setTrashHover(z === 'trash');
    setArchiveHover(z === 'archive');
  };

  const handleDragEnd = async ({ active, over }) => {
    const cardId = active.id;
    const zone   = overZoneRef.current || (over?.id === 'trash' ? 'trash' : over?.id === 'archive' ? 'archive' : null);
    const overId = zone || over?.id || lastOverId.current || null;
    setActiveCard(null); lastOverId.current = null; overZoneRef.current = null;
    setTrashHover(false); setArchiveHover(false);
    if (!overId) return;

    if (zone === 'trash') {
      try { await cardService.delete(cardId); queryClient.invalidateQueries(['board', boardId]); }
      catch { toast.error(l.deleteCardError); }
      return;
    }
    if (zone === 'archive') {
      try {
        await cardService.update(cardId, { isArchived: true });
        queryClient.invalidateQueries(['board', boardId]);
        toast.success(l.archiveOk);
      } catch { toast.error(l.archiveFail); }
      return;
    }

    const sourceList = board?.lists?.find(li => (li.cards || []).some(c => c._id === cardId));
    const destList   = board?.lists?.find(li => li._id === overId || li.cards?.some(c => c._id === overId));
    if (!sourceList || !destList) return;

    const fromListId = sourceList._id;
    const toListId   = destList._id;
    let position     = destList.cards?.length || 0;
    const overIdx    = (destList.cards || []).findIndex(c => c._id === overId);
    if (overIdx >= 0) position = overIdx;

    try {
      queryClient.setQueryData(['board', boardId], prev => {
        if (!prev) return prev;
        const bd = prev.lists ? prev : prev.data;
        if (!bd) return prev;
        const cloned = { ...bd, lists: bd.lists.map(li => ({ ...li, cards: [...(li.cards || [])] })) };
        const from = cloned.lists.find(li => li._id === fromListId);
        const to   = cloned.lists.find(li => li._id === toListId);
        if (!from || !to) return prev;
        const idx = from.cards.findIndex(c => c._id === cardId);
        if (idx === -1) return prev;
        const [card] = from.cards.splice(idx, 1);
        card.list = to._id;
        to.cards.splice(Math.max(0, Math.min(position, to.cards.length)), 0, card);
        return prev.lists ? cloned : { ...prev, data: cloned };
      });
      await cardService.moveCard(cardId, { listId: toListId, position, boardId });
      emitCardMove({ boardId, cardId, fromListId, toListId, position });
    } catch {
      toast.error(l.moveCardError);
      queryClient.invalidateQueries(['board', boardId]);
    }
  };

  const handleAddList = async () => {
    if (!listName.trim()) return;
    try {
      await listService.createList({ name: listName.trim(), boardId });
      setListName(''); setIsAddingList(false);
      queryClient.invalidateQueries(['board', boardId]);
    } catch { toast.error(l.createListError); }
  };

  const filteredLists  = applyFilters(board?.lists || [], filter);
  const activeFilters  = countActiveFilters(filter);
  const workspaceId    = board?.workspace?._id || board?.workspace;

  /* ─── Board background color/image ─── */
  const boardBg = board?.background || '#1158cb';
  const isHexColor = /^#[0-9a-fA-F]+$/.test(boardBg);

  if (isLoading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 10, color: 'var(--color-text-secondary)',
    }}>
      <div className="spinner" />
      <span>{l.loadingBoard}</span>
    </div>
  );
  if (isError) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
      {l.boardError}
    </div>
  );

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '8px',
      overflow: 'hidden',
      background: isHexColor ? boardBg : '#1558CB',
    }}>

      {/* ─── Board Header ─── */}
      {showHeader && (
        <div className="board-header">
          {/* Board name + star */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <h1 className="board-title">{board?.name}</h1>
            <StarButton
              board={board}
              size="sm"
              labelStar={l.star}
              labelUnstar={l.unstar}
              onToggle={() => queryClient.invalidateQueries(['board', boardId])}
            />
          </div>

          {/* Header actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* AI Search toggle */}
            <button
              className="board-button"
              onClick={() => setShowAiSearch(v => !v)}
              style={showAiSearch ? { background: 'rgba(255,255,255,.32)' } : {}}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {l.aiAssist}
            </button>

            {/* Filter */}
            <div style={{ position: 'relative' }}>
              <button
                className="board-button"
                onClick={() => setShowFilter(v => !v)}
                style={activeFilters > 0 ? { background: 'rgba(87,157,255,.28)', color: '#79bbff' } : {}}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {activeFilters > 0 ? l.filterActive(activeFilters) : l.filter}
              </button>
              {showFilter && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9000 }}>
                  <FilterBar lang={lang} filter={filter} onChange={setFilter} onClose={() => setShowFilter(false)} />
                </div>
              )}
            </div>

            {/* Members */}
            <button className="board-button" onClick={() => setShowMembers(true)}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1 13.5C1 11 3 9.5 6 9.5s5 1.5 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M11 7.5c1.1 0 2 .5 2.5 1.5M13 3.5a2 2 0 010 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {l.members}
            </button>

            {/* Share */}
            <button
              className="board-button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success(l.copiedLink);
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="12.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="3.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="12.5" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5.3 7L10.7 4.5M10.7 11.5L5.3 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {l.share}
            </button>
          </div>
        </div>
      )}

      {/* ─── AI Search Panel ─── */}
      {showAiSearch && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(0,0,0,.16)',
          borderBottom: '1px solid rgba(255,255,255,.1)',
        }}>
          <div style={{ display: 'flex', gap: 8, maxWidth: 600 }}>
            <input
              className="input"
              placeholder={l.aiSearchPh}
              value={aiSearchQuery}
              onChange={e => setAiSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && aiSearchQuery.trim())
                  aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() });
              }}
              style={{
                background: 'rgba(255,255,255,.14)',
                borderColor: 'rgba(255,255,255,.16)',
                color: 'white',
                flex: 1,
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => aiSearchQuery.trim() && aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() })}
              disabled={aiSearchMutation.isPending}
              style={{ flexShrink: 0 }}
            >
              {aiSearchMutation.isPending ? l.aiSearching : l.aiSearchBtn}
            </button>
            {aiSearchResult && (
              <button
                type="button"
                onClick={() => setAiSearchResult(null)}
                style={{
                  padding: '0 10px',
                  background: 'rgba(255,255,255,.14)',
                  border: 'none',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {!!aiSearchResult?.cards?.length && (
            <div style={{
              marginTop: 8,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              maxHeight: 120,
              overflowY: 'auto',
            }}>
              {aiSearchResult.cards.map(card => (
                <button
                  key={card._id}
                  type="button"
                  onClick={() => setSelectedCardId(card._id)}
                  style={{
                    background: 'rgba(255,255,255,.14)',
                    border: '1px solid rgba(255,255,255,.16)',
                    borderRadius: 4,
                    padding: '4px 10px',
                    color: 'white',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}
                >
                  {card.title}
                  {card.list?.name && (
                    <span style={{ opacity: 0.6, marginLeft: 6 }}>· {card.list.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DnD Board ─── */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onDragOver={e => { if (e.over?.id) lastOverId.current = e.over.id; }}
        onDragCancel={() => {
          overZoneRef.current = null;
          setTrashHover(false);
          setArchiveHover(false);
        }}
      >
        {/* Columns scroll area */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '12px 16px 0',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          {filteredLists.map(list => (
            <ListColumn
              key={list._id}
              list={list}
              onCardClick={id => setSelectedCardId(id)}
              onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
              onListUpdated={() => queryClient.invalidateQueries(['board', boardId])}
            />
          ))}

          {/* Add List */}
          <div style={{ flexShrink: 0 }}>
            {isAddingList ? (
              <div style={{
                width: 272,
                background: 'rgba(22,33,57,.95)',
                borderRadius: 12,
                padding: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,.4)',
              }}>
                <input
                  autoFocus
                  className="input"
                  placeholder={l.listNamePh}
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddList();
                    if (e.key === 'Escape') { setIsAddingList(false); setListName(''); }
                  }}
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAddList}>{l.addList}</button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingList(false); setListName(''); }}
                    style={{
                      width: 28, height: 28,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', borderRadius: 4,
                      background: 'transparent',
                      color: 'rgba(255,255,255,.6)',
                      cursor: 'pointer', fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="add-list-btn"
                onClick={() => setIsAddingList(true)}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                {l.addAnotherList}
              </button>
            )}
          </div>
        </div>

        {/* ─── Drop zones ─── */}
        <div style={{ padding: '8px 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div
            ref={node => { trash.setNodeRef(node); trashRef.current = node; }}
            style={{
              border: '2px dashed',
              borderColor: (trash.isOver || trashHover) ? 'var(--color-danger)' : 'rgba(255,255,255,.2)',
              background: (trash.isOver || trashHover) ? 'rgba(248,113,104,.12)' : 'rgba(0,0,0,.12)',
              borderRadius: 8,
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: (trash.isOver || trashHover) ? 'var(--color-danger)' : 'rgba(255,255,255,.4)',
              transition: 'all 150ms',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {l.trashHint}
          </div>

          <div
            ref={node => { archive.setNodeRef(node); archiveRef.current = node; }}
            style={{
              border: '2px dashed',
              borderColor: (archive.isOver || archiveHover) ? 'var(--color-warning)' : 'rgba(255,255,255,.2)',
              background: (archive.isOver || archiveHover) ? 'rgba(245,166,35,.12)' : 'rgba(0,0,0,.12)',
              borderRadius: 8,
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: (archive.isOver || archiveHover) ? 'var(--color-warning)' : 'rgba(255,255,255,.4)',
              transition: 'all 150ms',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M3 4.5v9a1 1 0 001 1h8a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6.5 7.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {l.archiveHint}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeCard ? (
            <div style={{
              padding: '8px 10px',
              background: 'var(--color-bg-card)',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,.5)',
              transform: 'rotate(3deg)',
              width: 252,
              opacity: 0.95,
              fontSize: 14,
              color: 'var(--color-text-heading)',
              fontWeight: 400,
              border: '1px solid rgba(87,157,255,.3)',
            }}>
              {activeCard.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Members Panel */}
      {showMembers && workspaceId && (
        <BoardMembersPanel
          boardId={boardId}
          workspaceId={workspaceId}
          lang={lang}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Card Modal */}
      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={boardId}
          onClose={() => {
            setSelectedCardId(null);
            queryClient.invalidateQueries(['board', boardId]);
          }}
        />
      )}
    </div>
  );
}