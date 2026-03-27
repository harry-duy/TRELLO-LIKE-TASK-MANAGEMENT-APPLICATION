import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════
   i18n
═══════════════════════════════════════ */
const L = {
  vi: {
    navBoards: 'Bảng', navRecent: 'Gần đây', navStarred: 'Đã đánh dấu',
    allBoardsTitle: 'Bảng điều khiển',
    allBoardsHint: 'Khi bạn mở board và làm việc trong đó, nó sẽ hiện ở đây.',
    recentTitle: 'Đã xem gần đây',
    recentHint: 'Board bạn đã mở gần đây nhất.',
    recentEmpty: 'Chưa có board nào gần đây.',
    starredTitle: 'Đã đánh dấu sao',
    starredHint: 'Board bạn đã đánh dấu sao.',
    starredEmpty: 'Chưa có board nào được đánh dấu.',
    wsTitle: 'Workspace',
    updatedAt: 'Cập nhật {date}', openBoard: 'Mở board',
    createBoard: '+ Tạo board mới', emptyBoards: 'Chưa có board nào.',
    noDesc: 'Chưa có mô tả.', membersCount: '{count} thành viên',
    invitedBadge: 'Mời', loading: 'Đang tải...', loadError: 'Không thể tải dữ liệu',
    ownedLabel: 'WORKSPACE CỦA BẠN', guestLabel: 'WORKSPACE ĐƯỢC MỜI',
    membersBtn: 'Thành viên', settingsBtn: 'Cài đặt', openWsBtn: 'Mở workspace',
    boardsLabel: 'Bảng', membersLabel: 'Thành viên', updatedLabel: 'Cập nhật',
    wsIdLabel: 'Mã workspace', copyId: 'Sao chép', copied: 'Đã sao chép!',
    settingsTitle: 'Cài đặt workspace', settingsHint: 'Xem thông tin và chỉnh sửa workspace.',
    edit: 'Chỉnh sửa', save: 'Lưu', cancel: 'Huỷ', close: 'Đóng',
    deleteWs: 'Xoá workspace', deleteConfirm: 'Xoá workspace này? Không thể hoàn tác.',
    updateOk: 'Đã cập nhật!', deleteOk: 'Đã xoá workspace', updateFail: 'Cập nhật thất bại',
    deleteFail: 'Xoá thất bại', nameRequired: 'Tên không được để trống',
    guestNote: 'Bạn là thành viên được mời.', saving: 'Đang lưu...', deleting: 'Đang xoá...',
    membersTitle: 'Quản lý thành viên', membersHint: 'Mời và quản lý quyền truy cập.',
    inviteSection: 'Mời thành viên', emailPh: 'Email người dùng',
    inviteBtn: 'Mời', inviting: '...', inviteOk: 'Đã mời!',
    inviteFail: 'Không tìm thấy email', removeFail: 'Không thể xoá',
    roleUpdated: 'Đã đổi role', roleFail: 'Không thể đổi role',
    noPermission: 'Bạn không có quyền',
    you: '(Bạn)', ownerRole: 'Owner', adminRole: 'Admin', memberRole: 'Member', staffRole: 'Staff',
    loadingMembers: 'Đang tải...', noMembers: 'Chưa có thành viên',
    allBoards: 'Tất cả', recentBoards: 'Gần đây', starredBoards: 'Đã sao',
    boardCount: '{n} bảng',
    filterAll: 'Tất cả', filterStarred: 'Đã sao', sortUpdated: 'Mới nhất', sortName: 'Tên A-Z',
  },
  en: {
    navBoards: 'Boards', navRecent: 'Recent', navStarred: 'Starred',
    allBoardsTitle: 'Dashboard',
    allBoardsHint: 'When you open boards and work in them, they will appear here.',
    recentTitle: 'Recently Viewed',
    recentHint: 'Boards you opened recently.',
    recentEmpty: 'No recent boards yet.',
    starredTitle: 'Starred Boards',
    starredHint: 'Boards you have starred.',
    starredEmpty: 'No starred boards yet.',
    wsTitle: 'Workspace',
    updatedAt: 'Updated {date}', openBoard: 'Open board',
    createBoard: '+ Create board', emptyBoards: 'No boards yet.',
    noDesc: 'No description.', membersCount: '{count} members',
    invitedBadge: 'Invited', loading: 'Loading...', loadError: 'Could not load data',
    ownedLabel: 'YOUR WORKSPACES', guestLabel: 'INVITED WORKSPACES',
    membersBtn: 'Members', settingsBtn: 'Settings', openWsBtn: 'Open workspace',
    boardsLabel: 'Boards', membersLabel: 'Members', updatedLabel: 'Updated',
    wsIdLabel: 'Workspace ID', copyId: 'Copy', copied: 'Copied!',
    settingsTitle: 'Workspace Settings', settingsHint: 'View and edit workspace info.',
    edit: 'Edit', save: 'Save', cancel: 'Cancel', close: 'Close',
    deleteWs: 'Delete workspace', deleteConfirm: 'Delete this workspace? Cannot be undone.',
    updateOk: 'Updated!', deleteOk: 'Workspace deleted', updateFail: 'Update failed',
    deleteFail: 'Delete failed', nameRequired: 'Name is required',
    guestNote: 'You are an invited member.', saving: 'Saving...', deleting: 'Deleting...',
    membersTitle: 'Manage Members', membersHint: 'Invite and manage access.',
    inviteSection: 'Invite member', emailPh: 'User email',
    inviteBtn: 'Invite', inviting: '...', inviteOk: 'Invited!',
    inviteFail: 'No user found', removeFail: 'Cannot remove',
    roleUpdated: 'Role updated', roleFail: 'Cannot update role',
    noPermission: 'No permission',
    you: '(You)', ownerRole: 'Owner', adminRole: 'Admin', memberRole: 'Member', staffRole: 'Staff',
    loadingMembers: 'Loading...', noMembers: 'No members yet',
    allBoards: 'All', recentBoards: 'Recent', starredBoards: 'Starred',
    boardCount: '{n} boards',
    filterAll: 'All', filterStarred: 'Starred', sortUpdated: 'Latest', sortName: 'Name A-Z',
  },
};

