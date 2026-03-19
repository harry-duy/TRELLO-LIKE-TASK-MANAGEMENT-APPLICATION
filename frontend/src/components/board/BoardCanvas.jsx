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

import boardService from '@services/boardService';
import cardService from '@services/cardService';
import listService from '@services/listService';
import aiService from '@services/aiService';
import ListColumn from '@components/board/ListColumn';
import CardModal from '@components/card/CardModal';
import {
  initializeSocket,
  joinBoard,
  leaveBoard,
  onCardMoved,
  emitCardMove,
  onCommentAdded,
} from '@config/socket';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';

export default function BoardCanvas({ boardId, showHeader = true }) {
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [listName, setListName] = useState('');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState(null);
  const trash = useDroppable({ id: 'trash' });
  const trashRef = useRef(null);
  const [trashHover, setTrashHover] = useState(false);
  const lastTrashHover = useRef(false);
  const lastOverId = useRef(null);
  const overTrashRef = useRef(false);
  const { t } = useTranslation();

  const { data: board, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardDetails(boardId),
    enabled: !!boardId,
  });

  const aiSearchMutation = useMutation({
    mutationFn: ({ boardId: targetBoardId, query }) =>
      aiService.searchCards({ boardId: targetBoardId, query }),
    onSuccess: (response) => {
      setAiSearchResult(response);
      if ((response?.cards || []).length === 0) {
        toast(t('aiSearchNoResult'));
      }
    },
    onError: (error) => {
      toast.error(error?.message || t('aiSearchError'));
    },
  });

  useEffect(() => {
    if (!boardId) return undefined;

    initializeSocket();
    joinBoard(boardId);

    const unSubMove = onCardMoved(() => {
      queryClient.invalidateQueries(['board', boardId]);
    });

    const unSubComment = onCommentAdded((data) => {
      if (selectedCardId === data.cardId) {
        queryClient.invalidateQueries(['card', data.cardId]);
      }
    });

    return () => {
      leaveBoard(boardId);
      unSubMove();
      unSubComment();
    };
  }, [boardId, queryClient, selectedCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    if (active?.data?.current?.type !== 'card') {
      setActiveCard(null);
      return;
    }
    const card = board?.lists
      ?.flatMap((list) => list.cards || [])
      .find((item) => item._id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);
    const cardId = active.id;
    const isTrash = overTrashRef.current || over?.id === 'trash';
    const overId = isTrash ? 'trash' : over?.id ?? lastOverId.current ?? null;
    lastOverId.current = null;
    overTrashRef.current = false;
    setTrashHover(false);
    if (!overId) return;

    if (overId === 'trash') {
      try {
        await cardService.delete(cardId);
        queryClient.invalidateQueries(['board', boardId]);
        return;
      } catch (error) {
        toast.error(t('deleteCardError'));
        return;
      }
    }

    const sourceList = board?.lists?.find((list) =>
      (list.cards || []).some((card) => card._id === cardId)
    );
    const destinationList = board?.lists?.find(
      (list) => list._id === overId || list.cards?.some((card) => card._id === overId)
    );
    if (!sourceList || !destinationList) return;

    const fromListId = sourceList._id;
    const toListId = destinationList._id;

    let position = destinationList.cards?.length || 0;
    const overCardIndex = (destinationList.cards || []).findIndex(
      (card) => card._id === overId
    );
    if (overCardIndex >= 0) {
      position = overCardIndex;
    }

    try {
      queryClient.setQueryData(['board', boardId], (prev) => {
        if (!prev || (!prev.data && !prev.lists)) return prev;
        const boardData = prev.lists ? prev : prev.data;
        if (!boardData) return prev;

        const cloned = {
          ...boardData,
          lists: boardData.lists.map((list) => ({
            ...list,
            cards: Array.isArray(list.cards) ? [...list.cards] : [],
          })),
        };

        const fromList = cloned.lists.find((list) => list._id === fromListId);
        const toList = cloned.lists.find((list) => list._id === toListId);
        if (!fromList || !toList) return prev;

        const idx = fromList.cards.findIndex((card) => card._id === cardId);
        if (idx === -1) return prev;
        const [card] = fromList.cards.splice(idx, 1);

        if (fromList._id === toList._id && idx < position) {
          position -= 1;
        }

        const safePosition = Math.max(0, Math.min(position, toList.cards.length));
        card.list = toList._id;
        toList.cards.splice(safePosition, 0, card);

        if (prev.lists) {
          return cloned;
        }
        return { ...prev, data: cloned };
      });

      await cardService.moveCard(cardId, { listId: toListId, position, boardId });
      emitCardMove({
        boardId,
        cardId,
        fromListId,
        toListId,
        position,
      });
    } catch (error) {
      toast.error(t('moveCardError'));
      queryClient.invalidateQueries(['board', boardId]);
    }
  };

  const handleAddList = async () => {
    if (!listName.trim()) return;
    try {
      await listService.createList({
        name: listName.trim(),
        boardId,
      });
      setListName('');
      setIsAddingList(false);
      queryClient.invalidateQueries(['board', boardId]);
    } catch (error) {
      toast.error(t('createListError'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        <div className="spinner border-white"></div>
        <span className="ml-2">{t('loadingBoard')}</span>
      </div>
    );
  }

  if (isError) {
    return <div className="p-10 text-center text-white">{t('boardError')}</div>;
  }

  return (
    <div className="board-surface flex h-full min-h-[68vh] flex-col overflow-hidden">
      {showHeader && (
        <div className="px-6 pt-6">
          <div className="board-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-emerald-100/70">
                {t('workspaceBoard')}
              </div>
              <h1 className="board-title heading-soft mt-1 text-2xl font-semibold md:text-3xl">
                {board?.name}
              </h1>
              {board?.description && (
                <p className="mt-1 text-sm text-emerald-50/70">{board.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="board-button">{t('filter')}</button>
              <button className="board-button">{t('members')}</button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                className="input"
                placeholder={t('aiSearchPlaceholder')}
                value={aiSearchQuery}
                onChange={(event) => setAiSearchQuery(event.target.value)}
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
                {aiSearchMutation.isPending ? t('aiSearching') : t('aiSearchButton')}
              </button>
            </div>

            {!!aiSearchResult?.cards?.length && (
              <div className="custom-scrollbar mt-3 max-h-56 space-y-2 overflow-auto">
                {aiSearchResult.cards.map((card) => (
                  <button
                    key={card._id}
                    type="button"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                    onClick={() => setSelectedCardId(card._id)}
                  >
                    <div className="text-sm font-medium text-white">{card.title}</div>
                    <div className="mt-1 text-xs text-emerald-100/70">
                      {t('listLabel')}: {card.list?.name || 'N/A'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={(event) => {
          if (event.over?.id) {
            lastOverId.current = event.over.id;
          }
          overTrashRef.current = event.over?.id === 'trash';
        }}
        onDragMove={(event) => {
          if (!trashRef.current) return;
          const rect = trashRef.current.getBoundingClientRect();
          const point =
            event?.delta && event?.active?.rect?.current?.translated
              ? {
                  x:
                    event.active.rect.current.translated.left +
                    event.active.rect.current.translated.width / 2,
                  y:
                    event.active.rect.current.translated.top +
                    event.active.rect.current.translated.height / 2,
                }
              : null;
          if (!point) return;
          const isInside =
            point.x >= rect.left &&
            point.x <= rect.right &&
            point.y >= rect.top &&
            point.y <= rect.bottom;
          if (lastTrashHover.current !== isInside) {
            lastTrashHover.current = isInside;
            setTrashHover(isInside);
          }
          overTrashRef.current = isInside;
        }}
        onDragCancel={() => {
          lastOverId.current = null;
          overTrashRef.current = false;
          lastTrashHover.current = false;
          setTrashHover(false);
        }}
      >
        <div className="custom-scrollbar flex flex-1 items-start gap-5 overflow-x-auto px-6 py-7">
          {board?.lists?.map((list) => (
            <ListColumn
              key={list._id}
              list={list}
              onCardClick={(id) => setSelectedCardId(id)}
              onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
              onListUpdated={() => queryClient.invalidateQueries(['board', boardId])}
            />
          ))}

          <div className="w-80 shrink-0">
            {isAddingList ? (
              <div className="rounded-[28px] bg-white/96 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                <input
                  className="input mb-2"
                  placeholder={t('listNamePlaceholder')}
                  value={listName}
                  onChange={(event) => setListName(event.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleAddList} className="btn btn-primary btn-sm">
                    {t('addList')}
                  </button>
                  <button
                    onClick={() => setIsAddingList(false)}
                    className="text-slate-600"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full rounded-[28px] border border-white/30 bg-white/10 px-5 py-4 text-left font-semibold text-white transition-all hover:bg-white/20"
              >
                + {t('addAnotherList')}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6">
          <div
            ref={(node) => {
              trash.setNodeRef(node);
              trashRef.current = node;
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-[28px] border border-dashed px-4 py-4 text-sm font-semibold transition ${
              trash.isOver || trashHover
                ? 'border-red-200 bg-white/20 text-white'
                : 'border-white/20 bg-white/10 text-white/78'
            }`}
            data-droppable="trash"
          >
            <span className="text-lg">Trash</span>
            {t('trashHint')}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="card-item w-64 rotate-2 opacity-95 shadow-2xl">{activeCard.title}</div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
