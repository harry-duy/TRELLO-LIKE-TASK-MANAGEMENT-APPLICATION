import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import BoardCanvas from '@components/board/BoardCanvas';
import { useTranslation } from '@hooks/useTranslation';

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, setState] = useState({
    status: 'loading',
    workspace: null,
    error: null,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (workspaceId === 'new') {
      setState({ status: 'ready', workspace: null, error: null });
      return () => {
        isMounted = false;
      };
    }

    setState({ status: 'loading', workspace: null, error: null });

    workspaceService
      .getWorkspace(workspaceId)
      .then((data) => {
        if (!isMounted) return;
        const workspace = data?.data || data;
        setState({ status: 'ready', workspace, error: null });
      })
      .catch((error) => {
        if (!isMounted) return;
        setState({ status: 'error', workspace: null, error });
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId === 'new') return;
    if (state.status !== 'ready') return;

    const boards = state.workspace?.boards || [];
    if (!boards.length) return;

    const exists = boards.some((board) => (board._id || board.id) === selectedBoardId);
    if (!selectedBoardId || !exists) {
      setSelectedBoardId(boards[0]._id || boards[0].id);
    }
  }, [workspaceId, state.status, state.workspace, selectedBoardId]);

  if (workspaceId === 'new') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-white heading-soft">
          {t('createWorkspaceTitle')}
        </h1>
        <p className="text-soft mt-2">
          {t('createWorkspaceDescription')}
        </p>
        <div className="panel-soft mt-6 p-6 space-y-4">
          <input
            className="input"
            placeholder={t('workspaceNamePlaceholder')}
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
          <textarea
            className="input min-h-[120px]"
            placeholder={t('descriptionOptionalPlaceholder')}
            value={workspaceDescription}
            onChange={(e) => setWorkspaceDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                if (!workspaceName.trim()) return;
                const data = await workspaceService.createWorkspace({
                  name: workspaceName.trim(),
                  description: workspaceDescription.trim() || undefined,
                });
                const created = data?.data || data;
                if (created?._id) {
                  navigate(`/workspace/${created._id}`);
                }
              }}
            >
              {t('createWorkspaceAction')}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/dashboard')}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-emerald-100/70">
        <div className="spinner border-primary-600"></div>
        {t('loadingWorkspace')}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="card bg-white/10 border border-white/10">
        <div className="text-sm text-red-300">
          {t('loadWorkspaceError', {
            message: state.error?.message || t('somethingWentWrong'),
          })}
        </div>
      </div>
    );
  }

  const boards = state.workspace?.boards || [];

  if (selectedBoardId) {
    const activeBoard =
      boards.find((board) => (board._id || board.id) === selectedBoardId) || boards[0];

    return (
      <div className="workspace-board-shell">
        <div className="workspace-board-topbar">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-50/75">
                <button
                  type="button"
                  onClick={() => setSelectedBoardId(null)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  {t('gridView')}
                </button>
                <span className="hidden h-5 w-px bg-white/20 sm:block" />
                <span>{state.workspace?.name || t('workspaceFallbackName')}</span>
                <span className="hidden h-5 w-px bg-white/20 sm:block" />
                <span>
                  {t('boardsTitle')}: {boards.length}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold text-white heading-soft">
                {activeBoard?.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-emerald-50/78">
                {activeBoard?.description ||
                  state.workspace?.description ||
                  t('dashboardWorkspaceFallbackDescription')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:max-w-[40rem]">
              {boards.map((board) => {
                const id = board._id || board.id;
                const isActive = id === selectedBoardId;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedBoardId(id)}
                    className={`workspace-board-pill min-w-[180px] flex-1 xl:flex-none ${
                      isActive ? 'workspace-board-pill-active' : ''
                    }`}
                  >
                    <div className="truncate text-sm font-semibold">{board.name}</div>
                    <div
                      className={`mt-1 text-xs ${
                        isActive ? 'text-slate-500' : 'text-emerald-50/68'
                      }`}
                    >
                      {t('createdLabel', {
                        date: new Date(board.createdAt).toLocaleDateString(),
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <BoardCanvas boardId={selectedBoardId} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white heading-soft">
          {state.workspace?.name || t('workspaceFallbackName')}
        </h1>
        {state.workspace?.description && (
          <p className="text-soft mt-2">
            {state.workspace.description}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <button
            key={board._id || board.id}
            type="button"
            onClick={() => setSelectedBoardId(board._id || board.id)}
            className="card card-hover min-h-[120px] flex flex-col justify-between bg-white/10 border border-white/10 text-white"
          >
            <div>
              <h3 className="text-lg font-semibold text-white">
                {board.name}
              </h3>
              {board.description && (
                <p className="text-sm text-emerald-50/70 mt-2 line-clamp-3">
                  {board.description}
                </p>
              )}
            </div>
            <div className="text-xs text-emerald-100/60 mt-3">
              {t('createdLabel', {
                date: new Date(board.createdAt).toLocaleDateString(),
              })}
            </div>
          </button>
        ))}

        <div className="card min-h-[120px] border-2 border-dashed border-white/20 text-emerald-50/70 bg-white/5">
          {isCreating ? (
            <div className="p-4 flex flex-col gap-3">
              <input
                className="input"
                placeholder={t('boardNamePlaceholder')}
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                autoFocus
              />
              <textarea
                className="input min-h-[90px]"
                placeholder={t('descriptionOptionalPlaceholder')}
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    if (!boardName.trim()) return;
                    const createdResponse = await boardService.createBoard({
                      name: boardName.trim(),
                      description: boardDescription.trim() || undefined,
                      workspaceId,
                    });
                    const createdBoard = createdResponse?.data || createdResponse;
                    setBoardName('');
                    setBoardDescription('');
                    setIsCreating(false);
                    const data = await workspaceService.getWorkspace(workspaceId);
                    setState((prev) => ({
                      ...prev,
                      workspace: data?.data || data,
                    }));
                    if (createdBoard?._id) {
                      setSelectedBoardId(createdBoard._id);
                    }
                  }}
                >
                  {t('createBoardAction')}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsCreating(false);
                    setBoardName('');
                    setBoardDescription('');
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full h-full flex items-center justify-center"
              onClick={() => setIsCreating(true)}
            >
              {t('createNewBoard')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
