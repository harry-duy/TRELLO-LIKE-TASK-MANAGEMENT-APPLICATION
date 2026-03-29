import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import boardService from '@services/boardService';
import { useUiStore } from '@store/uiStore';
import { useAuthStore } from '@store/authStore';
import BoardCanvas from '@components/board/BoardCanvas';
import toast from 'react-hot-toast';
import apiClient from '@config/api';

const L = {
  vi: {
    loading: 'Đang tải board...',
    loadError: 'Không thể tải board',
    boardFallback: 'Board',
    workspaceFallback: 'Workspace',
    openWorkspace: 'Về workspace',
    editBoard: 'Chỉnh sửa board',
    deleteBoard: 'Xóa board',
    save: 'Lưu', cancel: 'Huỷ',
    boardName: 'Tên board', boardDescription: 'Mô tả', boardColor: 'Màu nền',
    updateSuccess: 'Đã cập nhật board', updateError: 'Không thể cập nhật board',
    boardView: 'Board view', noDescription: 'Chưa có mô tả.',
    listCount: '{count} danh sách', memberCount: '{count} thành viên',
    activityFeed: 'Hoạt động gần đây', activityEmpty: 'Chưa có hoạt động nào.',
    activityLoading: 'Đang tải...', showActivity: 'Xem hoạt động', hideActivity: 'Ẩn',
    loadMore: 'Tải thêm',
  },
  en: {
    loading: 'Loading board...',
    loadError: 'Could not load board',
    boardFallback: 'Board',
    workspaceFallback: 'Workspace',
    openWorkspace: 'Back to workspace',
    editBoard: 'Edit board', deleteBoard: 'Delete board', save: 'Save', cancel: 'Cancel',
    boardName: 'Board name', boardDescription: 'Description', boardColor: 'Background',
    updateSuccess: 'Board updated', updateError: 'Could not update board',
    boardView: 'Board view', noDescription: 'No description yet.',
    listCount: '{count} lists', memberCount: '{count} members',
    activityFeed: 'Recent activity', activityEmpty: 'No activity yet.',
    activityLoading: 'Loading...', showActivity: 'Show activity', hideActivity: 'Hide',
    loadMore: 'Load more',
  },
};

function tText(t, v = {}) {
  return Object.entries(v).reduce((r, [k, val]) => r.replace(`{${k}}`, val), t);
}
function getId(v) { return v?._id || v?.id || v; }

// ── Activity action → human-readable label ─────────────────────────
const ACTION_LABEL = {
  vi: {
    card_created:             'đã tạo card',
    card_updated:             'đã cập nhật card',
    card_deleted:             'đã xoá card',
    card_moved:               'đã di chuyển card',
    card_archived:            'đã lưu trữ card',
    card_completed:           'đã hoàn thành card',
    comment_added:            'đã bình luận',
    member_assigned:          'đã giao card',
    member_unassigned:        'đã bỏ giao card',
    checklist_item_added:     'đã thêm checklist',
    checklist_item_completed: 'đã hoàn thành checklist',
    checklist_item_moved:     'đã chuyển checklist',
    list_created:             'đã tạo list',
    list_updated:             'đã cập nhật list',
    list_deleted:             'đã xoá list',
    board_created:            'đã tạo board',
    board_updated:            'đã cập nhật board',
    attachment_added:         'đã đính kèm file',
    attachment_removed:       'đã xoá file đính kèm',
    due_date_changed:         'đã đổi hạn chót',
    label_added:              'đã thêm nhãn',
    label_removed:            'đã xoá nhãn',
  },
  en: {
    card_created:             'created card',
    card_updated:             'updated card',
    card_deleted:             'deleted card',
    card_moved:               'moved card',
    card_archived:            'archived card',
    card_completed:           'completed card',
    comment_added:            'commented',
    member_assigned:          'assigned card',
    member_unassigned:        'unassigned card',
    checklist_item_added:     'added checklist item',
    checklist_item_completed: 'completed checklist item',
    checklist_item_moved:     'moved checklist item',
    list_created:             'created list',
    list_updated:             'updated list',
    list_deleted:             'deleted list',
    board_created:            'created board',
    board_updated:            'updated board',
    attachment_added:         'attached a file',
    attachment_removed:       'removed attachment',
    due_date_changed:         'changed due date',
    label_added:              'added label',
    label_removed:            'removed label',
  },
};

function timeAgo(d, lang = 'vi') {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return lang === 'vi' ? 'vừa xong' : 'just now';
  if (m < 60) return lang === 'vi' ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'vi' ? `${h} giờ trước` : `${h}h ago`;
  const dd = Math.floor(h / 24);
  return lang === 'vi' ? `${dd} ngày trước` : `${dd}d ago`;
}

