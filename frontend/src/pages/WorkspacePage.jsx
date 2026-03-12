<<<<<<< Updated upstream
=======
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  const {
    data: workspace,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const data = await workspaceService.getWorkspace(workspaceId);
      return data?.data || data;
    },
    enabled: workspaceId !== 'new',
  });

  if (workspaceId === 'new') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-white heading-soft">
          Create Workspace
        </h1>
        <p className="text-soft mt-2">
          Add a name and description to get started.
        </p>
        <div className="panel-soft mt-6 p-6 space-y-4">
          <input
            className="input"
            placeholder="Workspace name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
          <textarea
            className="input min-h-[120px]"
            placeholder="Description (optional)"
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
              Create workspace
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-emerald-100/70">
        <div className="spinner border-primary-600"></div>
        Loading workspace...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card bg-white/10 border border-white/10">
        <div className="text-sm text-red-300">
          Could not load workspace: {error?.message || 'Something went wrong.'}
        </div>
      </div>
    );
  }

  const boards = workspace?.boards || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white heading-soft">
          {workspace?.name || 'Workspace'}
        </h1>
        {workspace?.description && (
          <p className="text-soft mt-2">{workspace.description}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Link
            key={board._id || board.id}
            to={`/board/${board._id || board.id}`}
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
              Created: {new Date(board.createdAt).toLocaleDateString()}
            </div>
          </Link>
        ))}

        <div className="card min-h-[120px] border-2 border-dashed border-white/20 text-emerald-50/70 bg-white/5">
          {isCreating ? (
            <div className="p-4 flex flex-col gap-3">
              <input
                className="input"
                placeholder="Board name"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                autoFocus
              />
              <textarea
                className="input min-h-[90px]"
                placeholder="Description (optional)"
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    if (!boardName.trim()) return;
                    await boardService.createBoard({
                      name: boardName.trim(),
                      description: boardDescription.trim() || undefined,
                      workspaceId,
                    });
                    setBoardName('');
                    setBoardDescription('');
                    setIsCreating(false);
                    queryClient.invalidateQueries(['workspace', workspaceId]);
                  }}
                >
                  Create
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsCreating(false);
                    setBoardName('');
                    setBoardDescription('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full h-full flex items-center justify-center"
              onClick={() => setIsCreating(true)}
            >
              + Create new board
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
>>>>>>> Stashed changes
