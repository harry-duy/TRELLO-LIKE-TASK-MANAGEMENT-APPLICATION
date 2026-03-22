import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import StarButton from '@components/board/StarButton';
import toast from 'react-hot-toast';

const L = {
  vi: {
    sidebarBoards: 'Bảng',
    sidebarRecent: 'Gần đây',
    sidebarWorkspaces: 'Workspaces',
    sidebarOwnedWorkspaces: 'Workspace của bạn',
    sidebarGuestWorkspaces: 'Workspace được mời',
    invitedBadge: 'Mời',
    title: 'Bảng điều khiển',
    recentTitle: 'Đã xem gần đây',
    recentEmpty: 'Chưa có board nào gần đây',
    recentHint: 'Khi bạn mở board và làm việc trong đó, nó sẽ hiện ở đây.',
    guestWorkspaces: 'Workspace được mời',
    guestHint: 'Những workspace bạn tham gia với tư cách thành viên.',
    focusWorkspace: 'Workspace đang xem',
    focusWorkspaceHint: 'Chọn workspace ở cột trái để xem nhanh board bên trong, không cần kéo quá dài.',
    workspaceBoards: 'Bảng',
    workspaceMembers: 'Thành viên',
    workspaceSettings: 'Cài đặt',
    workspaceSettingsTitle: 'Cài đặt workspace',
    workspaceSettingsHint: 'Xem nhanh thông tin workspace và các hành động khả dụng.',
    workspaceType: 'Loại',
    workspaceTypeOwned: 'Workspace của bạn',
    workspaceTypeGuest: 'Workspace được mời',
    workspaceDescription: 'Mô tả',
    workspaceRoleNote: 'Các thao tác nâng cao như đổi tên, phân quyền hoặc xoá workspace sẽ nối thêm khi backend sẵn sàng.',
    workspaceIdLabel: 'Mã workspace',
    copyId: 'Sao chép mã',
    copied: 'Đã sao chép',
    close: 'Đóng',
    edit: 'Chỉnh sửa',
    save: 'Lưu',
    cancel: 'Huỷ',
    deleteWorkspace: 'Xoá workspace',
    deleteConfirm: 'Xoá workspace này?',
    updateSuccess: 'Đã cập nhật workspace',
    deleteSuccess: 'Đã xoá workspace',
    updateUnsupported: 'Backend chưa hỗ trợ cập nhật workspace',
    deleteUnsupported: 'Backend chưa hỗ trợ xoá workspace',
    createBoard: 'Tạo board mới',
    openWorkspace: 'Mở workspace',
    openBoard: 'Mở board',
    loading: 'Đang tải dữ liệu...',
    loadError: 'Không thể tải dữ liệu',
    emptyWorkspace: 'Chưa có workspace nào',
    emptyWorkspaceHint: 'Tạo workspace đầu tiên để bắt đầu quản lý board và thành viên.',
    emptyBoards: 'Workspace này chưa có board nào.',
    noDescription: 'Chưa có mô tả.',
    membersCount: '{count} thành viên',
    updatedAt: 'Cập nhật {date}',
  },
  en: {
    sidebarBoards: 'Boards',
    sidebarRecent: 'Recent',
    sidebarWorkspaces: 'Workspaces',
    sidebarOwnedWorkspaces: 'Your workspaces',
    sidebarGuestWorkspaces: 'Invited workspaces',
    invitedBadge: 'Invited',
    title: 'Dashboard',
    recentTitle: 'Recently viewed',
    recentEmpty: 'No recent boards yet',
    recentHint: 'Boards you open and work on will appear here.',
    guestWorkspaces: 'Guest workspaces',
    guestHint: 'Workspaces you joined as a member.',
    focusWorkspace: 'Workspace in focus',
    focusWorkspaceHint: 'Pick a workspace from the left to preview its boards without scrolling through a long list.',
    workspaceBoards: 'Boards',
    workspaceMembers: 'Members',
    workspaceSettings: 'Settings',
    workspaceSettingsTitle: 'Workspace settings',
    workspaceSettingsHint: 'Quickly review workspace information and available actions.',
    workspaceType: 'Type',
    workspaceTypeOwned: 'Your workspace',
    workspaceTypeGuest: 'Invited workspace',
    workspaceDescription: 'Description',
    workspaceRoleNote: 'Advanced actions like rename, permissions, or deleting a workspace can be wired once the backend is ready.',
    workspaceIdLabel: 'Workspace ID',
    copyId: 'Copy ID',
    copied: 'Copied',
    close: 'Close',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    deleteWorkspace: 'Delete workspace',
    deleteConfirm: 'Delete this workspace?',
    updateSuccess: 'Workspace updated',
    deleteSuccess: 'Workspace deleted',
    updateUnsupported: 'Backend does not support updating workspace yet',
    deleteUnsupported: 'Backend does not support deleting workspace yet',
    createBoard: 'Create new board',
    openWorkspace: 'Open workspace',
    openBoard: 'Open board',
    loading: 'Loading data...',
    loadError: 'Could not load data',
    emptyWorkspace: 'No workspaces yet',
    emptyWorkspaceHint: 'Create your first workspace to start managing boards and members.',
    emptyBoards: 'This workspace does not have any boards yet.',
    noDescription: 'No description yet.',
    membersCount: '{count} members',
    updatedAt: 'Updated {date}',
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

function WorkspaceSidebar({
  ownedWorkspaces,
  guestWorkspaces,
  currentWorkspaceId,
  l,
  onSelectWorkspace,
}) {
  const renderWorkspaceGroup = (title, workspaces, isGuest = false) => {
    if (!workspaces.length) return null;

    return (
      <div className="space-y-2">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">
          {title}
        </div>
        <div className="space-y-2">
          {workspaces.map((workspace) => {
            const id = getId(workspace);
            const accent = `hsl(${((workspace.name?.charCodeAt(0) || 0) * 13) % 360}, 72%, 52%)`;
            const active = id === currentWorkspaceId;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectWorkspace?.(id)}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/65 hover:bg-white/6 hover:text-white'
                }`}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                  style={{ background: accent }}
                >
                  {(workspace.name || 'W')[0].toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{workspace.name}</span>
                {isGuest ? (
                  <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100">
                    {l.invitedBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-3.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
      <nav className="space-y-2">
        {[
          { label: l.sidebarBoards, active: true },
          { label: l.sidebarRecent, active: false },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-[13px] font-medium transition ${
              item.active
                ? 'bg-sky-500/18 text-white shadow-[inset_0_0_0_1px_rgba(147,197,253,0.18)]'
                : 'text-white/65 hover:bg-white/8 hover:text-white'
            }`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black/20 text-[10px]">
              {item.label.slice(0, 1)}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          {l.sidebarWorkspaces}
        </div>
        <div className="space-y-3">
          {renderWorkspaceGroup(l.sidebarOwnedWorkspaces, ownedWorkspaces)}
          {renderWorkspaceGroup(l.sidebarGuestWorkspaces, guestWorkspaces, true)}
        </div>
      </div>
    </aside>
  );
}

function BoardCard({ board, l, onStarToggle }) {
  const navigate = useNavigate();

  return (
    <div className="w-[264px] overflow-hidden rounded-[16px] border border-white/10 bg-slate-900/50 transition hover:-translate-y-0.5 hover:border-emerald-200/20">
      <div style={{ height: 68, background: board.background || '#0f766e' }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-white">{board.name}</div>
            <div className="mt-1 truncate text-[11px] text-white/40">
              {tText(l.updatedAt, {
                date: new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(),
              })}
            </div>
          </div>
          <div onClick={(event) => event.stopPropagation()}>
            <StarButton board={board} size="sm" onToggle={onStarToggle} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/board/${board._id}`)}
          className="mt-2.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-white/15"
        >
          {l.openBoard}
        </button>
      </div>
    </div>
  );
}

// Tìm hàm WorkspaceSettingsModal trong DashboardPage.jsx và thay bằng đoạn này

function WorkspaceSettingsModal({
  workspace,
  boardCount,
  isGuest,
  l,
  onClose,
  onUpdated,
  onDeleted,
  defaultTab = 'info',   // ← THÊM
}) {
  

  // ── Local state ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState(defaultTab);   // 'info' | 'members'
  const [isEditing,   setIsEditing]   = useState(false);
  const [name,        setName]        = useState(workspace?.name        || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [visibility,  setVisibility]  = useState(workspace?.visibility  || 'private');
  const [isSaving,    setIsSaving]    = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);

  // Reset khi workspace thay đổi
  useEffect(() => {
    setTab('info');
    setIsEditing(false);
    setName(workspace?.name        || '');
    setDescription(workspace?.description || '');
    setVisibility(workspace?.visibility   || 'private');
    setIsSaving(false);
    setIsDeleting(false);
  }, [workspace]);

  if (!workspace) return null;

  const workspaceId = workspace?._id || workspace?.id || workspace;
  const updatedAt   = new Date(
    workspace.updatedAt || workspace.createdAt || Date.now()
  ).toLocaleDateString();

  // ── Copy ID ────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(workspaceId));
      toast.success(l.copied);
    } catch {
      toast.error('Copy failed');
    }
  };

  // ── Save (updateWorkspace) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      // Gọi PUT /api/workspaces/:id
      const res           = await workspaceService.updateWorkspace(workspaceId, {
        name:        name.trim(),
        description: description.trim(),
        visibility,
      });
      const nextWorkspace = res?.data || res;

      onUpdated?.(workspaceId, nextWorkspace);
      toast.success(l.updateSuccess);
      setIsEditing(false);
    } catch (err) {
      toast.error(err?.message || l.updateUnsupported);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete (deleteWorkspace) ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(l.deleteConfirm)) return;
    setIsDeleting(true);
    try {
      // Gọi DELETE /api/workspaces/:id
      await workspaceService.deleteWorkspace(workspaceId);

      onDeleted?.(workspaceId);
      toast.success(l.deleteSuccess);
      onClose();
    } catch (err) {
      toast.error(err?.message || l.deleteUnsupported);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 120 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 24, background: 'rgba(15,23,42,.98)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {l.workspaceSettingsTitle}
            </h3>
            <p className="mt-1 text-sm text-white/50">{l.workspaceSettingsHint}</p>
          </div>
          <button type="button" className="board-inline-close" onClick={onClose}>
            x
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, marginTop: 16, marginBottom: 20,
          background: 'rgba(255,255,255,.05)', borderRadius: 999, padding: 3,
        }}>
          {[
            { key: 'info',    label: l.workspaceSettings },
            { key: 'members', label: l.workspaceMembers  },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '6px 12px', borderRadius: 999,
                border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: 600, transition: 'all .15s',
                background: tab === t.key ? 'white'       : 'transparent',
                color:      tab === t.key ? '#0f172a'     : 'rgba(255,255,255,.6)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Info ───────────────────────────────────────────────────── */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* Workspace card preview */}
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{
                    background: `hsl(${
                      ((workspace.name?.charCodeAt(0) || 0) * 13) % 360
                    },72%,52%)`,
                  }}
                >
                  {(workspace.name || 'W')[0].toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={l.workspaceSettingsTitle}
                      autoFocus
                    />
                  ) : (
                    <h4 className="truncate text-[18px] font-semibold text-white">
                      {workspace.name}
                    </h4>
                  )}

                  {isEditing ? (
                    <textarea
                      className="input mt-2"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={l.descLabel}
                    />
                  ) : (
                    <p className="mt-2 text-sm text-white/60">
                      {workspace.description || l.noDescription}
                    </p>
                  )}

                  {/* Visibility toggle — chỉ hiện khi đang edit */}
                  {isEditing && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '.08em', color: 'rgba(167,243,208,.5)',
                        display: 'block', marginBottom: 6,
                      }}>
                        Visibility
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['private', 'public'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVisibility(v)}
                            style={{
                              padding: '6px 14px', borderRadius: 8,
                              border: '1px solid',
                              borderColor: visibility === v
                                ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.1)',
                              background: visibility === v
                                ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.04)',
                              color: visibility === v ? '#34d399' : 'rgba(255,255,255,.5)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              textTransform: 'capitalize',
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: l.workspaceBoards,  val: boardCount },
                { label: l.workspaceMembers, val: workspace.members?.length || 0 },
                {
                  label: l.updatedAt?.replace('{date}', '').trim() || 'Updated',
                  val:   updatedAt,
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                >
                  <div style={{
                    fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: '.06em', color: 'rgba(255,255,255,.35)',
                    marginBottom: 4,
                  }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>
                    {c.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Workspace ID */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white/45">{l.workspaceIdLabel}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5
                             text-xs font-medium text-white/80 transition
                             hover:bg-white/10 hover:text-white"
                >
                  {l.copyId}
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.06]
                            px-4 py-3 text-sm text-amber-50/80">
              {isGuest
                ? 'Bạn là thành viên được mời — chỉ owner/admin mới chỉnh sửa được.'
                : l.workspaceRoleNote}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Trái: Edit / Delete */}
              <div className="flex flex-wrap gap-2">
                {!isGuest && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (isEditing) {
                          setIsEditing(false);
                          setName(workspace.name || '');
                          setDescription(workspace.description || '');
                          setVisibility(workspace.visibility || 'private');
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      disabled={isSaving || isDeleting}
                    >
                      {isEditing ? l.cancel : l.edit}
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleDelete}
                      disabled={isSaving || isDeleting}
                    >
                      {isDeleting ? 'Đang xoá...' : l.deleteWorkspace}
                    </button>
                  </>
                )}
              </div>

              {/* Phải: Save / Open */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                >
                  {l.close}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={isSaving || !name.trim()}
                  >
                    {isSaving ? 'Đang lưu...' : l.save}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onClose();
                    navigate(`/workspace/${workspaceId}`);
                  }}
                >
                  {l.openWorkspace}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Members ─────────────────────────────────────────────────── */}
        {tab === 'members' && (
          <MembersTab
            workspaceId={workspaceId}
            isGuest={isGuest}
            l={l}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-component: MembersTab ─────────────────────────────────────────────────
// Đặt ngay bên dưới WorkspaceSettingsModal trong cùng file DashboardPage.jsx
function MembersTab({ workspaceId, isGuest, l }) {
  const { user }                    = useAuthStore();
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState('member');
  const [inviting,   setInviting]   = useState(false);
  const [workspace,  setWorkspace]  = useState(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await workspaceService.getWorkspace(workspaceId);
      const ws  = res?.data || res;
      setWorkspace(ws);
      setMembers([
        { user: ws.owner, role: 'owner' },
        ...(ws.members || []).filter(
          (m) =>
            (m.user?._id || m.user)?.toString() !==
            (ws.owner?._id || ws.owner)?.toString()
        ),
      ]);
    } catch {
      setMembers([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, [workspaceId]);

  const isAdmin = !isGuest && (
    workspace?.owner?.toString() === user?._id?.toString() ||
    workspace?.owner?._id?.toString() === user?._id?.toString() ||
    (workspace?.members || []).some(
      (m) =>
        (m.user?._id || m.user)?.toString() === user?._id?.toString() &&
        m.role === 'admin'
    )
  );

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await workspaceService.addMember(workspaceId, email.trim(), role);
      toast.success('Đã mời thành viên!');
      setEmail('');
      loadMembers();
    } catch (err) {
      toast.error(err?.message || 'Không tìm thấy email này');
    }
    setInviting(false);
  };

  const handleRemove = async (userId) => {
    try {
      await workspaceService.removeMember(workspaceId, userId);
      toast.success('Đã xoá thành viên');
      loadMembers();
    } catch (err) {
      toast.error(err?.message || 'Không thể xoá');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await workspaceService.updateMemberRole(workspaceId, userId, newRole);
      toast.success('Đã đổi role');
      loadMembers();
    } catch (err) {
      toast.error(err?.message || 'Không thể đổi role');
    }
  };

  const roleColor = { owner: '#fbbf24', admin: '#60a5fa', staff: '#a78bfa', member: 'rgba(255,255,255,.4)' };

  return (
    <div className="space-y-4">
      {/* Invite form — chỉ hiện với admin */}
      {isAdmin && (
        <div style={{
          padding: 14, borderRadius: 14,
          border: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(255,255,255,.03)',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 10,
          }}>
            Mời thành viên
          </p>
          <input
            className="input"
            placeholder="Email người dùng"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input"
              style={{ flex: 1 }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
            >
              {inviting ? '...' : 'Mời'}
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, padding: 16 }}>
            Đang tải...
          </p>
        ) : (
          members.map((m, i) => {
            const u     = m.user;
            const uid   = u?._id || u;
            const isYou = uid?.toString() === user?._id?.toString();
            const canKick = isAdmin && m.role !== 'owner' && !isYou;
            const canChangeRole =
              (workspace?.owner?.toString() === user?._id?.toString() ||
               workspace?.owner?._id?.toString() === user?._id?.toString()) &&
              m.role !== 'owner';

            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: i < members.length - 1
                    ? '1px solid rgba(255,255,255,.06)' : 'none',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${(u?.name || '').charCodeAt(0) * 17 % 360},60%,42%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'white',
                }}>
                  {(u?.name || '?')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 500, margin: 0 }}>
                    {u?.name || String(uid)}
                    {isYou && (
                      <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, marginLeft: 4 }}>
                        (Bạn)
                      </span>
                    )}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: 0 }}>
                    {u?.email || ''}
                  </p>
                </div>

                {/* Role: dropdown nếu owner, badge nếu không */}
                {canChangeRole ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(String(uid), e.target.value)}
                    style={{
                      padding: '3px 6px', borderRadius: 8, outline: 'none',
                      border: '1px solid rgba(255,255,255,.15)',
                      background: 'rgba(15,20,36,.9)',
                      color: roleColor[m.role] || 'white',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 999,
                    padding: '2px 8px', whiteSpace: 'nowrap',
                    color: roleColor[m.role] || 'white',
                    background: `${roleColor[m.role] || '#fff'}20`,
                  }}>
                    {m.role}
                  </span>
                )}

                {/* Kick button */}
                {canKick && (
                  <button
                    type="button"
                    onClick={() => handleRemove(String(uid))}
                    title="Xoá khỏi workspace"
                    style={{
                      width: 24, height: 24, borderRadius: '50%', border: 'none',
                      background: 'rgba(239,68,68,.2)', color: '#f87171',
                      cursor: 'pointer', fontSize: 11, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function WorkspaceSection({
  title,
  subtitle,
  workspaces,
  boardsByWorkspace,
  l,
  guestWorkspaceIds,
  onOpenSettings,
}) {
  return (
    <section className="space-y-3.5">
      <div>
        <h2 className="heading-soft text-[15px] font-semibold uppercase tracking-[0.04em] text-white/85">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-[13px] text-white/45">{subtitle}</p> : null}
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-[13px] text-white/55">
          <div className="font-medium text-white/75">{l.emptyWorkspace}</div>
          <div className="mt-1">{l.emptyWorkspaceHint}</div>
        </div>
      ) : (
        <div className="space-y-6">
          {workspaces.map((workspace) => {
            const workspaceId = getId(workspace);
            const boards = boardsByWorkspace.get(workspaceId) || [];
            const accent = `hsl(${((workspace.name?.charCodeAt(0) || 0) * 13) % 360}, 72%, 52%)`;
            const isGuest = guestWorkspaceIds?.has?.(workspaceId);

            return (
              <div
                key={workspaceId}
                className="space-y-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-3.5 py-3.5"
              >
                <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                      style={{ background: accent }}
                    >
                      {(workspace.name || 'W')[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[17px] font-semibold text-white">{workspace.name}</div>
                        {isGuest ? (
                          <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100">
                            {l.invitedBadge}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-white/42">
                        {workspace.description || l.noDescription}
                        <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:inline-block" />
                        <span>{tText(l.membersCount, { count: workspace.members?.length || 0 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm !rounded-xl !border-white/8 !bg-white/5 !px-2.5 !py-1.5 !text-[11px]"
                    >
                      {l.workspaceBoards}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm !rounded-xl !border-white/8 !bg-white/5 !px-2.5 !py-1.5 !text-[11px]"
                    >
                      {l.workspaceMembers}
                    </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm !rounded-xl !border-white/8 !bg-white/5 !px-2.5 !py-1.5 !text-[11px]"
                        onClick={() => {
                          // Mở settings modal rồi tự động chuyển sang tab members
                          onOpenSettings?.(workspace, 'members');
                        }}
                      >
                        {l.workspaceMembers}
                      </button>
                    <Link
                      to={`/workspace/${workspaceId}`}
                      className="btn btn-secondary btn-sm !rounded-xl !border-white/8 !bg-white/5 !px-2.5 !py-1.5 !text-[11px]"
                    >
                      {l.openWorkspace}
                    </Link>
                  </div>
                </div>

                {boards.length === 0 ? (
                  <div className="flex flex-wrap gap-4">
                    <div className="w-[264px] rounded-[18px] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-[13px] text-white/55">
                      <div className="font-medium text-white/75">{l.emptyBoards}</div>
                      <div className="mt-1 text-[12px] text-white/40">
                        {tText(l.membersCount, { count: workspace.members?.length || 0 })}
                      </div>
                    </div>
                    <Link
                      to={`/workspace/${workspaceId}`}
                      className="flex min-h-[136px] w-[264px] items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/5 px-5 text-center text-[15px] font-medium text-white/70 transition hover:border-emerald-200/30 hover:bg-white/10 hover:text-white"
                    >
                      {l.createBoard}
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {boards.slice(0, 5).map((board) => (
                      <BoardCard key={board._id} board={board} l={l} />
                    ))}
                    <Link
                      to={`/workspace/${workspaceId}`}
                      className="flex min-h-[136px] w-[264px] items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/5 px-5 text-center text-[15px] font-medium text-white/70 transition hover:border-emerald-200/30 hover:bg-white/10 hover:text-white"
                    >
                      {l.createBoard}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const lang = useUiStore((state) => state.language) || 'vi';
  const l = L[lang] || L.vi;
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [settingsWorkspace, setSettingsWorkspace] = useState(null);
  const [settingsTab, setSettingsTab] = useState('info');
  const [state, setState] = useState({
    status: 'loading',
    workspaces: [],
    boards: [],
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    Promise.all([
      workspaceService.getMyWorkspaces(),
      boardService.getBoards({ isClosed: false }),
    ])
      .then(([workspaceData, boardData]) => {
        if (!mounted) return;
        const workspaces = Array.isArray(workspaceData)
          ? workspaceData
          : workspaceData?.data || [];
        const boards = Array.isArray(boardData) ? boardData : boardData?.data || [];
        setState({ status: 'ready', workspaces, boards, error: null });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({ status: 'error', workspaces: [], boards: [], error });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentUserId = user?._id?.toString();

  const ownedWorkspaces = useMemo(
    () =>
      state.workspaces.filter(
        (workspace) => getId(workspace.owner)?.toString() === currentUserId
      ),
    [state.workspaces, currentUserId]
  );

  const guestWorkspaces = useMemo(
    () =>
      state.workspaces.filter(
        (workspace) => getId(workspace.owner)?.toString() !== currentUserId
      ),
    [state.workspaces, currentUserId]
  );

  const boardsByWorkspace = useMemo(() => {
    const grouped = new Map();
    state.boards.forEach((board) => {
      const workspaceId = getId(board.workspace)?.toString();
      if (!workspaceId) return;
      if (!grouped.has(workspaceId)) grouped.set(workspaceId, []);
      grouped.get(workspaceId).push(board);
    });
    return grouped;
  }, [state.boards]);

  const recentBoards = useMemo(
    () =>
      [...state.boards]
        .sort(
          (left, right) =>
            new Date(right.updatedAt || right.createdAt || 0) -
            new Date(left.updatedAt || left.createdAt || 0)
        )
        .slice(0, 4),
    [state.boards]
  );

  const sidebarWorkspaces = useMemo(
    () => [...ownedWorkspaces, ...guestWorkspaces],
    [ownedWorkspaces, guestWorkspaces]
  );

  useEffect(() => {
    if (sidebarWorkspaces.length === 0) {
      setSelectedWorkspaceId(null);
      return;
    }

    setSelectedWorkspaceId((current) => {
      if (current && sidebarWorkspaces.some((workspace) => getId(workspace) === current)) {
        return current;
      }
      return getId(sidebarWorkspaces[0]);
    });
  }, [sidebarWorkspaces]);

  const selectedWorkspace = useMemo(
    () => sidebarWorkspaces.find((workspace) => getId(workspace) === selectedWorkspaceId) || null,
    [sidebarWorkspaces, selectedWorkspaceId]
  );

  const guestWorkspaceIds = useMemo(
    () => new Set(guestWorkspaces.map((workspace) => getId(workspace))),
    [guestWorkspaces]
  );

  const selectedWorkspaceIsGuest = useMemo(() => {
    if (!selectedWorkspace) return false;
    return guestWorkspaces.some((workspace) => getId(workspace) === getId(selectedWorkspace));
  }, [guestWorkspaces, selectedWorkspace]);

  const handleWorkspaceUpdated = (workspaceId, nextWorkspace) => {
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((workspace) =>
        getId(workspace) === workspaceId ? { ...workspace, ...nextWorkspace } : workspace
      ),
    }));
    setSettingsWorkspace((current) =>
      current && getId(current) === workspaceId ? { ...current, ...nextWorkspace } : current
    );
  };

  const handleWorkspaceDeleted = (workspaceId) => {
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.filter((workspace) => getId(workspace) !== workspaceId),
      boards: prev.boards.filter((board) => getId(board.workspace) !== workspaceId),
    }));
    setSettingsWorkspace(null);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <WorkspaceSidebar
        ownedWorkspaces={ownedWorkspaces}
        guestWorkspaces={guestWorkspaces}
        currentWorkspaceId={selectedWorkspaceId}
        l={l}
        onSelectWorkspace={setSelectedWorkspaceId}
      />

      <div className="max-w-[1180px] space-y-7">
        {state.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-emerald-50/70">
            <span className="spinner border-primary-600" />
            {l.loading}
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-sm text-red-300">
            {state.error?.message ? `${l.loadError}: ${state.error.message}` : l.loadError}
          </p>
        )}

        {state.status === 'ready' && (
          <>
            <section className="space-y-3.5">
              <div>
                <h1 className="heading-soft text-[22px] font-semibold text-white">{l.title}</h1>
                <p className="mt-1 text-[13px] text-white/45">{l.recentHint}</p>
              </div>

              {recentBoards.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-[13px] text-white/55">
                  <div className="font-medium text-white/75">{l.recentEmpty}</div>
                  <div className="mt-1">{l.recentHint}</div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {recentBoards.map((board) => (
                    <BoardCard key={board._id} board={board} l={l} />
                  ))}
                </div>
              )}
            </section>

            <WorkspaceSection
              title={selectedWorkspaceIsGuest ? l.guestWorkspaces : l.focusWorkspace}
              subtitle={selectedWorkspaceIsGuest ? l.guestHint : l.focusWorkspaceHint}
              workspaces={selectedWorkspace ? [selectedWorkspace] : []}
              boardsByWorkspace={boardsByWorkspace}
              l={l}
              guestWorkspaceIds={guestWorkspaceIds}
              onOpenSettings={(ws, tab = 'info') => {
                setSettingsWorkspace(ws);
                setSettingsTab(tab);
              }}
            />
          </>
        )}
      </div>

      <WorkspaceSettingsModal
        workspace={settingsWorkspace}
        boardCount={settingsWorkspace ? (boardsByWorkspace.get(getId(settingsWorkspace)) || []).length : 0}
        isGuest={settingsWorkspace ? guestWorkspaceIds.has(getId(settingsWorkspace)) : false}
        l={l}
        onClose={() => setSettingsWorkspace(null)}
        onUpdated={handleWorkspaceUpdated}
        onDeleted={handleWorkspaceDeleted}
        defaultTab={settingsTab}
      />
    </div>
  );
}
