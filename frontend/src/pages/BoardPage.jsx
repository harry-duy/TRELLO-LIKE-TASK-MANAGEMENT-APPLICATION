import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function BoardPage() {
  const { boardId } = useParams();
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [listName, setListName] = useState('');
  const trash = useDroppable({ id: 'trash' });
  const trashRef = useRef(null);
  const [trashHover, setTrashHover] = useState(false);
  const lastTrashHover = useRef(false);
  const lastOverId = useRef(null);
  const overTrashRef = useRef(false);

  const { data: board, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardDetails(boardId),
    enabled: !!boardId,
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
        toast.error('Could not delete card');
        return;
      }
    }

    const overList = board?.lists?.find(
      (list) => list._id === overId || list.cards?.some((card) => card._id === overId)
    );
    if (!overList) return;

    const listId = overList._id;
    const position = overList.cards?.length || 0;

    try {
      await cardService.moveCard(cardId, { listId, position, boardId });
      emitCardMove({ boardId, cardId, listId, position });
      queryClient.invalidateQueries(['board', boardId]);
    } catch (error) {
      toast.error('Could not move card');
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
      toast.error('Could not create list');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <div className="spinner border-white"></div>
        <span className="ml-2">Đang tải bảng...</span>
      </div>
    );
  }

  if (isError) {
    return <div className="text-center p-10 text-white">Lỗi tải dữ liệu bảng</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden board-surface">
      <div className="px-6 pt-6">
        <div className="board-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-100/70">
              Workspace board
            </div>
            <h1 className="board-title heading-soft text-2xl md:text-3xl font-semibold mt-1">
              {board?.name}
            </h1>
            {board?.description && (
              <p className="text-sm text-emerald-50/70 mt-1">
                {board.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button className="board-button">Lọc</button>
            <button className="board-button">Thành viên</button>
          </div>
        </div>
      </div>

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
        <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start custom-scrollbar">
          {board?.lists?.map((list) => (
            <ListColumn
              key={list._id}
              list={list}
              onCardClick={(id) => setSelectedCardId(id)}
              onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
              onListUpdated={() => queryClient.invalidateQueries(['board', boardId])}
            />
          ))}

          <div className="w-72 shrink-0">
            {isAddingList ? (
              <div className="bg-white/90 rounded-2xl p-4 shadow-xl">
                <input
                  className="input mb-2"
                  placeholder="Tên danh sách..."
                  value={listName}
                  onChange={(event) => setListName(event.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleAddList} className="btn btn-primary btn-sm">
                    Thêm danh sách
                  </button>
                  <button
                    onClick={() => setIsAddingList(false)}
                    className="text-slate-600"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full bg-white/15 hover:bg-white/25 text-white p-4 rounded-2xl text-left font-semibold transition-all border border-white/10"
              >
                + Thêm danh sách khác
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
            className={`w-full border border-dashed rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 transition flex items-center justify-center gap-2 ${
              trash.isOver || trashHover
                ? 'border-red-300 bg-red-500/20 text-white'
                : 'border-white/15 bg-white/5'
            }`}
            data-droppable="trash"
          >
            <span className="text-lg">🗑️</span>
            Kéo thả thẻ vào đây để xóa
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="card shadow-2xl rotate-3 w-64 opacity-90">
              {activeCard.title}
            </div>
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
