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
      </div>
    );
  }

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
    </div>
  );
}
