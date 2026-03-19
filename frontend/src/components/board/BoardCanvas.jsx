// frontend/src/components/board/BoardCanvas.jsx
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
    aiSearchBtn:     'AI tìm card',
    aiSearchNoResult:'Không tìm thấy card phù hợp',
    aiSearchError:   'Không thể tìm kiếm với AI',
    listLabel:       'Danh sách',
    addAnotherList:  '+ Thêm danh sách khác',
    listNamePh:      'Tên danh sách...',
    addList:         'Thêm danh sách',
    cancel:          'Huỷ',
    trashHint:       'Kéo vào đây để xoá',
    archiveHint:     'Kéo vào đây để lưu trữ',
    loadingBoard:    'Đang tải bảng...',
    boardError:      'Lỗi tải dữ liệu bảng',
    deleteCardError: 'Không thể xoá card',
    moveCardError:   'Không thể di chuyển card',
    createListError: 'Không thể tạo danh sách',
    archiveOk:       'Đã lưu trữ card',
    archiveFail:     'Không thể lưu trữ',
    filterActive:    n => `Lọc (${n})`,
    copiedLink:      'Đã sao chép link!',
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
    aiSearchBtn:     'AI search cards',
    aiSearchNoResult:'No matching cards found',
    aiSearchError:   'Could not search with AI',
    listLabel:       'List',
    addAnotherList:  '+ Add another list',
    listNamePh:      'List name...',
    addList:         'Add list',
    cancel:          'Cancel',
    trashHint:       'Drag here to delete',
    archiveHint:     'Drag here to archive',
    loadingBoard:    'Loading board...',
    boardError:      'Failed to load board',
    deleteCardError: 'Could not delete card',
    moveCardError:   'Could not move card',
    createListError: 'Could not create list',
    archiveOk:       'Card archived',
    archiveFail:     'Could not archive',
    filterActive:    n => `Filter (${n})`,
    copiedLink:      'Link copied!',
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
  const [showFilter,     setShowFilter]     = useState(false);
  const [filter,         setFilter]         = useState(EMPTY_FILTER);
  const [showMembers,    setShowMembers]     = useState(false);

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

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-white gap-2">
      <div className="spinner border-white" /><span>{l.loadingBoard}</span>
    </div>
  );
  if (isError) return <div className="text-center p-10 text-white">{l.boardError}</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden board-surface rounded-2xl border border-white/10">

      {/* ─── Header ─── */}
      {showHeader && (
        <div className="px-6 pt-6">
          <div className="board-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-emerald-100/70">{l.workspaceBoard}</div>
                <h1 className="board-title heading-soft text-2xl md:text-3xl font-semibold mt-1">{board?.name}</h1>
                {board?.description && <p className="text-sm text-emerald-50/70 mt-1">{board.description}</p>}
              </div>
              <StarButton board={board} size="md" showLabel labelStar={l.star} labelUnstar={l.unstar}
                onToggle={() => queryClient.invalidateQueries(['board', boardId])} />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Filter button */}
              <div style={{ position: 'relative' }}>
                <button className="board-button" onClick={() => setShowFilter(v => !v)}
                  style={activeFilters > 0 ? { background: 'rgba(52,211,153,.2)', borderColor: 'rgba(52,211,153,.4)', color: '#34d399' } : {}}>
                  🔍 {activeFilters > 0 ? l.filterActive(activeFilters) : l.filter}
                </button>
                {showFilter && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9000 }}>
                    <FilterBar lang={lang} filter={filter} onChange={setFilter} onClose={() => setShowFilter(false)} />
                  </div>
                )}
              </div>

              {/* Members */}
              <button className="board-button" onClick={() => setShowMembers(true)}>
                👥 {l.members}
              </button>

              {/* Share */}
              <button className="board-button" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success(l.copiedLink);
              }}>
                🔗 {l.share}
              </button>
            </div>
          </div>

          {/* AI Search */}
          <div className="mt-3 bg-white/10 border border-white/10 rounded-2xl p-3">
            <div className="flex flex-col md:flex-row gap-2">
              <input className="input" placeholder={l.aiSearchPh} value={aiSearchQuery}
                onChange={e => setAiSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aiSearchQuery.trim() && aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() })} />
              <button type="button" className="btn btn-primary"
                onClick={() => aiSearchQuery.trim() && aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() })}
                disabled={aiSearchMutation.isPending}>
                {aiSearchMutation.isPending ? l.aiSearching : l.aiSearchBtn}
              </button>
              {aiSearchResult && <button type="button" className="btn btn-secondary" onClick={() => setAiSearchResult(null)}>✕</button>}
            </div>
            {!!aiSearchResult?.cards?.length && (
              <div className="mt-3 space-y-2 max-h-56 overflow-auto custom-scrollbar">
                {aiSearchResult.cards.map(card => (
                  <button key={card._id} type="button"
                    className="w-full text-left rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                    onClick={() => setSelectedCardId(card._id)}>
                    <div className="text-sm text-white font-medium">{card.title}</div>
                    <div className="text-xs text-emerald-100/70 mt-1">{l.listLabel}: {card.list?.name || 'N/A'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DnD Board ─── */}
      <DndContext sensors={sensors} collisionDetection={rectIntersection}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragMove={handleDragMove}
        onDragOver={e => { if (e.over?.id) lastOverId.current = e.over.id; }}
        onDragCancel={() => { overZoneRef.current = null; setTrashHover(false); setArchiveHover(false); }}>

        <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start custom-scrollbar">
          {filteredLists.map(list => (
            <ListColumn key={list._id} list={list}
              onCardClick={id => setSelectedCardId(id)}
              onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
              onListUpdated={() => queryClient.invalidateQueries(['board', boardId])} />
          ))}

          {/* Add list */}
          <div className="w-72 shrink-0">
            {isAddingList ? (
              <div className="bg-white/90 rounded-2xl p-4 shadow-xl">
                <input className="input mb-2" placeholder={l.listNamePh} value={listName}
                  onChange={e => setListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setIsAddingList(false); }}
                  autoFocus />
                <div className="flex gap-2">
                  <button onClick={handleAddList} className="btn btn-primary btn-sm">{l.addList}</button>
                  <button onClick={() => { setIsAddingList(false); setListName(''); }} className="text-slate-600">{l.cancel}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsAddingList(true)}
                className="w-full bg-white/15 hover:bg-white/25 text-white p-4 rounded-2xl text-left font-semibold transition-all border border-white/10">
                {l.addAnotherList}
              </button>
            )}
          </div>
        </div>

        {/* ─── Drop zones ─── */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <div ref={node => { trash.setNodeRef(node); trashRef.current = node; }}
            className={`border border-dashed rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 transition flex items-center justify-center gap-2 ${
              trash.isOver || trashHover ? 'border-red-300 bg-red-500/20 text-white' : 'border-white/15 bg-white/5'
            }`}>
            🗑️ {l.trashHint}
          </div>
          <div ref={node => { archive.setNodeRef(node); archiveRef.current = node; }}
            className={`border border-dashed rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 transition flex items-center justify-center gap-2 ${
              archive.isOver || archiveHover ? 'border-yellow-300 bg-yellow-500/20 text-white' : 'border-white/15 bg-white/5'
            }`}>
            📦 {l.archiveHint}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="shadow-2xl rotate-2 w-64 opacity-90 p-3 rounded-xl bg-white text-slate-800 font-medium text-sm">
              {activeCard.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Members Panel */}
      {showMembers && workspaceId && (
        <BoardMembersPanel boardId={boardId} workspaceId={workspaceId} lang={lang}
          onClose={() => setShowMembers(false)} />
      )}

      {/* Card Modal */}
      {selectedCardId && (
        <CardModal cardId={selectedCardId} boardId={boardId}
          onClose={() => {
            setSelectedCardId(null);
            queryClient.invalidateQueries(['board', boardId]);
          }} />
      )}
    </div>
  );
}