const tt = (tmpl, v = {}) => Object.entries(v).reduce((r, [k, val]) => r.replace(`{${k}}`, val), tmpl);
const getId = v => v?._id || v?.id || v;
const accentOf = name => `hsl(${((name?.charCodeAt(0)||65)*17)%360},65%,48%)`;

/* ═══════════════════════════════════════
   STAR ICON
═══════════════════════════════════════ */
function StarIcon({ filled, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      fill={filled ? '#fbbf24' : 'none'}
      stroke={filled ? '#fbbf24' : 'currentColor'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.127L8 10.77l-3.708 2.14.708-4.127L2 5.86l4.146-.603L8 1.5z"/>
    </svg>
  );
}

/* ═══════════════════════════════════════
   BOARD CARD
═══════════════════════════════════════ */
function BoardCard({ board, userId, onStarToggle, onOpen, l }) {
  const isStarred = (board.starredBy || []).some(id => (id?._id||id)?.toString() === userId?.toString());
  const [starred,  setStarred]  = useState(isStarred);
  const [starBusy, setStarBusy] = useState(false);
  const [hovered,  setHovered]  = useState(false);

  useEffect(() => { setStarred(isStarred); }, [isStarred]);

  const handleStar = async (e) => {
    e.stopPropagation();
    if (starBusy) return;
    setStarred(s => !s);
    setStarBusy(true);
    try {
      await boardService.toggleStar(board._id);
      onStarToggle?.();
    } catch { setStarred(s => !s); }
    finally { setStarBusy(false); }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 220, borderRadius: 18,
        border: `1px solid ${hovered ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.08)'}`,
        background: 'rgba(12,19,33,.85)',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,.4)' : '0 4px 12px rgba(0,0,0,.2)',
        transition: 'all .2s cubic-bezier(.34,1.4,.64,1)',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      {/* Color bar */}
      <div style={{ height: 80, background: board.background || '#0079bf', position: 'relative' }}>
        {/* Star button overlay */}
        <button
          type="button"
          onClick={handleStar}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 28, height: 28, borderRadius: 8,
            border: 'none',
            background: starred ? 'rgba(251,191,36,.18)' : 'rgba(0,0,0,.3)',
            color: starred ? '#fbbf24' : 'rgba(255,255,255,.8)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all .15s',
            opacity: hovered || starred ? 1 : 0,
          }}
          title={starred ? 'Bỏ đánh dấu' : 'Đánh dấu sao'}
        >
          <StarIcon filled={starred} size={13} />
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {board.name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', marginBottom: 12 }}>
          {tt(l.updatedAt, { date: new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString('vi-VN') })}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          style={{
            padding: '6px 14px', borderRadius: 9,
            border: '1px solid rgba(255,255,255,.14)',
            background: hovered ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.85)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background .15s',
          }}
        >
          {l.openBoard}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   ADD BOARD CARD
