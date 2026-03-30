// frontend/src/components/board/BoardMembersPanel.jsx
// ✅ Sửa: gọi đúng workspace route thay vì admin route
// ✅ Thêm: đổi role member, hỗ trợ staff role

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@store/authStore';
import apiClient from '@config/api';
import toast from 'react-hot-toast';

// ─── i18n ─────────────────────────────────────────────────────────────────────
const L = {
  vi: {
    title:       'Thành viên board',
    invite:      'Mời thành viên',
    invitePh:    'Nhập email người dùng',
    inviteBtn:   'Mời',
    suggestTitle:'Thêm từ workspace',
    suggestHint: 'Chọn nhanh thành viên đã có trong workspace',
    addToBoard:  'Thêm vào board',
    noSuggestions:'Không còn thành viên workspace nào để thêm',
    roleLabel:   'Role',
    owner:       'Chủ sở hữu',
    member:      'Thành viên',
    staff:       'Staff',
    remove:      'Xoá',
    shareLink:   'Sao chép link board',
    copied:      'Đã sao chép!',
    loading:     'Đang tải...',
    empty:       'Chưa có thành viên',
    you:         '(Bạn)',
    close:       'Đóng',
    inviteOk:    'Đã thêm thành viên!',
    inviteFail:  'Không tìm thấy email này',
    removeFail:  'Không thể xoá thành viên',
    roleUpdated: 'Đã cập nhật role',
    roleFail:    'Không thể đổi role',
    noPermission:'Bạn không có quyền thực hiện thao tác này',
  },
  en: {
    title:       'Board members',
    invite:      'Invite member',
    invitePh:    'Enter user email',
    inviteBtn:   'Invite',
    suggestTitle:'Add from workspace',
    suggestHint: 'Quick-pick people already in this workspace',
    addToBoard:  'Add to board',
    noSuggestions:'No more workspace members to add',
    roleLabel:   'Role',
    owner:       'Owner',
    member:      'Member',
    staff:       'Staff',
    remove:      'Remove',
    shareLink:   'Copy board link',
    copied:      'Copied!',
    loading:     'Loading...',
    empty:       'No members yet',
    you:         '(You)',
    close:       'Close',
    inviteOk:    'Member added!',
    inviteFail:  'No user found with that email',
    removeFail:  'Could not remove member',
    roleUpdated: 'Role updated',
    roleFail:    'Could not update role',
    noPermission:'You do not have permission to do this',
  },
};

