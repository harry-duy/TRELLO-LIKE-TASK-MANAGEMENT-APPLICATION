<<<<<<< Updated upstream
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
=======
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import boardService from '@services/boardService';
import { useUiStore } from '@store/uiStore';
import BoardCanvas from '@components/board/BoardCanvas';
import toast from 'react-hot-toast';

const L = {
  vi: {
    loading: 'Đang tải board...',
    loadError: 'Không thể tải board',
    boardFallback: 'Board',
    workspaceFallback: 'Workspace',
    openWorkspace: 'Về workspace',
    editBoard: 'Chỉnh sửa board',
    save: 'Lưu',
    cancel: 'Huỷ',
    boardName: 'Tên board',
    boardDescription: 'Mô tả',
    boardColor: 'Màu nền',
    updateSuccess: 'Đã cập nhật board',
    updateError: 'Không thể cập nhật board',
    boardView: 'Board view',
    boardHint: 'Đây là khu làm việc chi tiết cho board này.',
    noDescription: 'Chưa có mô tả.',
    listCount: '{count} danh sách',
    memberCount: '{count} thành viên',
  },
  en: {
    loading: 'Loading board...',
    loadError: 'Could not load board',
    boardFallback: 'Board',
    workspaceFallback: 'Workspace',
    openWorkspace: 'Back to workspace',
    editBoard: 'Edit board',
    save: 'Save',
    cancel: 'Cancel',
    boardName: 'Board name',
    boardDescription: 'Description',
    boardColor: 'Background',
    updateSuccess: 'Board updated',
    updateError: 'Could not update board',
    boardView: 'Board view',
    boardHint: 'This is the detailed workspace for the selected board.',
    noDescription: 'No description yet.',
    listCount: '{count} lists',
    memberCount: '{count} members',
  },
};

function tText(template, values = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template
  );
}

function getId(value) {
  return value?._id || value?.id || value;
}

function BoardEditModal({ board, l, onClose, onSaved }) {
  const [name, setName] = useState(board?.name || '');
  const [description, setDescription] = useState(board?.description || '');
  const [background, setBackground] = useState(board?.background || '#0f766e');
  const [isSaving, setIsSaving] = useState(false);

  const palette = ['#0f766e', '#0369a1', '#2563eb', '#7c3aed', '#c2410c', '#b91c1c', '#475569', '#0f172a'];

  useEffect(() => {
    setName(board?.name || '');
    setDescription(board?.description || '');
    setBackground(board?.background || '#0f766e');
  }, [board]);

  const handleSave = async () => {
    if (!name.trim() || !board?._id) return;
    setIsSaving(true);
    try {
      const response = await boardService.updateBoard(board._id, {
        name: name.trim(),
        description: description.trim(),
        background,
      });
      onSaved?.(response?.data || response);
      toast.success(l.updateSuccess);
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || l.updateError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 520, padding: 24, background: 'rgba(15,23,42,.98)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{l.editBoard}</h3>
          <button type="button" className="board-inline-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">{l.boardName}</label>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">{l.boardDescription}</label>
            <textarea
              className="input"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">{l.boardColor}</label>
            <div className="flex flex-wrap gap-2">
              {palette.map((color) => {
                const active = color === background;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBackground(color)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: color,
                      border: active ? '2px solid white' : '2px solid transparent',
                      boxShadow: active ? '0 0 0 3px rgba(255,255,255,.12)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              {l.cancel}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
            >
              {l.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { boardId } = useParams();
  const lang = useUiStore((state) => state.language) || 'vi';
  const l = L[lang] || L.vi;
  const [state, setState] = useState({ status: 'loading', board: null, error: null });
  const [isEditingBoard, setIsEditingBoard] = useState(false);

  useEffect(() => {
    let mounted = true;
    setState({ status: 'loading', board: null, error: null });

    boardService
      .getBoardDetails(boardId)
      .then((response) => {
        if (!mounted) return;
        const board = response?.data || response;
        setState({ status: 'ready', board, error: null });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({ status: 'error', board: null, error });
      });

    return () => {
      mounted = false;
    };
  }, [boardId]);

  const board = state.board;
  const workspace = board?.workspace;
  const workspaceId = getId(workspace);
  const accent = board?.background || '#0f766e';

  const memberCount = useMemo(() => {
    if (Array.isArray(board?.members) && board.members.length) return board.members.length;
    if (Array.isArray(workspace?.members)) return workspace.members.length;
    return 0;
  }, [board, workspace]);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-emerald-100/70">
        <div className="spinner border-primary-600" />
        {l.loading}
>>>>>>> Stashed changes
      </div>
    );
  }

<<<<<<< Updated upstream
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
=======
  if (state.status === 'error') {
    return (
      <div className="card border border-white/10 bg-white/10 p-4">
        <p className="text-sm text-red-300">
          {state.error?.message ? `${l.loadError}: ${state.error.message}` : l.loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex h-3.5 w-3.5 rounded-full border border-white/15"
                style={{ background: accent }}
              />
              <div className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
                {l.boardView}
              </div>
              {workspaceId ? (
                <Link
                  to={`/workspace/${workspaceId}`}
                  className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  {workspace?.name || l.workspaceFallback}
                </Link>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
              <h1 className="heading-soft truncate text-[30px] font-semibold text-white">
                {board?.name || l.boardFallback}
              </h1>
              <div className="flex flex-wrap gap-2 text-[12px] text-white/45">
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
                  {tText(l.listCount, { count: board?.lists?.length || 0 })}
                </span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
                  {tText(l.memberCount, { count: memberCount })}
                </span>
              </div>
            </div>

            <p className="mt-2 max-w-2xl text-sm text-white/55">
              {board?.description || l.noDescription}
            </p>
          </div>

          {workspaceId ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditingBoard(true)}
              >
                {l.editBoard}
              </button>
              <Link to={`/workspace/${workspaceId}`} className="btn btn-secondary btn-sm">
                {l.openWorkspace}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-1">
        <BoardCanvas boardId={boardId} showHeader />
      </div>

      {isEditingBoard ? (
        <BoardEditModal
          board={board}
          l={l}
          onClose={() => setIsEditingBoard(false)}
          onSaved={(nextBoard) => {
            setState((prev) => ({ ...prev, board: { ...prev.board, ...nextBoard } }));
          }}
        />
      ) : null}
>>>>>>> Stashed changes
    </div>
  );
}
