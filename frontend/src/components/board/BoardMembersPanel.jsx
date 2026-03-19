// frontend/src/components/board/BoardMembersPanel.jsx
// ✅ Xem thành viên board, invite, share link

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@store/authStore';
import apiClient from '@config/api';
import toast from 'react-hot-toast';

const L = {
  vi: {
    title:       'Thành viên board',
    invite:      'Mời thành viên',
    invitePh:    'Email hoặc tên người dùng',
    inviteBtn:   'Mời',
    inviting:    'Đang mời...',
    owner:       'Chủ sở hữu',
    admin:       'Admin',
    member:      'Thành viên',
    remove:      'Xoá',
    shareLink:   'Sao chép link board',
    copied:      'Đã sao chép!',
    loading:     'Đang tải...',
    empty:       'Chưa có thành viên',
    you:         '(Bạn)',
    close:       'Đóng',
    inviteOk:    'Đã gửi lời mời!',
    inviteFail:  'Không thể mời, kiểm tra lại email/tên',
    removeFail:  'Không thể xoá thành viên',
  },
  en: {
    title:       'Board members',
    invite:      'Invite member',
    invitePh:    'Email or username',
    inviteBtn:   'Invite',
    inviting:    'Inviting...',
    owner:       'Owner',
    admin:       'Admin',
    member:      'Member',
    remove:      'Remove',
    shareLink:   'Copy board link',
    copied:      'Copied!',
    loading:     'Loading...',
    empty:       'No members yet',
    you:         '(You)',
    close:       'Close',
    inviteOk:    'Invitation sent!',
    inviteFail:  'Could not invite, check the email/username',
    removeFail:  'Could not remove member',
  },
};

function Avatar({ name, avatar, size = 36 }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return avatar && !err ? (
    <img src={avatar} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(52,211,153,.3)' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${(name||'').charCodeAt(0)*17%360},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function BoardMembersPanel({ boardId, workspaceId, lang = 'vi', onClose }) {
  const l = L[lang] || L.vi;
  const { user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteVal, setInviteVal] = useState('');
  const [inviting, setInviting]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const ref = useRef(null);

  // Load workspace members (board shares workspace members)
  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/workspaces/${workspaceId}`);
      const ws  = res?.data || res;
      setMembers([
        { user: ws.owner, role: 'owner' },
        ...(ws.members || []).filter(m => (m.user?._id || m.user) !== (ws.owner?._id || ws.owner)),
      ]);
    } catch { setMembers([]); }
    setLoading(false);
  };

  useEffect(() => { if (workspaceId) load(); }, [workspaceId]);

  const invite = async () => {
    if (!inviteVal.trim()) return;
    setInviting(true);
    try {
      // Tìm user theo email
      const usersRes = await apiClient.get(`/users?search=${encodeURIComponent(inviteVal.trim())}&limit=5`);
      const users = usersRes?.data || usersRes || [];
      const found = Array.isArray(users) ? users[0] : null;
      if (!found?._id) { toast.error(l.inviteFail); setInviting(false); return; }

      await apiClient.post(`/admin/workspaces/${workspaceId}/members`, {
        userId: found._id, role: 'member',
      });
      toast.success(l.inviteOk);
      setInviteVal('');
      load();
    } catch { toast.error(l.inviteFail); }
    setInviting(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '70px 20px 0', background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={ref} style={{ width: 320, background: 'linear-gradient(160deg,rgba(13,20,36,.99),rgba(8,28,25,.99))', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,.6)', animation: 'bm-in .2s ease-out', overflow: 'hidden' }}>
        <style>{`@keyframes bm-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{l.title}</span>
          <button type="button" onClick={onClose}
            style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
            ✕
          </button>
        </div>

        {/* Invite */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 8 }}>{l.invite}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: 'white', fontSize: 12, outline: 'none' }}
              placeholder={l.invitePh}
              value={inviteVal}
              onChange={e => setInviteVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.1)'}
            />
            <button type="button" onClick={invite} disabled={inviting || !inviteVal.trim()}
              style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: inviteVal.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,.1)', color: 'white', cursor: inviteVal.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {inviting ? '...' : l.inviteBtn}
            </button>
          </div>
        </div>

        {/* Members list */}
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,.4)', fontSize: 13 }}>{l.loading}</p>
          ) : members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>{l.empty}</p>
          ) : members.map((m, i) => {
            const u = m.user;
            const uid = u?._id || u;
            const isYou = uid?.toString() === user?._id?.toString();
            const roleLbl = m.role === 'owner' ? l.owner : m.role === 'admin' ? l.admin : l.member;
            const roleColor = m.role === 'owner' ? '#fbbf24' : m.role === 'admin' ? '#60a5fa' : 'rgba(255,255,255,.4)';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
                <Avatar name={u?.name} avatar={u?.avatar} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {u?.name || uid} {isYou && <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{l.you}</span>}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: 0 }}>{u?.email || ''}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: `${roleColor}20`, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {roleLbl}
                </span>
              </div>
            );
          })}
        </div>

        {/* Share link */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <button type="button" onClick={copyLink}
            style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: copied ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.06)', color: copied ? '#34d399' : 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>{copied ? '✓' : '🔗'}</span>
            {copied ? l.copied : l.shareLink}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}