function ActivityFeed({ boardId, lang }) {
  const l = L[lang] || L.en;
  const labels = ACTION_LABEL[lang] || ACTION_LABEL.en;
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/activities/board/${boardId}?page=${p}&limit=10`);
      const data = res?.data ?? res;
      if (p === 1) setActivities(data.activities || []);
      else setActivities(prev => [...prev, ...(data.activities || [])]);
      const { total, limit } = data.pagination || {};
      setHasMore(p * (limit || 10) < (total || 0));
      setPage(p);
    } catch {
      setActivities([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(1); }, [boardId]);

  return (
    <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', padding: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(167,243,208,.8)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>
        {l.activityFeed}
      </h2>

      {loading && activities.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', padding: '8px 0' }}>{l.activityLoading}</p>
      ) : activities.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontStyle: 'italic', padding: '8px 0' }}>{l.activityEmpty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activities.map((act) => (
            <div key={act._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `hsl(${(act.actor?.name || 'U').charCodeAt(0) * 17 % 360},60%,42%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white',
              }}>
                {(act.actor?.name || 'U')[0].toUpperCase()}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', margin: 0, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600, color: 'white' }}>{act.actor?.name || '?'}</span>
                  {' '}
                  <span style={{ color: 'rgba(167,243,208,.7)' }}>{labels[act.action] || act.action}</span>
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', margin: '2px 0 0' }}>
                  {timeAgo(act.createdAt, lang)}
                </p>
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => load(page + 1)}
              disabled={loading}
              style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left', fontWeight: 600 }}
            >
              {loading ? '...' : l.loadMore}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────
