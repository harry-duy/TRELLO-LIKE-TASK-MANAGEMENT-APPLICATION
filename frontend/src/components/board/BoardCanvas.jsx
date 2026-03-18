// frontend/src/components/board/BoardCanvas.jsx
// ✅ StarButton  ✅ i18n VI/EN  ✅ AI Search  ✅ Drag & Drop  ✅ Real-time

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';

import { useUiStore } from '@store/uiStore';
import { useAuthStore } from '@store/authStore';
import boardService from '@services/boardService';
import cardService from '@services/cardService';
import listService from '@services/listService';
import aiService from '@services/aiService';
import apiClient from '@config/api';
import ListColumn from '@components/board/ListColumn';
import CardModal from '@components/card/CardModal';
import StarButton from '@components/board/StarButton';
import {
  initializeSocket,
  joinBoard,
  leaveBoard,
  onCardMoved,
  emitCardMove,
  onCommentAdded,
} from '@config/socket';
import toast from 'react-hot-toast';

/* ─── i18n ─── */
const L = {
  vi: {
    workspaceBoard:    'Bảng làm việc',
    filter:            'Lọc',
    members:           'Thành viên',
    star:              'Đánh dấu',
    unstar:            'Bỏ đánh dấu',
    aiSearchPh:        "AI Search: ví dụ 'task backend quá hạn'",
    aiSearching:       'Đang tìm...',
    aiSearchBtn:       'AI tìm card',
    aiSearchNoResult:  'Không tìm thấy card phù hợp',
    aiSearchError:     'Không thể tìm kiếm với AI',
    listLabel:         'Danh sách',
    addAnotherList:    '+ Thêm danh sách khác',
    listNamePh:        'Tên danh sách...',
    addList:           'Thêm danh sách',
    cancel:            'Huỷ',
    trashHint:         'Kéo thả thẻ vào đây để xoá',
    loadingBoard:      'Đang tải bảng...',
    boardError:        'Lỗi tải dữ liệu bảng',
    deleteCardError:   'Không thể xoá card',
    moveCardError:     'Không thể di chuyển card',
    createListError:   'Không thể tạo danh sách',
  },
  en: {
    workspaceBoard:    'Board',
    filter:            'Filter',
    members:           'Members',
    star:              'Star',
    unstar:            'Starred',
    aiSearchPh:        "AI Search: e.g. 'overdue backend task'",
    aiSearching:       'Searching...',
    aiSearchBtn:       'AI search cards',
    aiSearchNoResult:  'No matching cards found',
    aiSearchError:     'Could not search with AI',
    listLabel:         'List',
    addAnotherList:    '+ Add another list',
    listNamePh:        'List name...',
    addList:           'Add list',
    cancel:            'Cancel',
    trashHint:         'Drag cards here to delete',
    loadingBoard:      'Loading board...',
    boardError:        'Failed to load board',
    deleteCardError:   'Could not delete card',
    moveCardError:     'Could not move card',
    createListError:   'Could not create list',
  },
};

