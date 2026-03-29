import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import StarButton from '@components/board/StarButton';

const L = {
  vi: {
    createWsTitle: 'Tạo workspace',
    createWsDesc: 'Thêm tên và mô tả để bắt đầu.',
    wsNamePh: 'Tên workspace',
    descPh: 'Mô tả (không bắt buộc)',
    createWsBtn: 'Tạo workspace',
    cancel: 'Hủy',
    loadingWs: 'Đang tải workspace...',
    loadWsError: 'Không thể tải workspace',
    wsFallback: 'Workspace',
    boardSection: 'Boards',
    boardSectionHint: 'Đây là các board nằm trong workspace này.',
    createBoard: 'Tạo board mới',
    boardNamePh: 'Tên board',
    boardDescPh: 'Mô tả board (không bắt buộc)',
    createBoardBtn: 'Tạo board',
    openBoard: 'Mở board',
    ownerLabel: 'Chủ workspace',
    guestLabel: 'Workspace được mời',
    memberCount: '{count} thành viên',
    boardCount: '{count} board',
    createdAt: 'Tạo ngày {date}',
    noDescription: 'Chưa có mô tả.',
    emptyBoards: 'Workspace này chưa có board nào.',
    emptyBoardsHint: 'Tạo board đầu tiên để bắt đầu chia task và làm việc theo nhóm.',
    quickActions: 'Thao tác nhanh',
    quickHint: 'Workspace là nơi quản lý board. Chọn một board để vào khu kanban riêng.',
    backDashboard: 'Về dashboard',
  },
  en: {
    createWsTitle: 'Create workspace',
    createWsDesc: 'Add a name and description to get started.',
    wsNamePh: 'Workspace name',
    descPh: 'Description (optional)',
    createWsBtn: 'Create workspace',
    cancel: 'Cancel',
    loadingWs: 'Loading workspace...',
    loadWsError: 'Could not load workspace',
    wsFallback: 'Workspace',
    boardSection: 'Boards',
    boardSectionHint: 'These are the boards inside this workspace.',
    createBoard: 'Create new board',
    boardNamePh: 'Board name',
    boardDescPh: 'Board description (optional)',
    createBoardBtn: 'Create board',
    openBoard: 'Open board',
    ownerLabel: 'Owned workspace',
    guestLabel: 'Invited workspace',
    memberCount: '{count} members',
    boardCount: '{count} boards',
    createdAt: 'Created {date}',
    noDescription: 'No description yet.',
    emptyBoards: 'This workspace does not have any boards yet.',
    emptyBoardsHint: 'Create the first board to start organizing work.',
    quickActions: 'Quick actions',
    quickHint: 'A workspace manages boards. Pick a board to move into its own kanban view.',
    backDashboard: 'Back to dashboard',
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

function BoardCard({ board, l, onOpen, onStarToggle }) {
  return (
    <div className="w-[264px] overflow-hidden rounded-[18px] border border-white/10 bg-slate-900/55 transition hover:-translate-y-0.5 hover:border-emerald-200/20">
      <button type="button" className="block w-full text-left" onClick={onOpen}>
        <div style={{ height: 72, background: board.background || '#0f766e' }} />
      </button>

      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <div className="truncate text-[15px] font-semibold text-white">{board.name}</div>
            <div className="mt-1 truncate text-[11px] text-white/40">
              {board.description || l.noDescription}
            </div>
          </button>
          <div onClick={(event) => event.stopPropagation()}>
            <StarButton board={board} size="sm" onToggle={onStarToggle} />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/12"
        >
          {l.openBoard}
        </button>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const lang = useUiStore((state) => state.language) || 'vi';
  const l = L[lang] || L.vi;
  const { user } = useAuthStore();

  const [state, setState] = useState({ status: 'loading', workspace: null, error: null });
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDesc, setBoardDesc] = useState('');
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');

  const loadWorkspace = async () => {
    if (workspaceId === 'new') {
      setState({ status: 'ready', workspace: null, error: null });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await workspaceService.getWorkspace(workspaceId);
      const workspace = data?.data || data;
      setState({ status: 'ready', workspace, error: null });
    } catch (error) {
      setState({ status: 'error', workspace: null, error });
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  async function handleCreateWorkspace() {
    if (!wsName.trim()) return;
    const response = await workspaceService.createWorkspace({
      name: wsName.trim(),
      description: wsDesc.trim() || undefined,
    });
    const workspace = response?.data || response;
    if (workspace?._id) navigate(`/workspace/${workspace._id}`);
  }

  async function handleCreateBoard() {
    if (!boardName.trim()) return;

    try {
      const response = await boardService.createBoard({
        name: boardName.trim(),
        description: boardDesc.trim() || undefined,
        workspaceId,
      });
      const createdBoard = response?.data || response;

      setBoardName('');
      setBoardDesc('');
      setIsCreatingBoard(false);

      await loadWorkspace();

      if (createdBoard?._id) {
        navigate(`/board/${createdBoard._id}`);
      }
    } catch {
      // Keep the UI quiet for now; backend errors already show in devtools/network.
    }
  }

  const workspace = state.workspace;
  const boards = workspace?.boards || [];
  const members = workspace?.members || [];
  const ownerId = getId(workspace?.owner)?.toString();
  const isOwner = ownerId === user?._id?.toString();
  const myWorkspaceMember = (workspace?.members || []).find(
    (m) => getId(m.user)?.toString() === user?._id?.toString()
  );
  const canCreateBoard = isOwner || ['admin', 'staff'].includes(myWorkspaceMember?.role);
  const accent = `hsl(${((workspace?.name?.charCodeAt(0) || 0) * 13) % 360}, 68%, 48%)`;

  if (workspaceId === 'new') {
    return (
      <div className="max-w-xl">
        <h1 className="heading-soft text-2xl font-bold text-white">{l.createWsTitle}</h1>
        <p className="mt-2 text-soft">{l.createWsDesc}</p>

        <div className="panel-soft mt-6 space-y-4 p-6">
          <input
            className="input"
            placeholder={l.wsNamePh}
            value={wsName}
            onChange={(event) => setWsName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleCreateWorkspace();
            }}
            autoFocus
          />
          <textarea
            className="input min-h-[100px] resize-none"
            placeholder={l.descPh}
            value={wsDesc}
            onChange={(event) => setWsDesc(event.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleCreateWorkspace}>
              {l.createWsBtn}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
              {l.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-emerald-100/70">
        <div className="spinner border-primary-600" />
        {l.loadingWs}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="card border border-white/10 bg-white/10 p-4">
        <p className="text-sm text-red-300">
          {state.error?.message ? `${l.loadWsError}: ${state.error.message}` : l.loadWsError}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                style={{ background: accent }}
              >
                {(workspace?.name || 'W')[0].toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="heading-soft truncate text-2xl font-semibold text-white">
                    {workspace?.name || l.wsFallback}
                  </h1>
                  <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
                    {isOwner ? l.ownerLabel : l.guestLabel}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm text-white/55">
                  {workspace?.description || l.noDescription}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-white/45">
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
                    {tText(l.boardCount, { count: boards.length })}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
                    {tText(l.memberCount, { count: members.length })}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
                    {tText(l.createdAt, {
                      date: new Date(workspace?.createdAt || Date.now()).toLocaleDateString(),
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
                {l.backDashboard}
              </button>
              {canCreateBoard && (
                <button className="btn btn-primary btn-sm" onClick={() => setIsCreatingBoard(true)}>
                  {l.createBoard}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div>
            <h2 className="heading-soft text-sm font-semibold uppercase tracking-[0.08em] text-white/80">
              {l.quickActions}
            </h2>
            <p className="mt-2 text-sm text-white/50">{l.quickHint}</p>
          </div>

          <div className="space-y-3">
            {canCreateBoard && (
              <button className="btn btn-primary w-full justify-center" onClick={() => setIsCreatingBoard(true)}>
                {l.createBoard}
              </button>
            )}
            <button className="btn btn-secondary w-full justify-center" onClick={() => navigate('/dashboard')}>
              {l.backDashboard}
            </button>
          </div>
        </aside>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="heading-soft text-lg font-semibold text-white">{l.boardSection}</h2>
            <p className="mt-1 text-sm text-white/45">{l.boardSectionHint}</p>
          </div>
          {canCreateBoard && (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsCreatingBoard(true)}>
              {l.createBoard}
            </button>
          )}
        </div>

        {boards.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] px-5 py-8">
            <div className="text-base font-semibold text-white">{l.emptyBoards}</div>
            <div className="mt-2 max-w-xl text-sm text-white/50">{l.emptyBoardsHint}</div>
            {canCreateBoard && (
              <button className="btn btn-primary btn-sm mt-4" onClick={() => setIsCreatingBoard(true)}>
                {l.createBoard}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {boards.map((board) => (
              <BoardCard
                key={getId(board)}
                board={board}
                l={l}
                onOpen={() => navigate(`/board/${getId(board)}`)}
                onStarToggle={loadWorkspace}
              />
            ))}

            {canCreateBoard && (
              <button
                type="button"
                onClick={() => setIsCreatingBoard(true)}
                className="flex min-h-[162px] w-[264px] items-center justify-center rounded-[18px] border border-dashed border-white/18 bg-white/[0.03] px-6 text-center text-[15px] font-medium text-white/65 transition hover:border-emerald-200/25 hover:bg-white/[0.06] hover:text-white"
              >
                {l.createBoard}
              </button>
            )}
          </div>
        )}
      </section>

      {isCreatingBoard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsCreatingBoard(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-slate-900/98 p-5 shadow-2xl">
            <h3 className="mb-4 text-base font-semibold text-white">{l.createBoard}</h3>
            <div className="space-y-3">
              <input
                className="input"
                placeholder={l.boardNamePh}
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreateBoard();
                  if (event.key === 'Escape') setIsCreatingBoard(false);
                }}
                autoFocus
              />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder={l.boardDescPh}
                value={boardDesc}
                onChange={(event) => setBoardDesc(event.target.value)}
              />
              <div className="flex gap-2 pt-1">
                <button className="btn btn-primary btn-sm" onClick={handleCreateBoard}>
                  {l.createBoardBtn}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsCreatingBoard(false);
                    setBoardName('');
                    setBoardDesc('');
                  }}
                >
                  {l.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