═══════════════════════════════════════ */
function AddBoardCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 220, height: 174, borderRadius: 18,
        border: `2px dashed ${hovered ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.12)'}`,
        background: hovered ? 'rgba(52,211,153,.05)' : 'rgba(255,255,255,.02)',
        color: hovered ? '#6ee7b7' : 'rgba(255,255,255,.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', transition: 'all .18s',
        fontSize: 13, fontWeight: 500,
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: hovered ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: 'all .18s' }}>
        +
      </div>
      Tạo board mới
    </div>
  );
}

/* ═══════════════════════════════════════
   MODAL WRAPPER
═══════════════════════════════════════ */
function Modal({ onClose, children, maxWidth = 520 }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth, borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(160deg,rgba(13,21,38,.99),rgba(8,28,24,.99))', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 40px 80px rgba(0,0,0,.7)', animation: 'modal-pop .22s cubic-bezier(.34,1.5,.64,1)', maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto' }}
      >
        <style>{`@keyframes modal-pop{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, hint, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>{title}</h3>
        {hint && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', margin: '3px 0 0' }}>{hint}</p>}
      </div>
      <button type="button" onClick={onClose}
        style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}>
        ✕
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   SETTINGS MODAL
═══════════════════════════════════════ */
function SettingsModal({ workspace, boardCount, isGuest, l, onClose, onUpdated, onDeleted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name,  setName]  = useState(workspace?.name || '');
  const [desc,  setDesc]  = useState(workspace?.description || '');
  const [vis,   setVis]   = useState(workspace?.visibility || 'private');
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!workspace) return null;
  const wsId = getId(workspace);

  const handleSave = async () => {
    if (!name.trim()) { toast.error(l.nameRequired); return; }
    setSaving(true);
    try {
      const res = await workspaceService.updateWorkspace(wsId, { name: name.trim(), description: desc.trim(), visibility: vis });
      onUpdated?.(wsId, res?.data || res);
      toast.success(l.updateOk);
      setIsEditing(false);
    } catch (e) { toast.error(e?.message || l.updateFail); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(l.deleteConfirm)) return;
    setDeleting(true);
    try {
      await workspaceService.deleteWorkspace(wsId);
      onDeleted?.(wsId);
      toast.success(l.deleteOk);
      onClose();
    } catch (e) { toast.error(e?.message || l.deleteFail); }
    finally { setDeleting(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={l.settingsTitle} hint={l.settingsHint} onClose={onClose} />
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Workspace info */}
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', padding: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: accentOf(workspace.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white' }}>
              {(workspace.name || 'W')[0].toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <>
                  <input value={name} onChange={e => setName(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(52,211,153,.4)', background: 'rgba(255,255,255,.07)', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
                  <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder={l.noDesc}
                    style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: 'white', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    {['private', 'public'].map(v => (
                      <button key={v} type="button" onClick={() => setVis(v)}
                        style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', borderColor: vis === v ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.1)', background: vis === v ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.04)', color: vis === v ? '#34d399' : 'rgba(255,255,255,.5)' }}>{v}</button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h4 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>{workspace.name}</h4>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', margin: '5px 0 0' }}>{workspace.description || l.noDesc}</p>
                  <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999, fontSize: 10, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', textTransform: 'capitalize' }}>{workspace.visibility}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: l.boardsLabel,  val: boardCount },
            { label: l.membersLabel, val: workspace.members?.length || 0 },
            { label: l.updatedLabel, val: new Date(workspace.updatedAt || workspace.createdAt || Date.now()).toLocaleDateString('vi-VN') },
          ].map(c => (
            <div key={c.label} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)', padding: '12px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(255,255,255,.35)', margin: 0 }}>{c.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '4px 0 0' }}>{c.val}</p>
            </div>
          ))}
        </div>

        {/* ID */}
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{l.wsIdLabel}</span>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(String(wsId)); toast.success(l.copied); } catch {} }}
            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.8)', fontSize: 11, cursor: 'pointer' }}>{l.copyId}</button>
        </div>

        {isGuest && (
          <div style={{ borderRadius: 12, border: '1px solid rgba(251,191,36,.15)', background: 'rgba(251,191,36,.06)', padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
            {l.guestNote}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isGuest && (isEditing ? (
              <>
                <button type="button" onClick={handleSave} disabled={saving}
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? l.saving : l.save}
                </button>
                <button type="button" onClick={() => { setIsEditing(false); setName(workspace.name || ''); setDesc(workspace.description || ''); setVis(workspace.visibility || 'private'); }}
                  style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'none', color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {l.cancel}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setIsEditing(true)}
                  style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {l.edit}
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,.18)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {deleting ? l.deleting : l.deleteWs}
                </button>
              </>
            ))}
          </div>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'none', color: 'rgba(255,255,255,.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {l.close}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   MEMBERS MODAL
═══════════════════════════════════════ */
function MembersModal({ workspace, isGuest, l, onClose }) {
  const { user } = useAuthStore();
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [email,    setEmail]    = useState('');
  const [role,     setRole]     = useState('member');
  const [inviting, setInviting] = useState(false);
  const [wsData,   setWsData]   = useState(null);
  if (!workspace) return null;
  const wsId = getId(workspace);

  const load = async () => {
    setLoading(true);
    try {
      const res = await workspaceService.getWorkspace(wsId);
      const ws  = res?.data || res;
      setWsData(ws);
      setMembers([
        { user: ws.owner, role: 'owner' },
        ...(ws.members || []).filter(m => (m.user?._id || m.user)?.toString() !== (ws.owner?._id || ws.owner)?.toString()),
      ]);
    } catch { setMembers([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [wsId]);

  const ownerId = (wsData?.owner?._id || wsData?.owner)?.toString();
  const isOwner = ownerId === user?._id?.toString() || user?.role === 'admin';
  const isAdmin = isOwner || (wsData?.members || []).some(m => (m.user?._id || m.user)?.toString() === user?._id?.toString() && m.role === 'admin') || user?.role === 'admin';
  const roleColor = { owner: '#fbbf24', admin: '#60a5fa', staff: '#a78bfa', member: 'rgba(255,255,255,.45)' };
  const roleLabel = { owner: l.ownerRole, admin: l.adminRole, staff: l.staffRole, member: l.memberRole };

  const handleInvite = async () => {
    if (!email.trim()) return;
    if (!isAdmin) { toast.error(l.noPermission); return; }
    setInviting(true);
    try { await workspaceService.addMember(wsId, email.trim(), role); toast.success(l.inviteOk); setEmail(''); load(); }
    catch (e) { toast.error(e?.message || l.inviteFail); }
    setInviting(false);
  };

  return (
    <Modal onClose={onClose} maxWidth={460}>
      <ModalHeader title={l.membersTitle} hint={l.membersHint} onClose={onClose} />
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isAdmin && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.55)', marginBottom: 10 }}>{l.inviteSection}</p>
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInvite()} placeholder={l.emailPh}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.1)'} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={role} onChange={e => setRole(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(15,20,36,.9)', color: 'white', fontSize: 13, outline: 'none' }}>
                <option value="member">{l.memberRole}</option>
                <option value="admin">{l.adminRole}</option>
                <option value="staff">{l.staffRole}</option>
              </select>
              <button type="button" disabled={inviting || !email.trim()} onClick={handleInvite}
                style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: email.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,.1)', color: 'white', fontSize: 13, fontWeight: 700, cursor: email.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                {inviting ? l.inviting : l.inviteBtn}
              </button>
            </div>
          </div>
        )}

        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
          {loading ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>{l.loadingMembers}</p>
          ) : members.length === 0 ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>{l.noMembers}</p>
          ) : members.map((m, i) => {
            const u = m.user, uid = u?._id || u;
            const isYou = uid?.toString() === user?._id?.toString();
            const canKick = isAdmin && m.role !== 'owner' && !isYou;
            const canRole = isOwner && m.role !== 'owner';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: accentOf(u?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                  {(u?.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u?.name || String(uid)}
                    {isYou && <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, marginLeft: 4 }}>{l.you}</span>}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: '2px 0 0' }}>{u?.email || ''}</p>
                </div>
                {canRole ? (
                  <select value={m.role} onChange={async e => { try { await workspaceService.updateMemberRole(wsId, String(uid), e.target.value); toast.success(l.roleUpdated); load(); } catch (err) { toast.error(err?.message || l.roleFail); } }}
                    style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(15,20,36,.9)', color: roleColor[m.role] || 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    <option value="member">{l.memberRole}</option>
                    <option value="admin">{l.adminRole}</option>
                    <option value="staff">{l.staffRole}</option>
                  </select>
                ) : (
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, color: roleColor[m.role] || 'white', background: `${roleColor[m.role] || '#fff'}22`, whiteSpace: 'nowrap' }}>
                    {roleLabel[m.role] || m.role}
                  </span>
                )}
                {canKick && (
                  <button type="button" onClick={async () => { try { await workspaceService.removeMember(wsId, String(uid)); load(); } catch (e) { toast.error(e?.message || l.removeFail); } }}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,.18)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,.18)'}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   CREATE BOARD MODAL
═══════════════════════════════════════ */
function CreateBoardModal({ workspaces, defaultWsId, l, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [wsId, setWsId] = useState(defaultWsId || workspaces[0]?._id || '');
  const [bg,   setBg]   = useState('#0079bf');
  const [loading, setLoading] = useState(false);
  const colors = ['#0079bf', '#70b500', '#ff7a5a', '#ff9f1a', '#eb5a46', '#c377e0', '#00c2e0', '#51e898', '#ff78cb', '#344563'];

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên board'); return; }
    if (!wsId) { toast.error('Chọn workspace'); return; }
    setLoading(true);
    try {
      const res = await boardService.createBoard({ name: name.trim(), workspaceId: wsId, background: bg });
      toast.success('Đã tạo board!');
      onCreated?.();
      onClose();
    } catch (e) { toast.error(e?.message || 'Tạo thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <Modal onClose={onClose} maxWidth={380}>
      <ModalHeader title="Tạo board mới" onClose={onClose} />
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Preview */}
        <div style={{ height: 80, borderRadius: 12, background: bg, transition: 'background .2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'white', opacity: name ? 1 : 0.45 }}>{name || 'Tên board'}</span>
        </div>

        {/* Color picker */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {colors.map(c => (
            <button key={c} type="button" onClick={() => setBg(c)}
              style={{ width: 30, height: 30, borderRadius: 8, background: c, border: bg === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', transform: bg === c ? 'scale(1.1)' : 'scale(1)', transition: 'all .15s' }} />
          ))}
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(167,243,208,.55)', display: 'block', marginBottom: 6 }}>
            Tên board <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="VD: Sprint tuần 3..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(52,211,153,.35)', background: 'rgba(255,255,255,.07)', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Workspace picker */}
        {workspaces.length > 1 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(167,243,208,.55)', display: 'block', marginBottom: 6 }}>Workspace</label>
            <select value={wsId} onChange={e => setWsId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(15,20,36,.9)', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
              {workspaces.map(ws => <option key={ws._id} value={ws._id}>{ws.name}</option>)}
            </select>
          </div>
        )}

        <button type="button" disabled={loading || !name.trim()} onClick={handleCreate}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: name.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,.1)', color: 'white', fontWeight: 700, fontSize: 14, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Đang tạo...' : 'Tạo board'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   BOARD GRID with section header
═══════════════════════════════════════ */
function BoardGrid({ title, hint, boards, userId, workspaceId, l, onStarToggle, onReload, onOpenCreate }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('updated'); // 'updated' | 'name'
  const [filterStarred, setFilterStarred] = useState(false);

  const displayed = useMemo(() => {
    let list = [...boards];
    if (filterStarred) list = list.filter(b => (b.starredBy || []).some(id => (id?._id || id)?.toString() === userId?.toString()));
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    return list;
  }, [boards, sortBy, filterStarred, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-.02em' }}>{title}</h2>
          {hint && <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{hint}</p>}
        </div>

        {/* Filters + sort */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filter starred */}
          <button type="button" onClick={() => setFilterStarred(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: `1px solid ${filterStarred ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.1)'}`, background: filterStarred ? 'rgba(251,191,36,.1)' : 'rgba(255,255,255,.05)', color: filterStarred ? '#fbbf24' : 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
            <StarIcon filled={filterStarred} size={12} />
            {l.filterStarred}
          </button>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 9, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(15,20,36,.9)', color: 'rgba(255,255,255,.7)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option value="updated">{l.sortUpdated}</option>
            <option value="name">{l.sortName}</option>
          </select>
        </div>
      </div>

      {/* Board cards */}
      {displayed.length === 0 && !workspaceId ? (
        <div style={{ borderRadius: 18, border: '2px dashed rgba(255,255,255,.1)', background: 'rgba(255,255,255,.02)', padding: '48px 20px', textAlign: 'center', color: 'rgba(255,255,255,.38)', fontSize: 14 }}>
          {filterStarred ? l.starredEmpty : l.recentEmpty}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {displayed.map(b => (
            <BoardCard
              key={b._id}
              board={b}
              userId={userId}
              l={l}
              onStarToggle={onStarToggle}
              onOpen={() => navigate(`/board/${b._id}`)}
            />
          ))}
          {/* Add board tile — chỉ hiện khi có workspaceId */}
          {workspaceId && (
            <AddBoardCard onClick={() => onOpenCreate?.(workspaceId)} />
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   WORKSPACE HEADER BAR
═══════════════════════════════════════ */
function WorkspaceHeaderBar({ ws, boardCount, isGuest, l, onOpenSettings, onOpenMembers, navigate }) {
  const wsId   = getId(ws);
  const accent = accentOf(ws.name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {(ws.name || 'W')[0].toUpperCase()}
        </span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{ws.name}</span>
            {isGuest && <span style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(251,191,36,.12)', color: '#fbbf24', fontSize: 10, fontWeight: 700 }}>{l.invitedBadge}</span>}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.38)' }}>
            {tt(l.boardCount, { n: boardCount })} · {tt(l.membersCount, { count: ws.members?.length || 0 })}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        {[
          { label: l.membersBtn, action: () => onOpenMembers(ws), accent: false },
          { label: l.settingsBtn, action: () => onOpenSettings(ws), accent: false },
          { label: l.openWsBtn, action: () => navigate(`/workspace/${wsId}`), accent: true },
        ].map(btn => (
          <button key={btn.label} type="button" onClick={btn.action}
            style={{ padding: '6px 13px', borderRadius: 9, border: btn.accent ? '1px solid rgba(52,211,153,.3)' : '1px solid rgba(255,255,255,.1)', background: btn.accent ? 'rgba(52,211,153,.08)' : 'rgba(255,255,255,.05)', color: btn.accent ? '#6ee7b7' : 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = btn.accent ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.1)'}
            onMouseLeave={e => e.currentTarget.style.background = btn.accent ? 'rgba(52,211,153,.08)' : 'rgba(255,255,255,.05)'}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function DashboardPage() {
  const { user }  = useAuthStore();
  const lang      = useUiStore(s => s.language) || 'vi';
  const l         = L[lang] || L.vi;
  const navigate  = useNavigate();
  const userId    = user?._id?.toString();

  // 'boards' | 'recent' | 'starred' | <workspace-id>
  const [activeNav, setActiveNav] = useState('boards');

  const [workspaces, setWorkspaces] = useState([]);
  const [boards,     setBoards]     = useState([]);
  const [status,     setStatus]     = useState('loading');

  // Modals
  const [settingsWs,     setSettingsWs]     = useState(null);
  const [membersWs,      setMembersWs]      = useState(null);
  const [createWsId,     setCreateWsId]     = useState(null); // workspace id for create board modal
  const [showCreateBoard, setShowCreateBoard] = useState(false);

  const loadData = () => {
    setStatus('loading');
    Promise.all([workspaceService.getMyWorkspaces(), boardService.getBoards({ isClosed: false })])
      .then(([wsData, boardData]) => {
        setWorkspaces(Array.isArray(wsData) ? wsData : wsData?.data || []);
        setBoards(Array.isArray(boardData) ? boardData : boardData?.data || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(() => { loadData(); }, []);

  const ownedWorkspaces = useMemo(() => workspaces.filter(ws => getId(ws.owner)?.toString() === userId), [workspaces, userId]);
  const guestWorkspaces = useMemo(() => workspaces.filter(ws => getId(ws.owner)?.toString() !== userId), [workspaces, userId]);
  const guestIds        = useMemo(() => new Set(guestWorkspaces.map(ws => getId(ws))), [guestWorkspaces]);

  const boardsByWs = useMemo(() => {
    const map = new Map();
    boards.forEach(b => {
      const wsId = getId(b.workspace)?.toString();
      if (!wsId) return;
      if (!map.has(wsId)) map.set(wsId, []);
      map.get(wsId).push(b);
    });
    return map;
  }, [boards]);

  const recentBoards  = useMemo(() => [...boards].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)).slice(0, 12), [boards]);
  const starredBoards = useMemo(() => boards.filter(b => (b.starredBy || []).some(id => (id?._id || id)?.toString() === userId?.toString())), [boards, userId]);
  const activeWorkspace = useMemo(() => workspaces.find(ws => getId(ws) === activeNav) || null, [workspaces, activeNav]);

  const handleWsUpdated = (wsId, next) => {
    setWorkspaces(prev => prev.map(ws => getId(ws) === wsId ? { ...ws, ...next } : ws));
    setSettingsWs(cur => cur && getId(cur) === wsId ? { ...cur, ...next } : cur);
  };
  const handleWsDeleted = (wsId) => {
    setWorkspaces(prev => prev.filter(ws => getId(ws) !== wsId));
    setBoards(prev => prev.filter(b => getId(b.workspace) !== wsId));
    setSettingsWs(null);
    if (activeNav === wsId) setActiveNav('boards');
  };

  const handleOpenCreate = (wsId) => { setCreateWsId(wsId); setShowCreateBoard(true); };

  /* ── SIDEBAR ── */
  const Sidebar = () => (
    <aside style={{ width: 220, flexShrink: 0, borderRadius: 20, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.025)', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'flex-start', position: 'sticky', top: 80 }}>
      {/* Nav tabs */}
      {[
        { key: 'boards',  label: l.navBoards,
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg> },
        { key: 'recent',  label: l.navRecent,  badge: recentBoards.length,
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5V7l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { key: 'starred', label: l.navStarred, badge: starredBoards.length,
          icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.127L8 10.77l-3.708 2.14.708-4.127L2 5.86l4.146-.603L8 1.5z"/></svg> },
      ].map(item => {
        const active = activeNav === item.key;
        return (
          <button key={item.key} type="button" onClick={() => setActiveNav(item.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: active ? 'rgba(255,255,255,.1)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all .15s' }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: active ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.1)', color: active ? 'white' : 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '6px 4px 8px' }} />

      {/* Workspaces */}
      {[
        { label: l.ownedLabel, list: ownedWorkspaces },
        { label: l.guestLabel, list: guestWorkspaces },
      ].map(group => group.list.length === 0 ? null : (
        <div key={group.label} style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'rgba(255,255,255,.28)', padding: '4px 12px', margin: 0 }}>
            {group.label}
          </p>
          {group.list.map(ws => {
            const wsId   = getId(ws);
            const active = activeNav === wsId;
            const accent = accentOf(ws.name);
            const bCount = boardsByWs.get(wsId)?.length || 0;
            return (
              <button key={wsId} type="button" onClick={() => setActiveNav(wsId)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? 'rgba(255,255,255,.1)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all .15s', textAlign: 'left' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                  {(ws.name || 'W')[0].toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                {bCount > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', fontWeight: 600, flexShrink: 0 }}>{bCount}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );

  /* ── MAIN CONTENT ── */
  const renderMain = () => {
    if (status === 'loading') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.45)', padding: '60px 0' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(52,211,153,.25)', borderTopColor: '#34d399', animation: 'db-spin .8s linear infinite' }} />
        <style>{`@keyframes db-spin{to{transform:rotate(360deg)}}`}</style>
        {l.loading}
      </div>
    );
    if (status === 'error') return <p style={{ color: '#f87171', fontSize: 14 }}>{l.loadError}</p>;

    /* VIEW: BOARDS — hiển thị theo từng workspace */
    if (activeNav === 'boards') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {/* Header + overall grid */}
        <BoardGrid
          title={l.allBoardsTitle}
          hint={l.allBoardsHint}
          boards={recentBoards}
          userId={userId}
          l={l}
          onStarToggle={loadData}
          onOpenCreate={() => setShowCreateBoard(true)}
        />

        {/* Each workspace section */}
        {workspaces.map(ws => {
          const wsId    = getId(ws);
          const wsBoards = boardsByWs.get(wsId) || [];
          return (
            <div key={wsId} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <WorkspaceHeaderBar
                ws={ws} boardCount={wsBoards.length} isGuest={guestIds.has(wsId)} l={l}
                onOpenSettings={setSettingsWs} onOpenMembers={setMembersWs} navigate={navigate}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                {wsBoards.map(b => (
                  <BoardCard key={b._id} board={b} userId={userId} l={l} onStarToggle={loadData} onOpen={() => navigate(`/board/${b._id}`)} />
                ))}
                <AddBoardCard onClick={() => handleOpenCreate(wsId)} />
              </div>
            </div>
          );
        })}
      </div>
    );

    /* VIEW: RECENT */
    if (activeNav === 'recent') return (
      <BoardGrid
        title={l.recentTitle}
        hint={l.recentHint}
        boards={recentBoards}
        userId={userId}
        l={l}
        onStarToggle={loadData}
      />
    );

    /* VIEW: STARRED */
    if (activeNav === 'starred') return (
      <BoardGrid
        title={l.starredTitle}
        hint={l.starredHint}
        boards={starredBoards}
        userId={userId}
        l={l}
        onStarToggle={loadData}
      />
    );

    /* VIEW: WORKSPACE */
    if (activeWorkspace) {
      const ws      = activeWorkspace;
      const wsId    = getId(ws);
      const wsBoards = boardsByWs.get(wsId) || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <WorkspaceHeaderBar
            ws={ws} boardCount={wsBoards.length} isGuest={guestIds.has(wsId)} l={l}
            onOpenSettings={setSettingsWs} onOpenMembers={setMembersWs} navigate={navigate}
          />
          <BoardGrid
            title={ws.name}
            hint={ws.description || l.noDesc}
            boards={wsBoards}
            userId={userId}
            workspaceId={wsId}
            l={l}
            onStarToggle={loadData}
            onOpenCreate={handleOpenCreate}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderMain()}
      </div>

      {/* Modals */}
      {settingsWs && (
        <SettingsModal
          workspace={settingsWs}
          boardCount={(boardsByWs.get(getId(settingsWs)) || []).length}
          isGuest={guestIds.has(getId(settingsWs))}
          l={l}
          onClose={() => setSettingsWs(null)}
          onUpdated={handleWsUpdated}
          onDeleted={handleWsDeleted}
        />
      )}
      {membersWs && (
        <MembersModal workspace={membersWs} isGuest={guestIds.has(getId(membersWs))} l={l} onClose={() => setMembersWs(null)} />
      )}
      {showCreateBoard && (
        <CreateBoardModal
          workspaces={workspaces}
          defaultWsId={createWsId || workspaces[0]?._id}
          l={l}
          onClose={() => { setShowCreateBoard(false); setCreateWsId(null); }}
          onCreated={loadData}
        />
      )}
    </div>
  );
}