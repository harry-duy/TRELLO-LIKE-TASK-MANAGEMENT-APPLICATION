import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import StarButton from '@components/board/StarButton';
import toast from 'react-hot-toast';

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
    ownerSection: 'Owner',
    memberSection: 'Thành viên',
    memberHint: 'Mời và quản lý quyền truy cập ngay trong workspace này.',
    memberPanelTitle: 'Danh sách thành viên',
    memberPanelHint: 'Xem vai trò và các board mỗi người đang tham gia.',
    openMembers: 'Xem thành viên',
    closeMembers: 'Đóng',
    boardAccess: 'Board tham gia',
    noBoardsAssigned: 'Chưa được thêm vào board nào',
    settingsSection: 'Thiết lập workspace',
    settingsHint: 'Cập nhật thông tin cơ bản của workspace.',
    workspaceDetails: 'Thông tin workspace',
    inviteEmailPh: 'Email người dùng',
    inviteRoleLabel: 'Vai trò',
    inviteBtn: 'Mời thành viên',
    saveWorkspace: 'Lưu thay đổi',
    saving: 'Đang lưu...',
    inviteOk: 'Đã mời thành viên',
    inviteFail: 'Không thể mời thành viên',
    roleUpdated: 'Đã cập nhật vai trò',
    roleUpdateFail: 'Không thể cập nhật vai trò',
    removeMember: 'Xoá',
    removeMemberOk: 'Đã xoá thành viên',
    removeMemberFail: 'Không thể xoá thành viên',
    noMembersYet: 'Chưa có thành viên nào ngoài owner.',
    ownerRole: 'Owner',
    memberRole: 'Member',
    staffRole: 'Staff',
    updateWorkspaceOk: 'Đã cập nhật workspace',
    updateWorkspaceFail: 'Không thể cập nhật workspace',
    visibilityLabel: 'Quyền riêng tư',
    privateVisibility: 'Riêng tư',
    publicVisibility: 'Công khai',
    editWorkspace: 'Chỉnh sửa workspace',
    hideSettings: 'Ẩn chỉnh sửa',
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
    ownerSection: 'Owner',
    memberSection: 'Members',
    memberHint: 'Invite people and manage access directly in this workspace.',
    memberPanelTitle: 'Members list',
    memberPanelHint: 'See each role and the boards they can access.',
    openMembers: 'View members',
    closeMembers: 'Close',
    boardAccess: 'Board access',
    noBoardsAssigned: 'Not added to any board yet',
    settingsSection: 'Workspace settings',
    settingsHint: 'Update the basic workspace details.',
    workspaceDetails: 'Workspace details',
    inviteEmailPh: 'User email',
    inviteRoleLabel: 'Role',
    inviteBtn: 'Invite member',
    saveWorkspace: 'Save changes',
    saving: 'Saving...',
    inviteOk: 'Member invited',
    inviteFail: 'Could not invite member',
    roleUpdated: 'Role updated',
    roleUpdateFail: 'Could not update role',
    removeMember: 'Remove',
    removeMemberOk: 'Member removed',
    removeMemberFail: 'Could not remove member',
    noMembersYet: 'No members yet besides the owner.',
    ownerRole: 'Owner',
    memberRole: 'Member',
    staffRole: 'Staff',
    updateWorkspaceOk: 'Workspace updated',
    updateWorkspaceFail: 'Could not update workspace',
    visibilityLabel: 'Visibility',
    privateVisibility: 'Private',
    publicVisibility: 'Public',
    editWorkspace: 'Edit workspace',
    hideSettings: 'Hide settings',
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

