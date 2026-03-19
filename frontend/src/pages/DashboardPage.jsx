import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import workspaceService from '@services/workspaceService';
import { useTranslation } from '@hooks/useTranslation';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
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

  const sortedWorkspaces = [...state.workspaces].sort(
    (left, right) =>
      new Date(right.updatedAt || right.createdAt || 0).getTime() -
      new Date(left.updatedAt || left.createdAt || 0).getTime()
  );
  const recentWorkspaces = sortedWorkspaces.slice(0, 3);
  const totalMembers = state.workspaces.reduce(
    (sum, workspace) => sum + (workspace.members?.length || 0),
    0
  );
  const privateCount = state.workspaces.filter(
    (workspace) => (workspace.visibility || 'private') === 'private'
  ).length;
  const publicCount = state.workspaces.filter(
    (workspace) => workspace.visibility === 'public'
  ).length;

  const stats = [
    {
      key: 'workspaces',
      label: t('dashboardStatWorkspaces'),
      value: state.workspaces.length,
      accent: 'from-cyan-300/30 to-sky-400/10',
    },
    {
      key: 'members',
      label: t('dashboardStatMembers'),
      value: totalMembers,
      accent: 'from-emerald-300/30 to-teal-400/10',
    },
    {
      key: 'private',
      label: t('dashboardStatPrivate'),
      value: privateCount,
      accent: 'from-violet-300/30 to-fuchsia-400/10',
    },
    {
      key: 'public',
      label: t('dashboardStatPublic'),
      value: publicCount,
      accent: 'from-amber-300/30 to-orange-400/10',
    },
  ];

  const formatWorkspaceDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  };

  const handleDeleteWorkspace = async (workspace) => {
    const confirmed = window.confirm(
      t('deleteWorkspaceConfirm', { name: workspace.name || t('workspaceFallbackName') })
    );
    if (!confirmed) return;

    try {
      await workspaceService.deleteWorkspace(workspace._id || workspace.id);
      setState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.filter(
          (item) => (item._id || item.id) !== (workspace._id || workspace.id)
        ),
      }));
      toast.success(t('deleteWorkspaceSuccess'));
    } catch (error) {
      if (error?.status === 404 || error?.status === 405) {
        toast.error(t('workspaceDeleteUnavailable'));
        return;
      }
      toast.error(error?.message || t('deleteWorkspaceError'));
    }
  };

  return (
    <div className="space-y-8">
      <section className="panel-soft overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] p-6 lg:p-8">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-emerald-100/60">
              {t('dashboardOverviewTitle')}
            </div>
            <h1 className="mt-3 text-3xl lg:text-4xl font-bold text-white heading-soft">
              {t('dashboardWelcome', {
                name: user?.name || user?.email || t('defaultUser'),
              })}
            </h1>
            <p className="text-soft mt-4 max-w-2xl">{t('dashboardOverviewSubtitle')}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/workspace/new" className="btn btn-primary">
                {t('createNewWorkspace')}
              </Link>
              {recentWorkspaces[0] && (
                <Link
                  to={`/workspace/${recentWorkspaces[0]._id || recentWorkspaces[0].id}`}
                  className="btn border border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  {t('dashboardOpenRecentWorkspace')}
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.key}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.accent} bg-white/5 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.2)]`}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                  {stat.label}
                </div>
                <div className="mt-3 text-3xl font-bold text-white heading-soft">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-emerald-50/70">
          <div className="spinner border-primary-600"></div>
          {t('loadingWorkspaces')}
        </div>
      )}

      {state.status === 'error' && (
        <div className="text-sm text-red-300">
          {t('loadWorkspacesError', {
            message: state.error?.message || t('somethingWentWrong'),
          })}
        </div>
      )}

      {state.workspaces.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white heading-soft">
              {t('dashboardRecentTitle')}
            </h2>
            <p className="text-soft mt-1">{t('dashboardRecentSubtitle')}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {recentWorkspaces.map((workspace) => (
              <div
                key={`recent-${workspace._id || workspace.id}`}
                className="panel-soft rounded-3xl p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-200/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-emerald-100/55">
                      {workspace.visibility === 'public'
                        ? t('dashboardVisibilityPublic')
                        : t('dashboardVisibilityPrivate')}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white heading-soft">
                      {workspace.name}
                    </h3>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-emerald-50/75">
                    {t('membersCount', { count: workspace.members?.length || 0 })}
                  </div>
                </div>

                <p className="mt-4 text-sm text-emerald-50/72 line-clamp-3">
                  {workspace.description || t('dashboardWorkspaceFallbackDescription')}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs text-emerald-100/55">
                  <span>
                    {t('dashboardUpdatedLabel')}: {formatWorkspaceDate(workspace.updatedAt)}
                  </span>
                  <span>
                    {t('dashboardOwnerLabel')}: {workspace.owner?.name || t('defaultUser')}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/workspace/${workspace._id || workspace.id}`}
                    className="btn border border-white/15 bg-white/5 text-white hover:bg-white/10 text-sm"
                  >
                    {t('dashboardOpenWorkspace')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkspace(workspace)}
                    className="btn btn-danger text-sm"
                  >
                    {t('deleteWorkspace')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white heading-soft">
            {t('dashboardAllWorkspacesTitle')}
          </h2>
          <p className="text-soft mt-1">{t('dashboardAllWorkspacesSubtitle')}</p>
        </div>

        {state.workspaces.length === 0 ? (
          <div className="panel-soft rounded-3xl p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
              +
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-white heading-soft">
              {t('dashboardEmptyTitle')}
            </h3>
            <p className="mt-3 text-soft max-w-xl mx-auto">{t('dashboardEmptySubtitle')}</p>
            <Link to="/workspace/new" className="btn btn-primary mt-6">
              {t('createNewWorkspace')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedWorkspaces.map((workspace) => (
              <div
                key={workspace._id || workspace.id}
                className="panel-soft rounded-3xl p-5 flex flex-col justify-between min-h-[220px] transition duration-200 hover:-translate-y-1 hover:border-emerald-200/30"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-emerald-50/80">
                      {workspace.visibility === 'public'
                        ? t('dashboardVisibilityPublic')
                        : t('dashboardVisibilityPrivate')}
                    </span>
                    <span className="text-xs text-emerald-100/55">
                      {t('membersCount', { count: workspace.members?.length || 0 })}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-semibold text-white heading-soft">
                    {workspace.name}
                  </h3>

                  <p className="mt-3 text-sm text-emerald-50/72 line-clamp-4">
                    {workspace.description || t('dashboardWorkspaceFallbackDescription')}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/55">
                  <span>
                    {t('dashboardUpdatedLabel')}: {formatWorkspaceDate(workspace.updatedAt)}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/workspace/${workspace._id || workspace.id}`}
                    className="btn border border-white/15 bg-white/5 text-white hover:bg-white/10 text-sm"
                  >
                    {t('dashboardOpenWorkspace')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkspace(workspace)}
                    className="btn btn-danger text-sm"
                  >
                    {t('deleteWorkspace')}
                  </button>
                </div>
              </div>
            ))}

            <Link
              to="/workspace/new"
              className="rounded-3xl border-2 border-dashed border-white/20 bg-white/5 min-h-[220px] flex flex-col items-center justify-center text-center px-6 text-emerald-50/70 hover:border-emerald-200 hover:text-emerald-100 transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                +
              </div>
              <div className="mt-4 text-lg font-semibold heading-soft">
                {t('createNewWorkspace')}
              </div>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
