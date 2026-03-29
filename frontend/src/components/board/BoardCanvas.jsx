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
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
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
import ArchivePanel      from '@components/board/ArchivePanel';
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
    reorderListError:'Không thể đổi vị trí danh sách',
    archiveOk:       'Đã lưu trữ card',
    archiveFail:     'Không thể lưu trữ',
    filterActive:    n => `Lọc (${n})`,
    copiedLink:      'Đã sao chép link!',
    aiAssist:        'AI Search',
    archive:         'Lưu trữ',
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
    reorderListError:'Could not reorder list',
    archiveOk:       'Card archived',
    archiveFail:     'Could not archive',
    filterActive:    n => `Filter (${n})`,
    copiedLink:      'Link copied!',
    aiAssist:        'AI Search',
    archive:         'Archive',
  },
};

const EMPTY_FILTER = { keyword: '', labels: [], dueStatus: '' };

export default function BoardCanvas({ boardId, showHeader = true }) {
  const queryClient = useQueryClient();
  const lang = useUiStore(s => s.language) || 'vi';
  const l    = L[lang] || L.vi;
  const authReady = useAuthStore(s => !s.isLoading && !!s.accessToken);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeCard,     setActiveCard]     = useState(null);
  const [activeList,     setActiveList]     = useState(null);
  const [isAddingList,   setIsAddingList]   = useState(false);
  const [listName,       setListName]       = useState('');
  const [aiSearchQuery,  setAiSearchQuery]  = useState('');
  const [aiSearchResult, setAiSearchResult] = useState(null);
  const [showAiSearch,   setShowAiSearch]   = useState(false);
  const [showFilter,     setShowFilter]     = useState(false);
  const [filter,         setFilter]         = useState(EMPTY_FILTER);
  const [showMembers,    setShowMembers]    = useState(false);
  const [showArchive,    setShowArchive]    = useState(false);

  const archive = useDroppable({ id: 'archive' });
  const archiveRef = useRef(null);
  const columnsRef = useRef(null);
  const [archiveHover, setArchiveHover] = useState(false);
  const lastOverId  = useRef(null);
  const overZoneRef = useRef(null);

  /* ─── Query ─── */
  const { data: boardRaw, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn:  () => boardService.getBoardDetails(boardId),
    enabled:  !!boardId && authReady,
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
    if (!boardId || !authReady) return;
    initializeSocket();
    joinBoard(boardId);
    const u1 = onCardMoved(() => queryClient.invalidateQueries(['board', boardId]));
    const u2 = onCommentAdded(data => {
      if (selectedCardId === data.cardId) queryClient.invalidateQueries(['card', data.cardId]);
    });
    return () => { leaveBoard(boardId); u1?.(); u2?.(); };
  }, [authReady, boardId, queryClient, selectedCardId]);

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
    return hit(archiveRef) ? 'archive' : null;
  };

  const handleDragStart = ({ active }) => {
    const dragType = active?.data?.current?.type;

    if (dragType === 'card') {
      const card = board?.lists?.flatMap(l => l.cards || []).find(c => c._id === active.id);
      setActiveCard(card || null);
      setActiveList(null);
      return;
    }

    if (dragType === 'list') {
      const list = board?.lists?.find(li => li._id === active.id);
      setActiveList(list || null);
      setActiveCard(null);
      return;
    }

    setActiveCard(null);
    setActiveList(null);
  };

  const handleDragMove = (e) => {
    const z = getZoneHit(e);
    overZoneRef.current = z;
    setArchiveHover(z === 'archive');
  };

  const handleDragEnd = async ({ active, over }) => {
    if (active?.data?.current?.type === 'list') {
      setActiveCard(null);
      setActiveList(null);
      setArchiveHover(false);
      lastOverId.current = null;
      overZoneRef.current = null;

      if (!over || active.id === over.id || !board?.lists?.length) return;

      const oldIndex = board.lists.findIndex(li => li._id === active.id);
      const newIndex = board.lists.findIndex(li => li._id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reorderedLists = arrayMove(board.lists, oldIndex, newIndex).map((list, index) => ({
        ...list,
        position: index,
      }));

      queryClient.setQueryData(['board', boardId], (prev) => {
        if (!prev) return prev;
        const currentBoard = prev.lists ? prev : prev.data;
        if (!currentBoard) return prev;
        const nextBoard = { ...currentBoard, lists: reorderedLists };
        return prev.lists ? nextBoard : { ...prev, data: nextBoard };
      });

      try {
        await Promise.all(
          reorderedLists.map((list, index) =>
            listService.updateList(list._id, { position: index })
          )
        );
        queryClient.invalidateQueries(['board', boardId]);
      } catch {
        toast.error(l.reorderListError);
        queryClient.invalidateQueries(['board', boardId]);
      }
      return;
    }

    const cardId = active.id;
    const zone   = overZoneRef.current || (over?.id === 'archive' ? 'archive' : null);
    const overId = zone || over?.id || lastOverId.current || null;
    setActiveCard(null); setActiveList(null); lastOverId.current = null; overZoneRef.current = null;
    setArchiveHover(false);
    if (!overId) return;

    if (zone === 'archive') {
      try {
        await cardService.update(cardId, { isArchived: true });
        queryClient.invalidateQueries(['board', boardId]);
        queryClient.invalidateQueries(['archivedCards', boardId]);
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
  const columnWidth =
    filteredLists.length <= 3 ? 320 :
    filteredLists.length === 4 ? 300 :
    filteredLists.length === 5 ? 280 :
    272;

  /* ─── Board background color/image ─── */
  const boardBg = board?.background || '#1158cb';
  const isHexColor = /^#[0-9a-fA-F]+$/.test(boardBg);

  useEffect(() => {
    columnsRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [boardId]);

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
      borderRadius: '20px',
      overflow: 'visible',
      background: isHexColor
        ? `linear-gradient(180deg, ${boardBg}, rgba(6, 30, 53, 0.96))`
        : boardBg,
    }}>

      {/* ─── Board Header ─── */}
      {showHeader && (
        <div className="board-header">
          {/* Board name + star */}
          <div className="board-header-main">
            <span className="board-header-accent" style={{ background: boardBg }} />
            <div className="board-header-copy">
              {board?.workspace?.name ? (
                <div className="board-header-kicker">{board.workspace.name}</div>
              ) : null}
              <div className="board-header-title-row">
                <h1 className="board-title">{board?.name}</h1>
                <StarButton
                  board={board}
                  size="sm"
                  labelStar={l.star}
                  labelUnstar={l.unstar}
                  onToggle={() => queryClient.invalidateQueries(['board', boardId])}
                />
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="board-header-actions">
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

            {/* Archive */}
            <button
              className="board-button"
              onClick={() => setShowArchive(true)}
              style={{ color: '#fbbf24' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="1.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3 4.5v9a1 1 0 001 1h8a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M6.5 7.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {l.archive}
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
        <div className="board-search-panel">
          <div className="board-search-toolbar">
            <input
              className="input board-search-input"
              placeholder={l.aiSearchPh}
              value={aiSearchQuery}
              onChange={e => setAiSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && aiSearchQuery.trim())
                  aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() });
              }}
            />
            <button
              className="btn btn-primary btn-sm"
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
                className="board-inline-close"
              >
                x
              </button>
            )}
          </div>

          {!!aiSearchResult?.cards?.length && (
            <div className="board-search-results">
              {aiSearchResult.cards.map(card => (
                <button
                  key={card._id}
                  type="button"
                  onClick={() => setSelectedCardId(card._id)}
                  className="board-search-chip"
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
          setArchiveHover(false);
        }}
      >
        {/* Columns scroll area */}
        <div
          ref={columnsRef}
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
          <SortableContext
            items={filteredLists.map(list => list._id)}
            strategy={horizontalListSortingStrategy}
          >
            {filteredLists.map(list => (
              <ListColumn
                key={list._id}
                list={list}
                columnWidth={columnWidth}
                onCardClick={id => setSelectedCardId(id)}
                onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
                onListUpdated={() => queryClient.invalidateQueries(['board', boardId])}
              />
            ))}
          </SortableContext>

          {/* Add List */}
          <div style={{ flexShrink: 0 }}>
            {isAddingList ? (
              <div style={{
                width: columnWidth,
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
                    className="board-inline-close"
                  >
                    x
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

        {/* ─── Drop zone: archive only ─── */}
        <div style={{ padding: '8px 16px 16px' }}>
          <div
            ref={node => { archive.setNodeRef(node); archiveRef.current = node; }}
            style={{
              border: '2px dashed',
              borderColor: (archive.isOver || archiveHover) ? 'var(--color-warning)' : 'rgba(255,255,255,.2)',
              background: (archive.isOver || archiveHover) ? 'rgba(245,166,35,.14)' : 'rgba(6,20,35,.22)',
              borderRadius: 16,
              padding: '12px 16px',
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
          ) : activeList ? (
            <div
              className="list-column"
              style={{
                width: columnWidth,
                minWidth: columnWidth,
                opacity: 0.92,
                transform: 'rotate(2deg)',
                boxShadow: '0 26px 46px rgba(0,0,0,.28)',
              }}
            >
              <div className="list-column-header">
                <div className="min-w-0 flex flex-1 items-center gap-2.5">
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
                  <h3 className="list-column-title">{activeList.name}</h3>
                </div>
                <span className="list-column-count">{activeList.cards?.length || 0}</span>
              </div>
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

      {/* Archive Panel */}
      {showArchive && (
        <ArchivePanel
          boardId={boardId}
          lang={lang}
          onClose={() => setShowArchive(false)}
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