// ─── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ name, avatar, size = 36 }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return avatar && !err ? (
    <img
      src={avatar}
      alt={name}
      onError={() => setErr(true)}
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0,
        border: '2px solid rgba(52,211,153,.3)',
      }}
    />
  ) : (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `hsl(${(name || '').charCodeAt(0) * 17 % 360},60%,42%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.33, fontWeight: 700, color: 'white', flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BoardMembersPanel({ boardId, workspaceId, lang = 'vi', onClose }) {
  const l = L[lang] || L.vi;
  const { user } = useAuthStore();
  const [workspace, setWorkspace]     = useState(null);
  const [members, setMembers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('member');
  const [inviting, setInviting]       = useState(false);
  const [quickAddingId, setQuickAddingId] = useState(null);
  const [copied, setCopied]           = useState(false);
  const ref = useRef(null);

  // Kiểm tra user hiện tại có phải owner hoặc workspace admin không
  const isOwner = workspace?.owner?._id?.toString() === user?._id?.toString()
    || workspace?.owner?.toString() === user?._id?.toString();

  const isWorkspaceAdmin = isOwner || (workspace?.members || []).some(
    (m) => (m.user?._id || m.user)?.toString() === user?._id?.toString()
      && m.role === 'admin'
  );

  const boardMemberIds = new Set(
    members.map((m) => (m.user?._id || m.user)?.toString()).filter(Boolean)
  );

  const workspaceCandidates = [
    workspace?.owner ? { user: workspace.owner, role: 'admin' } : null,
    ...((workspace?.members || []).map((m) => ({ user: m.user, role: m.role }))),
  ]
    .filter(Boolean)
    .filter((m, index, list) => {
      const memberId = (m.user?._id || m.user)?.toString();
      if (!memberId || boardMemberIds.has(memberId)) return false;
      return index === list.findIndex((item) => ((item.user?._id || item.user)?.toString() === memberId));
    });

  // Tải danh sách members
  const loadMembers = async () => {
    setLoading(true);
    try {
      const [wsRes, boardMembersRes] = await Promise.all([
        apiClient.get(`/workspaces/${workspaceId}`),
        apiClient.get(`/boards/${boardId}/members`),
      ]);
      const ws  = wsRes?.data || wsRes;
      const boardMembers = boardMembersRes?.data || boardMembersRes;
      setWorkspace(ws);

      const ownerId = (ws.owner?._id || ws.owner)?.toString();
      const normalizedBoardMembers = Array.isArray(boardMembers)
        ? boardMembers.filter((m) => (m.user?._id || m.user)?.toString() !== ownerId)
        : [];

      setMembers([
        { user: ws.owner, role: 'owner' },
        ...normalizedBoardMembers,
      ]);
    } catch {
      setMembers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (workspaceId) loadMembers();
  }, [workspaceId]);

  // Mời member — gửi email (backend tìm user)
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    if (!isWorkspaceAdmin) {
      toast.error(l.noPermission);
      return;
    }

    setInviting(true);
    try {
      await apiClient.post(`/boards/${boardId}/members`, {
        email: inviteEmail.trim().toLowerCase(),
        role:  inviteRole,
      });
      toast.success(l.inviteOk);
      setInviteEmail('');
      setInviteRole('member');
      loadMembers();
    } catch (err) {
      toast.error(err?.message || l.inviteFail);
    }
    setInviting(false);
  };

  const handleQuickAdd = async (targetUserId) => {
    if (!targetUserId) return;

    if (!isWorkspaceAdmin) {
      toast.error(l.noPermission);
      return;
    }

    setQuickAddingId(targetUserId);
    try {
      await apiClient.post(`/boards/${boardId}/members`, {
        userId: targetUserId,
        role: inviteRole,
      });
      toast.success(l.inviteOk);
      loadMembers();
    } catch (err) {
      toast.error(err?.message || l.inviteFail);
    }
    setQuickAddingId(null);
  };

  // Xoá member
  const handleRemove = async (userId) => {
    if (!isWorkspaceAdmin) {
      toast.error(l.noPermission);
      return;
    }

    try {
      await apiClient.delete(`/boards/${boardId}/members/${userId}`);
      toast.success(l.member + ' removed');
      loadMembers();
    } catch (err) {
      toast.error(err?.message || l.removeFail);
    }
  };

  // Đổi role
  const handleRoleChange = async (userId, newRole) => {
    if (!isOwner && user?.role !== 'admin') {
      toast.error(l.noPermission);
      return;
    }

    try {
      // ✅ Gọi đúng workspace route
      await apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/role`, {
        role: newRole,
      });
      toast.success(l.roleUpdated);
      loadMembers();
    } catch (err) {
      toast.error(err?.message || l.roleFail);
    }
  };

  // Copy link board
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Role label + màu
  const getRoleInfo = (role) => {
    const map = {
      owner:  { label: l.owner,  color: '#fbbf24' },
      admin:  { label: l.staff,  color: '#a78bfa' },
      staff:  { label: l.staff,  color: '#a78bfa' },
      member: { label: l.member, color: 'rgba(255,255,255,.4)' },
    };
    return map[role] || map.member;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'flex-end', padding: '70px 20px 0',
        background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)',
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        style={{
          width: 340,
          background: 'linear-gradient(160deg,rgba(13,20,36,.99),rgba(8,28,25,.99))',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
          overflow: 'hidden',
          animation: 'bm-in .2s ease-out',
        }}
      >
        <style>{`@keyframes bm-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
            {l.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,.1)',
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Invite Form (chỉ hiện với workspace admin/owner) ───────────── */}
        {isWorkspaceAdmin && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <p style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 8,
            }}>
              {l.invite}
            </p>

            {/* Email input */}
            <input
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,.1)',
                background: 'rgba(255,255,255,.07)',
                color: 'white', fontSize: 12, outline: 'none',
                marginBottom: 8,
              }}
              placeholder={l.invitePh}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(52,211,153,.5)')}
              onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
            />

            {/* Role select + Invite button */}
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,.1)',
                  background: 'rgba(15,20,36,.9)',
                  color: 'white', fontSize: 12, outline: 'none',
                }}
              >
                <option value="member">{l.member}</option>
                <option value="staff">{l.staff}</option>
              </select>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: inviteEmail.trim()
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'rgba(255,255,255,.1)',
                  color: 'white', cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}
              >
                {inviting ? '...' : l.inviteBtn}
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.08em', color: 'rgba(255,255,255,.42)', margin: '0 0 4px',
              }}>
                {l.suggestTitle}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', margin: '0 0 8px' }}>
                {l.suggestHint}
              </p>

              {workspaceCandidates.length === 0 ? (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px dashed rgba(255,255,255,.1)',
                  background: 'rgba(255,255,255,.03)',
                  color: 'rgba(255,255,255,.38)',
                  fontSize: 12,
                }}>
                  {l.noSuggestions}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 2 }}>
                  {workspaceCandidates.map((candidate) => {
                    const candidateUser = candidate.user;
                    const candidateId = (candidateUser?._id || candidateUser)?.toString();
                    const roleInfo = getRoleInfo(candidate.role);

                    return (
                      <div
                        key={candidateId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,.08)',
                          background: 'rgba(255,255,255,.04)',
                        }}
                      >
                        <Avatar name={candidateUser?.name} avatar={candidateUser?.avatar} size={32} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: 'white', fontSize: 12, fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                          }}>
                            {candidateUser?.name || candidateId}
                          </p>
                          <p style={{
                            color: 'rgba(255,255,255,.4)', fontSize: 11,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0',
                          }}>
                            {candidateUser?.email || ''}
                          </p>
                        </div>

                        <span style={{
                          fontSize: 10, fontWeight: 700, color: roleInfo.color,
                          background: `${roleInfo.color}20`, borderRadius: 999,
                          padding: '2px 8px', whiteSpace: 'nowrap',
                        }}>
                          {roleInfo.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuickAdd(candidateId)}
                          disabled={quickAddingId === candidateId}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg,#10b981,#059669)',
                            color: 'white',
                            cursor: quickAddingId === candidateId ? 'wait' : 'pointer',
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            opacity: quickAddingId === candidateId ? 0.7 : 1,
                          }}
                        >
                          {quickAddingId === candidateId ? '...' : l.addToBoard}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Member List ─────────────────────────────────────────────────── */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,.4)', fontSize: 13 }}>
              {l.loading}
            </p>
          ) : members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
              {l.empty}
            </p>
          ) : (
            members.map((m, i) => {
              const u       = m.user;
              const uid     = u?._id || u;
              const isYou   = uid?.toString() === user?._id?.toString();
              const { label: roleLabel, color: roleColor } = getRoleInfo(m.role);
              const canKick = isWorkspaceAdmin && m.role !== 'owner' && !isYou;
              const canChangeRole = isOwner && m.role !== 'owner';

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: 10, padding: '8px 16px',
                  }}
                >
                  <Avatar name={u?.name} avatar={u?.avatar} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: 'white', fontSize: 13, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', margin: 0,
                    }}>
                      {u?.name || String(uid)}
                      {isYou && (
                        <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, marginLeft: 4 }}>
                          {l.you}
                        </span>
                      )}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: 0 }}>
                      {u?.email || ''}
                    </p>
                  </div>

                  {/* Role — dropdown nếu có quyền đổi, badge nếu không */}
                  {canChangeRole ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(String(uid), e.target.value)}
                      style={{
                        padding: '3px 6px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,.15)',
                        background: 'rgba(15,20,36,.9)',
                        color: roleColor, fontSize: 11,
                        fontWeight: 700, cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="member">{l.member}</option>
                      <option value="staff">{l.staff}</option>
                    </select>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: roleColor,
                      background: `${roleColor}20`, borderRadius: 999,
                      padding: '2px 8px', whiteSpace: 'nowrap',
                    }}>
                      {roleLabel}
                    </span>
                  )}

                  {/* Kick button */}
                  {canKick && (
                    <button
                      type="button"
                      title={l.remove}
                      onClick={() => handleRemove(String(uid))}
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

        {/* ── Copy Link ───────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <button
            type="button"
            onClick={copyLink}
            style={{
              width: '100%', padding: '9px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,.15)',
              background: copied ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.06)',
              color: copied ? '#34d399' : 'rgba(255,255,255,.7)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'all .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>{copied ? '✓' : '🔗'}</span>
            {copied ? l.copied : l.shareLink}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