function BoardEditModal({ board, l, onClose, onSaved }) {
  const [name,        setName]        = useState(board?.name || '');
  const [description, setDescription] = useState(board?.description || '');
  const [background,  setBackground]  = useState(board?.background || '#0f766e');
  const [isSaving,    setIsSaving]    = useState(false);
  const palette = ['#0f766e','#0369a1','#2563eb','#7c3aed','#c2410c','#b91c1c','#475569','#0f172a'];

  useEffect(() => {
    setName(board?.name || ''); setDescription(board?.description || ''); setBackground(board?.background || '#0f766e');
  }, [board]);

  const handleSave = async () => {
    if (!name.trim() || !board?._id) return;
    setIsSaving(true);
    try {
      const response = await boardService.updateBoard(board._id, { name: name.trim(), description: description.trim(), background });
      onSaved?.(response?.data || response);
      toast.success(l.updateSuccess);
      onClose();
    } catch (error) {
      toast.error(error?.message || l.updateError);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520, padding: 24, background: 'rgba(15,23,42,.98)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{l.editBoard}</h3>
          <button type="button" className="board-inline-close" onClick={onClose}>×</button>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">{l.boardName}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">{l.boardDescription}</label>
            <textarea className="input" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">{l.boardColor}</label>
            <div className="flex flex-wrap gap-2">
              {palette.map(color => (
                <button key={color} type="button" onClick={() => setBackground(color)}
                  style={{ width: 34, height: 34, borderRadius: 12, background: color, border: color === background ? '2px solid white' : '2px solid transparent', boxShadow: color === background ? '0 0 0 3px rgba(255,255,255,.12)' : 'none' }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>{l.cancel}</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving || !name.trim()}>{l.save}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function BoardPage() {
  const { boardId }   = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const lang          = useUiStore(s => s.language) || 'vi';
  const l             = L[lang] || L.vi;
  const user          = useAuthStore(s => s.user);
  const authLoading    = useAuthStore(s => s.isLoading);
  const accessToken    = useAuthStore(s => s.accessToken);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [showActivity,   setShowActivity]   = useState(false);
  const authReady = !authLoading && !!accessToken;

  const {
    data: boardRaw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardDetails(boardId),
    enabled: !!boardId && authReady,
  });
  const board       = boardRaw?.data ?? boardRaw;
  const workspace   = board?.workspace;
  const workspaceId = getId(workspace);
  const accent      = board?.background || '#0f766e';

  const memberCount = useMemo(() => {
    if (Array.isArray(board?.members) && board.members.length) return board.members.length;
    if (Array.isArray(workspace?.members)) return workspace.members.length;
    return 0;
  }, [board, workspace]);

  const canManageBoard = useMemo(() => {
    if (!user || !board || !workspace) return false;
    if (user.role === 'admin') return true;

    const userId = getId(user)?.toString();
    const ownerId = getId(workspace.owner)?.toString();
    const creatorId = getId(board.createdBy)?.toString();

    if (ownerId === userId) return true;
    if (creatorId === userId) return true;

    const member = Array.isArray(workspace.members)
      ? workspace.members.find((m) => getId(m.user)?.toString() === userId)
      : null;

    return ['admin', 'staff'].includes(member?.role);
  }, [user, board, workspace]);

  if (!authReady || isLoading) return (
    <div className="space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ width:120, height:14, borderRadius:8, background:'rgba(255,255,255,.08)' }} />
            <div style={{ width:240, height:28, borderRadius:10, background:'rgba(255,255,255,.1)' }} />
            <div style={{ width:180, height:13, borderRadius:8, background:'rgba(255,255,255,.06)' }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[80, 100, 80].map((w, i) => (
              <div key={i} style={{ width:w, height:32, borderRadius:10, background:'rgba(255,255,255,.07)' }} />
            ))}
          </div>
        </div>
      </div>
      {/* Board canvas skeleton */}
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4" style={{ height:480 }}>
        <div style={{ display:'flex', gap:12, height:'100%' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ width:280, flexShrink:0, borderRadius:14, background:'rgba(255,255,255,.05)', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ width:120, height:18, borderRadius:8, background:'rgba(255,255,255,.1)' }} />
              {[60,80,55].map((h, j) => (
                <div key={j} style={{ borderRadius:10, background:'rgba(255,255,255,.07)', height:h }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isError) {
    const is403 = error?.response?.status === 403 || error?.status === 403 || error?.message?.includes('403');
    const is404 = error?.response?.status === 404 || error?.status === 404;
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, gap:16, textAlign:'center' }}>
        <div style={{ fontSize:56 }}>{is403 ? '🔒' : '🔍'}</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'white', margin:0 }}>
          {is403
            ? (lang === 'vi' ? 'Bạn không có quyền truy cập board này' : 'You do not have access to this board')
            : is404
              ? (lang === 'vi' ? 'Không tìm thấy board' : 'Board not found')
              : l.loadError}
        </h2>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.45)', maxWidth:360, margin:0 }}>
          {is403
            ? (lang === 'vi' ? 'Board này là riêng tư hoặc bạn chưa được mời tham gia.' : 'This board is private or you have not been invited.')
            : is404
              ? (lang === 'vi' ? 'Board đã bị xóa hoặc link không đúng.' : 'This board may have been deleted or the link is incorrect.')
              : error?.message || ''}
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/dashboard')}
        >
          {lang === 'vi' ? '← Về Dashboard' : '← Back to Dashboard'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Board header info */}
      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-3.5 w-3.5 rounded-full border border-white/15" style={{ background: accent }} />
              <div className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
                {l.boardView}
              </div>
              {workspaceId ? (
                <Link to={`/workspace/${workspaceId}`}
                  className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
                  {workspace?.name || l.workspaceFallback}
                </Link>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
              <h1 className="heading-soft truncate text-[30px] font-semibold text-white">
                {board?.name || l.boardFallback}
              </h1>
              <div className="flex flex-wrap gap-2 text-[12px] text-white/45">
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">{tText(l.listCount, { count: board?.lists?.length || 0 })}</span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">{tText(l.memberCount, { count: memberCount })}</span>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-white/55">{board?.description || l.noDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Toggle activity feed */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowActivity(v => !v)}
              style={showActivity ? { borderColor: 'rgba(52,211,153,.4)', color: '#6ee7b7' } : {}}
            >
              📋 {showActivity ? l.hideActivity : l.showActivity}
            </button>
            {canManageBoard && (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditingBoard(true)}>
                  {l.editBoard}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    if (!window.confirm(l.deleteBoard)) return;
                    try {
                      await boardService.deleteBoard(board._id);
                      navigate(workspaceId ? `/workspace/${workspaceId}` : '/dashboard');
                    } catch (error) {
                      toast.error(error?.message || l.updateError);
                    }
                  }}
                >
                  {l.deleteBoard}
                </button>
              </>
            )}
            {workspaceId && (
              <Link to={`/workspace/${workspaceId}`} className="btn btn-secondary btn-sm">
                {l.openWorkspace}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className={`grid gap-5 ${showActivity ? 'xl:grid-cols-[1fr_300px]' : ''}`}>
        {/* Board canvas */}
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-1">
          <BoardCanvas boardId={boardId} showHeader />
        </div>

        {/* Activity feed panel */}
        {showActivity && <ActivityFeed boardId={boardId} lang={lang} />}
      </div>

      {isEditingBoard && (
        <BoardEditModal
          board={board} l={l}
          onClose={() => setIsEditingBoard(false)}
          onSaved={(nextBoard) => {
            queryClient.setQueryData(['board', boardId], (prev) => {
              const currentBoard = prev?.data ?? prev;
              if (!currentBoard) return prev;
              const mergedBoard = { ...currentBoard, ...nextBoard };
              return prev?.data ? { ...prev, data: mergedBoard } : mergedBoard;
            });
          }}
        />
      )}
    </div>
  );
}