function AvatarBadge({ user, size = 40 }) {
  const name = user?.name || '?';
  const avatar = user?.avatar;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full text-sm font-bold text-white"
      style={{
        width: size,
        height: size,
        background: `hsl(${(name.charCodeAt(0) * 17) % 360}, 60%, 42%)`,
      }}
    >
      {name[0].toUpperCase()}
    </div>
  );
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState('private');

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

  useEffect(() => {
    if (!state.workspace) return;
    setEditName(state.workspace.name || '');
    setEditDesc(state.workspace.description || '');
    setEditVisibility(state.workspace.visibility || 'private');
  }, [state.workspace]);

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
  const ownerId = getId(workspace?.owner)?.toString();
  const members = (workspace?.members || []).filter(
    (member) => getId(member.user)?.toString() !== ownerId
  );
  const isOwner = ownerId === user?._id?.toString();
  const myWorkspaceMember = (workspace?.members || []).find(
    (m) => getId(m.user)?.toString() === user?._id?.toString()
  );
  const isSystemAdmin = user?.role === 'admin';
  const canCreateBoard = isOwner || ['admin', 'staff'].includes(myWorkspaceMember?.role);
  const canManageMembers = isSystemAdmin || isOwner || myWorkspaceMember?.role === 'admin';
  const canUpdateWorkspace = canManageMembers;
  const canChangeRoles = isSystemAdmin || isOwner;
  const accent = `hsl(${((workspace?.name?.charCodeAt(0) || 0) * 13) % 360}, 68%, 48%)`;
  const owner = workspace?.owner;
  const memberRows = [
    owner ? { user: owner, role: 'owner' } : null,
    ...members,
  ].filter(Boolean);

  async function handleInviteMember() {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await workspaceService.addMember(workspaceId, inviteEmail.trim(), inviteRole);
      toast.success(l.inviteOk);
      setInviteEmail('');
      setInviteRole('member');
      await loadWorkspace();
    } catch (error) {
      toast.error(error?.message || l.inviteFail);
    } finally {
      setIsInviting(false);
    }
  }

  async function handleUpdateRole(userId, role) {
    try {
      await workspaceService.updateMemberRole(workspaceId, userId, role);
      toast.success(l.roleUpdated);
      await loadWorkspace();
    } catch (error) {
      toast.error(error?.message || l.roleUpdateFail);
    }
  }

  async function handleRemoveMember(userId) {
    try {
      await workspaceService.removeMember(workspaceId, userId);
      toast.success(l.removeMemberOk);
      await loadWorkspace();
    } catch (error) {
      toast.error(error?.message || l.removeMemberFail);
    }
  }

  async function handleSaveWorkspace() {
    if (!editName.trim()) return;

    setIsSavingWorkspace(true);
    try {
      await workspaceService.updateWorkspace(workspaceId, {
        name: editName.trim(),
        description: editDesc.trim(),
        visibility: editVisibility,
      });
      toast.success(l.updateWorkspaceOk);
      await loadWorkspace();
    } catch (error) {
      toast.error(error?.message || l.updateWorkspaceFail);
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  function getMemberBoards(memberUserId) {
    return boards.filter((board) => {
      const createdById = getId(board.createdBy)?.toString();
      if (createdById === memberUserId) return true;

      return Array.isArray(board.members)
        ? board.members.some((boardMember) => getId(boardMember.user || boardMember)?.toString() === memberUserId)
        : false;
    });
  }

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
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMembersPanel(true)}>
                {l.openMembers}
              </button>
              {canUpdateWorkspace && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSettings((prev) => !prev)}>
                  {showSettings ? l.hideSettings : l.editWorkspace}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/75">{l.workspaceDetails}</h3>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <AvatarBadge user={owner} size={44} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{owner?.name || '-'}</div>
                <div className="truncate text-xs text-white/45">{owner?.email || ''}</div>
                <div className="mt-1 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                  {l.ownerRole}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-sm text-white/45">{l.quickHint}</p>
            </div>

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

      {showSettings && canUpdateWorkspace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowSettings(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[28px] border border-white/12 bg-[linear-gradient(160deg,rgba(15,23,42,.98),rgba(17,24,39,.98))] p-6 shadow-[0_32px_80px_rgba(0,0,0,.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60">
                  {l.settingsSection}
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">{l.editWorkspace}</h3>
                <p className="mt-1 text-sm text-white/45">{l.settingsHint}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSettings(false)}>
                {l.cancel}
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {l.wsNamePh}
                </label>
                <input
                  className="input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={!canUpdateWorkspace}
                  placeholder={l.wsNamePh}
                  style={{
                    background: 'rgba(2,6,23,.86)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'white',
                  }}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {l.descPh}
                </label>
                <textarea
                  className="input min-h-[120px] resize-none"
                  value={editDesc}
                  onChange={(event) => setEditDesc(event.target.value)}
                  disabled={!canUpdateWorkspace}
                  placeholder={l.descPh}
                  style={{
                    background: 'rgba(2,6,23,.86)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'white',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {l.visibilityLabel}
                </label>
                <select
                  className="input"
                  value={editVisibility}
                  onChange={(event) => setEditVisibility(event.target.value)}
                  disabled={!canUpdateWorkspace}
                  style={{
                    background: 'rgba(2,6,23,.86)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'white',
                  }}
                >
                  <option value="private" style={{ background: '#0f172a', color: 'white' }}>{l.privateVisibility}</option>
                  <option value="public" style={{ background: '#0f172a', color: 'white' }}>{l.publicVisibility}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSettings(false)}>
                  {l.cancel}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await handleSaveWorkspace();
                    setShowSettings(false);
                  }}
                  disabled={isSavingWorkspace || !editName.trim()}
                >
                  {isSavingWorkspace ? l.saving : l.saveWorkspace}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMembersPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowMembersPanel(false);
          }}
        >
          <div className="w-full max-w-5xl rounded-[30px] border border-white/12 bg-[linear-gradient(160deg,rgba(15,23,42,.98),rgba(17,24,39,.98))] p-6 shadow-[0_32px_80px_rgba(0,0,0,.45)]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/60">
                  {l.memberSection}
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">{l.memberPanelTitle}</h3>
                <p className="mt-1 text-sm text-white/45">{l.memberPanelHint}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMembersPanel(false)}>
                {l.closeMembers}
              </button>
            </div>

            {canManageMembers && (
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  {l.inviteBtn}
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <input
                    className="input min-w-[220px] flex-1"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder={l.inviteEmailPh}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleInviteMember();
                    }}
                  />
                  <select className="input lg:w-[150px]" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                    <option value="member">{l.memberRole}</option>
                    <option value="staff">{l.staffRole}</option>
                  </select>
                  <button className="btn btn-primary lg:justify-center" onClick={handleInviteMember} disabled={isInviting || !inviteEmail.trim()}>
                    {isInviting ? l.saving : l.inviteBtn}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {memberRows.map((member) => {
                const memberUser = member.user;
                const memberUserId = getId(memberUser)?.toString();
                const isMe = memberUserId === user?._id?.toString();
                const displayRole = member.role === 'admin' ? 'staff' : member.role;
                const memberBoards = getMemberBoards(memberUserId);
                const isOwnerRole = member.role === 'owner';

                return (
                  <div
                    key={memberUserId}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025))] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AvatarBadge user={memberUser} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-white">
                            {memberUser?.name || '-'}
                          </div>
                          {isMe && (
                            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                              You
                            </span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-xs text-white/45">{memberUser?.email || ''}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {isOwnerRole ? (
                        <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                          {l.ownerRole}
                        </div>
                      ) : canChangeRoles ? (
                        <select
                          className="input"
                          style={{ maxWidth: 140 }}
                          value={displayRole}
                          onChange={(event) => handleUpdateRole(memberUserId, event.target.value)}
                        >
                          <option value="member">{l.memberRole}</option>
                          <option value="staff">{l.staffRole}</option>
                        </select>
                      ) : (
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70">
                          {displayRole === 'staff' ? l.staffRole : l.memberRole}
                        </div>
                      )}

                      {canManageMembers && !isOwnerRole && !isMe && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRemoveMember(memberUserId)}>
                          {l.removeMember}
                        </button>
                      )}
                    </div>

                    <div className="mt-4 rounded-[18px] border border-white/8 bg-black/10 p-3">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                        {l.boardAccess}
                      </div>
                      {memberBoards.length === 0 ? (
                        <div className="text-sm text-white/40">{l.noBoardsAssigned}</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {memberBoards.map((board) => (
                            <Link
                              key={getId(board)}
                              to={`/board/${getId(board)}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                            >
                              {board.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
