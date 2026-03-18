// frontend/src/pages/DashboardPage.jsx
// ✅ i18n VI/EN  ✅ StarredBoardsList  ✅ Workspaces grid

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import apiClient from '@config/api';
import StarButton from '@components/board/StarButton';
import { useNavigate } from 'react-router-dom';

/* ─── i18n ─── */
const L = {
  vi: {
    title:          'Bảng điều khiển',
    welcome:        'Xin chào, {name}. Chọn workspace hoặc tạo mới để bắt đầu.',
    loading:        'Đang tải workspace...',
    loadError:      'Không thể tải workspace',
    membersCount:   '{count} thành viên',
    createNewWs:    '+ Tạo workspace mới',
    starredTitle:   '⭐ Boards đã đánh dấu',
    starredEmpty:   'Chưa đánh dấu board nào',
    starredHint:    'Nhấn ★ trên board bất kỳ để thêm vào đây',
    loadingStarred: 'Đang tải...',
    recentTitle:    '🕐 Boards gần đây',
    recentEmpty:    'Chưa có board nào',
    noDesc:         '',
    createdAt:      'Tạo: {date}',
    members:        'thành viên',
    wsTitle:        'Workspaces của bạn',
  },
  en: {
    title:          'Dashboard',
    welcome:        'Hello, {name}. Choose a workspace or create one to get started.',
    loading:        'Loading workspaces...',
    loadError:      'Could not load workspaces',
    membersCount:   '{count} members',
    createNewWs:    '+ Create new workspace',
    starredTitle:   '⭐ Starred Boards',
    starredEmpty:   'No starred boards yet',
    starredHint:    'Click ★ on any board to add it here',
    loadingStarred: 'Loading...',
    recentTitle:    '🕐 Recent Boards',
    recentEmpty:    'No boards yet',
    noDesc:         '',
    createdAt:      'Created: {date}',
    members:        'members',
    wsTitle:        'Your Workspaces',
  },
};

/* ─── Starred Boards Section ─── */
function StarredBoardsList({ l, userId }) {
  const navigate = useNavigate();
  const [boards,  setBoards]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data  = await boardService.getBoards({ isClosed: false });
      const all   = Array.isArray(data) ? data : data?.data || [];
      setBoards(all.filter(b =>
        (b.starredBy || []).some(id => (id?._id||id)?.toString() === userId?.toString())
      ));
    } catch { setBoards([]); }
    setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, color:'rgba(167,243,208,.5)', fontSize:13, padding:'8px 0' }}>
      <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(52,211,153,.3)', borderTopColor:'#34d399', animation:'db-spin .8s linear infinite', display:'inline-block' }} />
      <style>{`@keyframes db-spin{to{transform:rotate(360deg)}}`}</style>
      {l.loadingStarred}
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-white mb-3 heading-soft">{l.starredTitle}</h2>

      {boards.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/15 bg-white/5">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-sm text-white/60">{l.starredEmpty}</p>
            <p className="text-xs text-white/30 mt-0.5">{l.starredHint}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map(board => (
            <div key={board._id}
              className="rounded-2xl overflow-hidden border border-white/10 cursor-pointer group transition-all hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => navigate(`/board/${board._id}`)}>
              {/* Color bar */}
              <div style={{ height:40, background: board.background || '#0f766e' }} />
              {/* Info */}
              <div className="p-3 bg-white/8 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{board.name}</p>
                  <p className="text-xs text-emerald-100/45 truncate">{board.workspace?.name || ''}</p>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <StarButton board={board} size="sm" onToggle={load} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Recent Boards Section ─── */
function RecentBoardsList({ l, userId }) {
  const navigate = useNavigate();
  const [boards,  setBoards]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await boardService.getBoards({ isClosed: false });
      const all  = Array.isArray(data) ? data : data?.data || [];
      setBoards([...all].sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,8));
    } catch { setBoards([]); }
    setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  if (loading || boards.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-white mb-3 heading-soft">{l.recentTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {boards.map(board => (
          <div key={board._id}
            className="rounded-2xl overflow-hidden border border-white/10 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl"
            onClick={() => navigate(`/board/${board._id}`)}>
            <div style={{ height:36, background: board.background || '#0f766e' }} />
            <div className="p-3 bg-white/8 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{board.name}</p>
                <p className="text-xs text-emerald-100/45 truncate">{board.workspace?.name || ''}</p>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <StarButton board={board} size="sm" onToggle={load} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── MAIN PAGE ─── */
export default function DashboardPage() {
  const { user }  = useAuthStore();
  const lang      = useUiStore(s => s.language) || 'vi';
  const l         = L[lang] || L.vi;

  const [state, setState] = useState({ status: 'loading', workspaces: [], error: null });

  useEffect(() => {
    let mounted = true;
    setState(p => ({ ...p, status: 'loading', error: null }));
    workspaceService.getMyWorkspaces()
      .then(data => {
        if (!mounted) return;
        const ws = Array.isArray(data) ? data : data?.data || [];
        setState({ status: 'ready', workspaces: ws, error: null });
      })
      .catch(err => {
        if (!mounted) return;
        setState({ status: 'error', workspaces: [], error: err });
      });
    return () => { mounted = false; };
  }, []);

  const userName = user?.name || user?.email || '';

  return (
    <div>
      {/* ─── Page header ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white heading-soft">{l.title}</h1>
        <p className="text-soft mt-1 text-sm">
          {l.welcome.replace('{name}', userName)}
        </p>
      </div>

      {/* ─── Starred boards ─── */}
      <StarredBoardsList l={l} userId={user?._id} />

      {/* ─── Recent boards ─── */}
      <RecentBoardsList l={l} userId={user?._id} />

      {/* ─── Workspaces ─── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3 heading-soft">{l.wsTitle}</h2>

        {state.status === 'loading' && (
          <div className="flex items-center gap-2 text-emerald-50/70 text-sm">
            <div className="spinner border-primary-600" />
            {l.loading}
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-sm text-red-300">{l.loadError}</p>
        )}

        {state.status === 'ready' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.workspaces.map(ws => (
              <Link
                key={ws._id || ws.id}
                to={`/workspace/${ws._id || ws.id}`}
                className="card card-hover min-h-[110px] flex flex-col justify-between bg-white/10 border border-white/10 text-white transition-all hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: `hsl(${(ws.name?.charCodeAt(0)||0)*13%360},60%,42%)` }}>
                      {(ws.name || 'W')[0].toUpperCase()}
                    </div>
                    <h3 className="text-base font-semibold text-white truncate">{ws.name}</h3>
                  </div>
                  {ws.description && (
                    <p className="text-sm text-emerald-50/60 line-clamp-2">{ws.description}</p>
                  )}
                </div>
                <p className="text-xs text-emerald-100/50 mt-3">
                  {l.membersCount.replace('{count}', ws.members?.length || 0)}
                </p>
              </Link>
            ))}

            {/* Create new workspace card */}
            <Link
              to="/workspace/new"
              className="card card-hover flex items-center justify-center min-h-[110px] border-2 border-dashed border-white/20 text-emerald-50/60 hover:border-emerald-300 hover:text-emerald-100 bg-white/5 transition-all"
            >
              {l.createNewWs}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}