export default function BoardCanvas({ boardId, showHeader = true }) {
  const queryClient = useQueryClient();
  const lang = useUiStore(s => s.language) || 'vi';
  const l    = L[lang] || L.vi;
  const { user } = useAuthStore();

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeCard,     setActiveCard]     = useState(null);
  const [isAddingList,   setIsAddingList]   = useState(false);
  const [listName,       setListName]       = useState('');
  const [aiSearchQuery,  setAiSearchQuery]  = useState('');
  const [aiSearchResult, setAiSearchResult] = useState(null);

  const trash        = useDroppable({ id: 'trash' });
  const trashRef     = useRef(null);
  const [trashHover, setTrashHover] = useState(false);
  const lastTrashHover = useRef(false);
  const lastOverId     = useRef(null);
  const overTrashRef   = useRef(false);

  /* ─── Query ─── */
  const { data: board, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn:  () => boardService.getBoardDetails(boardId),
    enabled:  !!boardId,
  });

  /* ─── AI Search ─── */
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
    const unSubMove    = onCardMoved(() => queryClient.invalidateQueries(['board', boardId]));
    const unSubComment = onCommentAdded(data => {
      if (selectedCardId === data.cardId) queryClient.invalidateQueries(['card', data.cardId]);
    });
    return () => { leaveBoard(boardId); unSubMove(); unSubComment(); };
  }, [boardId, queryClient, selectedCardId]);

  /* ─── DnD ─── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = ({ active }) => {
    if (active?.data?.current?.type !== 'card') { setActiveCard(null); return; }
    const card = board?.lists?.flatMap(l => l.cards || []).find(c => c._id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveCard(null);
    const cardId  = active.id;
    const isTrash = overTrashRef.current || over?.id === 'trash';
    const overId  = isTrash ? 'trash' : over?.id ?? lastOverId.current ?? null;
    lastOverId.current    = null;
    overTrashRef.current  = false;
    setTrashHover(false);
    if (!overId) return;

    if (overId === 'trash') {
      try {
        await cardService.delete(cardId);
        queryClient.invalidateQueries(['board', boardId]);
      } catch { toast.error(l.deleteCardError); }
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
      // Optimistic update
      queryClient.setQueryData(['board', boardId], prev => {
        if (!prev) return prev;
        const boardData = prev.lists ? prev : prev.data;
        if (!boardData) return prev;
        const cloned = { ...boardData, lists: boardData.lists.map(li => ({ ...li, cards: [...(li.cards||[])] })) };
        const from = cloned.lists.find(li => li._id === fromListId);
        const to   = cloned.lists.find(li => li._id === toListId);
        if (!from || !to) return prev;
        const idx = from.cards.findIndex(c => c._id === cardId);
        if (idx === -1) return prev;
        const [card] = from.cards.splice(idx, 1);
        const safePos = Math.max(0, Math.min(position, to.cards.length));
        card.list = to._id;
        to.cards.splice(safePos, 0, card);
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

  /* ─── Render states ─── */
  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-white gap-2">
      <div className="spinner border-white" />
      <span>{l.loadingBoard}</span>
    </div>
  );
  if (isError) return <div className="text-center p-10 text-white">{l.boardError}</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden board-surface rounded-2xl border border-white/10">

      {/* ─── Header ─── */}
      {showHeader && (
        <div className="px-6 pt-6">
          <div className="board-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-emerald-100/70">
                  {l.workspaceBoard}
                </div>
                <h1 className="board-title heading-soft text-2xl md:text-3xl font-semibold mt-1">
                  {board?.name}
                </h1>
                {board?.description && (
                  <p className="text-sm text-emerald-50/70 mt-1">{board.description}</p>
                )}
              </div>

              {/* ✅ Star board button */}
              <StarButton
                board={board}
                size="md"
                showLabel
                labelStar={l.star}
                labelUnstar={l.unstar}
                onToggle={() => queryClient.invalidateQueries(['board', boardId])}
              />
            </div>

            <div className="flex gap-2">
              <button className="board-button">{l.filter}</button>
              <button className="board-button">{l.members}</button>
            </div>
          </div>

          {/* ─── AI Search ─── */}
          <div className="mt-3 bg-white/10 border border-white/10 rounded-2xl p-3">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                className="input"
                placeholder={l.aiSearchPh}
                value={aiSearchQuery}
                onChange={e => setAiSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && aiSearchQuery.trim())
                    aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() });
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!aiSearchQuery.trim()) return;
                  aiSearchMutation.mutate({ boardId, query: aiSearchQuery.trim() });
                }}
                disabled={aiSearchMutation.isPending}
              >
                {aiSearchMutation.isPending ? l.aiSearching : l.aiSearchBtn}
              </button>
              {aiSearchResult && (
                <button type="button" className="btn btn-secondary"
                  onClick={() => setAiSearchResult(null)}>✕</button>
              )}
            </div>

            {/* AI results */}
            {!!aiSearchResult?.cards?.length && (
              <div className="mt-3 space-y-2 max-h-56 overflow-auto custom-scrollbar">
                {aiSearchResult.cards.map(card => (
                  <button key={card._id} type="button"
                    className="w-full text-left rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                    onClick={() => setSelectedCardId(card._id)}>
                    <div className="text-sm text-white font-medium">{card.title}</div>
                    <div className="text-xs text-emerald-100/70 mt-1">
                      {l.listLabel}: {card.list?.name || 'N/A'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Board Canvas ─── */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={e => {
          if (e.over?.id) lastOverId.current = e.over.id;
          overTrashRef.current = e.over?.id === 'trash';
        }}
        onDragMove={e => {
          if (!trashRef.current) return;
          const rect  = trashRef.current.getBoundingClientRect();
          const trans = e?.active?.rect?.current?.translated;
          if (!trans) return;
          const cx    = trans.left + trans.width  / 2;
          const cy    = trans.top  + trans.height / 2;
          const inside = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
          if (lastTrashHover.current !== inside) {
            lastTrashHover.current = inside;
            setTrashHover(inside);
          }
          overTrashRef.current = inside;
        }}
        onDragCancel={() => {
          lastOverId.current = null; overTrashRef.current = false;
          lastTrashHover.current = false; setTrashHover(false);
        }}
      >
        {/* Lists */}
        <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start custom-scrollbar">
          {board?.lists?.map(list => (
            <ListColumn
              key={list._id}
              list={list}
              onCardClick={id => setSelectedCardId(id)}
              onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
              onListUpdated={() => queryClient.invalidateQueries(['board', boardId])}
            />
          ))}

          {/* Add list */}
          <div className="w-72 shrink-0">
            {isAddingList ? (
              <div className="bg-white/90 rounded-2xl p-4 shadow-xl">
                <input
                  className="input mb-2"
                  placeholder={l.listNamePh}
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setIsAddingList(false); }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleAddList} className="btn btn-primary btn-sm">{l.addList}</button>
                  <button onClick={() => { setIsAddingList(false); setListName(''); }} className="text-slate-600">{l.cancel}</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full bg-white/15 hover:bg-white/25 text-white p-4 rounded-2xl text-left font-semibold transition-all border border-white/10"
              >
                {l.addAnotherList}
              </button>
            )}
          </div>
        </div>

        {/* Trash zone */}
        <div className="px-6 pb-6">
          <div
            ref={node => { trash.setNodeRef(node); trashRef.current = node; }}
            className={`w-full border border-dashed rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 transition flex items-center justify-center gap-2 ${
              trash.isOver || trashHover
                ? 'border-red-300 bg-red-500/20 text-white'
                : 'border-white/15 bg-white/5'
            }`}
          >
            <span className="text-lg">🗑️</span>
            {l.trashHint}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="card shadow-2xl rotate-3 w-64 opacity-90">{activeCard.title}</div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Card Modal ─── */}
      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={boardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}