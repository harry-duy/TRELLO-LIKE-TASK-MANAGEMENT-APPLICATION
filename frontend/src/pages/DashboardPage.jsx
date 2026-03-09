import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import workspaceService from '@services/workspaceService';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [state, setState] = useState({
    status: 'loading',
    workspaces: [],
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    workspaceService
      .getMyWorkspaces()
      .then((data) => {
        if (!isMounted) return;
        const workspaces = Array.isArray(data) ? data : data?.data || [];
        setState({
          status: 'ready',
          workspaces,
          error: null,
        });
      })
      .catch((error) => {
        if (!isMounted) return;
        setState({
          status: 'error',
          workspaces: [],
          error,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4 heading-soft">Dashboard</h1>
      <p className="text-soft mb-6">
        Hello, <strong>{user?.name || user?.email || 'User'}</strong>. Choose a
        workspace or create a new one to get started.
      </p>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-emerald-50/70 mb-4">
          <div className="spinner border-primary-600"></div>
          Loading workspaces...
        </div>
      )}

      {state.status === 'error' && (
        <div className="text-sm text-red-300 mb-4">
          Could not load workspaces:{' '}
          {state.error?.message || 'Something went wrong.'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.workspaces.map((workspace) => (
          <Link
            key={workspace._id || workspace.id}
            to={`/workspace/${workspace._id || workspace.id}`}
            className="card card-hover min-h-[120px] flex flex-col justify-between bg-white/10 border border-white/10 text-white"
          >
            <div>
              <h3 className="text-lg font-semibold text-white">
                {workspace.name}
              </h3>
              {workspace.description && (
                <p className="text-sm text-emerald-50/70 mt-2 line-clamp-3">
                  {workspace.description}
                </p>
              )}
            </div>
            <div className="text-xs text-emerald-100/60 mt-3">
              Members: {workspace.members?.length || 0}
            </div>
          </Link>
        ))}

        <Link
          to="/workspace/new"
          className="card card-hover flex items-center justify-center min-h-[120px] border-2 border-dashed border-white/20 text-emerald-50/70 hover:border-emerald-200 hover:text-emerald-100 bg-white/5"
        >
          + Create new workspace
        </Link>
      </div>
    </div>
  );
}
