// frontend/src/components/layout/ProfileDropdown.jsx
// COPY FILE NÀY VÀO: frontend/src/components/layout/ProfileDropdown.jsx

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import authService from '@services/authService';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

/* ─────────────────────────────────────────────
   i18n
───────────────────────────────────────────── */
const T = {
  vi: {
    // menu
    profile:'Hồ sơ cá nhân', settings:'Cài đặt tài khoản',
    notifications:'Thông báo', logout:'Đăng xuất',
    // profile modal
    profileTitle:'Hồ sơ cá nhân', fullName:'Họ và tên',
    emailLabel:'Email', emailHint:'Không thể thay đổi',
    avatarLabel:'URL ảnh đại diện (tùy chọn)',
    avatarPh:'https://example.com/avatar.jpg', namePh:'Nguyễn Văn A',
    saveBtn:'Lưu thay đổi', saving:'Đang lưu...', saved:'Đã lưu!',
    status:'Trạng thái', active:'Hoạt động', locked:'Bị khoá',
    emailVerifiedLabel:'Xác thực email', verified:'Đã xác thực', notVerified:'Chưa xác thực',
    joinDate:'Ngày tham gia',
    saveOk:'Đã cập nhật hồ sơ!', saveFail:'Cập nhật thất bại',
    nameRequired:'Tên không được để trống',
    // settings modal
    settingsTitle:'Cài đặt tài khoản',
    changePwTitle:'Đổi mật khẩu', changePwDesc:'Mật khẩu mới phải ≥ 8 ký tự',
    curPw:'Mật khẩu hiện tại', newPw:'Mật khẩu mới', confirmPw:'Xác nhận mật khẩu mới',
    updatePw:'Cập nhật mật khẩu', updating:'Đang cập nhật...',
    match:'✓ Khớp', noMatch:'✗ Không khớp',
    str:['Quá yếu','Yếu','Trung bình','Mạnh','Rất mạnh'],
    errCurPw:'Nhập mật khẩu hiện tại', errMinLen:'Mật khẩu mới tối thiểu 8 ký tự',
    errConfirm:'Mật khẩu xác nhận không khớp',
    pwOk:'Đổi mật khẩu thành công!', pwFail:'Đổi mật khẩu thất bại',
    // notifications modal
    notifTitle:'Thông báo', tabAll:'Tất cả', tabUnread:'Chưa đọc',
    markAllRead:'Đọc tất cả', deleteAll:'Xoá tất cả',
    noNotif:'Không có thông báo nào',
    markRead:'Đánh dấu đã đọc', del:'Xoá',
    notifCount:(n)=>`${n} thông báo`,
  },
  en: {
    profile:'My Profile', settings:'Account Settings',
    notifications:'Notifications', logout:'Sign out',
    profileTitle:'My Profile', fullName:'Full name',
    emailLabel:'Email', emailHint:'Cannot be changed',
    avatarLabel:'Avatar URL (optional)',
    avatarPh:'https://example.com/avatar.jpg', namePh:'John Doe',
    saveBtn:'Save changes', saving:'Saving...', saved:'Saved!',
    status:'Status', active:'Active', locked:'Locked',
    emailVerifiedLabel:'Email verified', verified:'Verified', notVerified:'Not verified',
    joinDate:'Joined',
    saveOk:'Profile updated!', saveFail:'Update failed',
    nameRequired:'Name is required',
    settingsTitle:'Account Settings',
    changePwTitle:'Change password', changePwDesc:'New password must be ≥ 8 characters',
    curPw:'Current password', newPw:'New password', confirmPw:'Confirm new password',
    updatePw:'Update password', updating:'Updating...',
    match:'✓ Passwords match', noMatch:'✗ Passwords do not match',
    str:['Too weak','Weak','Fair','Strong','Very strong'],
    errCurPw:'Enter your current password', errMinLen:'New password must be at least 8 characters',
    errConfirm:'Passwords do not match',
    pwOk:'Password changed successfully!', pwFail:'Failed to change password',
    notifTitle:'Notifications', tabAll:'All', tabUnread:'Unread',
    markAllRead:'Mark all read', deleteAll:'Delete all',
    noNotif:'No notifications',
    markRead:'Mark as read', del:'Delete',
    notifCount:(n)=>`${n} notification${n!==1?'s':''}`,
  },
};

/* ─────────────────────────────────────────────
   Utils
───────────────────────────────────────────── */
function useClickOutside(ref, cb) {
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

function useEsc(cb) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') cb(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [cb]);
}

function MiniAvatar({ name, email, size = 40 }) {
  const initials = (name || email || '?').trim().split(' ')
    .map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, fontSize: size * 0.35,
      background: 'linear-gradient(135deg,#34d399,#10b981)',
      boxShadow: '0 2px 10px rgba(52,211,153,.3)',
    }} className="rounded-full flex items-center justify-center text-slate-900 font-bold shrink-0 select-none">
      {initials}
    </div>
  );
}

function Inp({ value, onChange, placeholder, disabled, type = 'text', className = '' }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      disabled={disabled}
      className={`pfd-inp ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    />
  );
}

/* ─────────────────────────────────────────────
   Modal wrapper — dùng Portal để tránh z-index bị chặn
───────────────────────────────────────────── */
function Modal({ title, onClose, children, maxW = 'max-w-md' }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  useEsc(onClose);

  // Prevent scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)' }}
      // Click backdrop → close
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className={`w-full ${maxW} rounded-2xl overflow-hidden`}
        style={{
          background: 'linear-gradient(160deg,#0d1b2a 0%,#0a2018 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(52,211,153,0.08)',
          animation: 'pfd-in .22s cubic-bezier(.34,1.5,.64,1)',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'sticky', top:0, background:'rgba(13,27,42,0.95)', zIndex:1 }}>
          <span style={{ fontSize:15, fontWeight:600, color:'white' }}>{title}</span>
          <button type="button" onClick={onClose}
            style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='white'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,0.4)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {children}
      </div>

      <style>{`
        @keyframes pfd-in { from{opacity:0;transform:scale(.93) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .pfd-inp { width:100%; padding:9px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.06); color:white; font-size:13px; outline:none; transition:border-color .2s,box-shadow .2s; box-sizing:border-box; }
        .pfd-inp:focus { border-color:rgba(52,211,153,.5)!important; box-shadow:0 0 0 3px rgba(52,211,153,.1); }
        .pfd-inp::placeholder { color:rgba(255,255,255,.28); }
        .pfd-label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:rgba(167,243,208,.5); margin-bottom:6px; }
      `}</style>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════
   MODAL 1 — Hồ sơ cá nhân
═══════════════════════════════════════ */
function ProfileModal({ t, onClose }) {
  const { user } = useAuthStore();
  const [name,   setName]   = useState(user?.name   || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error(t.nameRequired); return; }
    setLoading(true);
    try {
      // PUT /api/auth/update-profile
      const raw = await authService.updateProfile({ name: name.trim(), avatar: avatar.trim() || undefined });
      // Xử lý cả 2 trường hợp response: { data: user } hoặc user trực tiếp
      const fresh = raw?.data?.data || raw?.data || raw;
      useAuthStore.setState(s => ({ ...s, user: { ...s.user, ...fresh } }));
      setDone(true);
      toast.success(t.saveOk);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      toast.error(e?.message || t.saveFail);
    } finally { setLoading(false); }
  };

  const chips = [
    { label: t.status,            val: user?.isActive       ? t.active    : t.locked,     color: user?.isActive       ? '#34d399' : '#f87171' },
    { label: t.emailVerifiedLabel, val: user?.isEmailVerified ? t.verified  : t.notVerified, color: user?.isEmailVerified ? '#34d399' : '#fbbf24' },
    { label: t.joinDate,           val: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—', color: 'white' },
  ];

  return (
    <Modal title={t.profileTitle} onClose={onClose}>
      <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

        {/* Avatar + name preview */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(52,211,153,.4)' }} onError={e=>e.target.style.display='none'} />
            : <MiniAvatar name={name || user?.name} email={user?.email} size={80} />
          }
          <div style={{ textAlign:'center' }}>
            <p style={{ color:'white', fontWeight:600, fontSize:14 }}>{name || user?.name}</p>
            <p style={{ color:'rgba(167,243,208,.5)', fontSize:12 }}>{user?.email}</p>
            <span style={{ display:'inline-block', marginTop:6, padding:'2px 8px', borderRadius:999, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', background:'rgba(52,211,153,.15)', color:'#34d399', border:'1px solid rgba(52,211,153,.25)' }}>
              {user?.role || 'user'}
            </span>
          </div>
        </div>

        <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,.07)' }} />

        {/* Fields */}
        <div>
          <label className="pfd-label">{t.fullName}</label>
          <Inp value={name} onChange={e=>setName(e.target.value)} placeholder={t.namePh} />
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span className="pfd-label">{t.emailLabel}</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{t.emailHint}</span>
          </div>
          <Inp value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="pfd-label">{t.avatarLabel}</label>
          <Inp value={avatar} onChange={e=>setAvatar(e.target.value)} placeholder={t.avatarPh} />
        </div>

        {/* Info chips */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {chips.map(c => (
            <div key={c.label} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <p style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.06em', color:'rgba(255,255,255,.35)', marginBottom:4 }}>{c.label}</p>
              <p style={{ fontSize:11, fontWeight:600, color:c.color }}>{c.val}</p>
            </div>
          ))}
        </div>

        {/* Save button */}
        <button type="button" disabled={loading} onClick={save}
          style={{
            width:'100%', padding:'12px', borderRadius:12, border:'none', cursor: loading?'not-allowed':'pointer',
            background: done ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#10b981,#059669)',
            color:'white', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            opacity: loading ? .7 : 1, transition:'all .2s',
          }}>
          {loading
            ? <><Spin/>{t.saving}</>
            : done
              ? <><Check/>{t.saved}</>
              : t.saveBtn}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   MODAL 2 — Cài đặt tài khoản
═══════════════════════════════════════ */
function SettingsModal({ t, onClose }) {
  const [f, setF] = useState({ cur:'', next:'', confirm:'' });
  const [show, setShow] = useState({ cur:false, next:false, confirm:false });
  const [loading, setLoading] = useState(false);
  const [str, setStr] = useState(0);

  const calcStr = pw => {
    let s=0;
    if(pw.length>=8) s++;
    if(/[A-Z]/.test(pw)) s++;
    if(/[0-9]/.test(pw)) s++;
    if(/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strColors = ['#ef4444','#f97316','#eab308','#22c55e','#10b981'];

  const save = async () => {
    if(!f.cur)               { toast.error(t.errCurPw);   return; }
    if(f.next.length < 8)    { toast.error(t.errMinLen);   return; }
    if(f.next !== f.confirm) { toast.error(t.errConfirm);  return; }
    setLoading(true);
    try {
      // PUT /api/auth/change-password
      await authService.changePassword({ currentPassword: f.cur, newPassword: f.next });
      toast.success(t.pwOk);
      setTimeout(onClose, 1400);
    } catch(e) {
      toast.error(e?.message || t.pwFail);
    } finally { setLoading(false); }
  };

  const fields = [
    { key:'cur',     label:t.curPw,     ph:'••••••••' },
    { key:'next',    label:t.newPw,     ph:t.changePwDesc },
    { key:'confirm', label:t.confirmPw, ph:'••••••••' },
  ];

  return (
    <Modal title={t.settingsTitle} onClose={onClose}>
      <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

        {/* Header card */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:12, background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)' }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'rgba(59,130,246,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="7" width="10" height="6.5" rx="1.5" stroke="#60a5fa" strokeWidth="1.3"/><path d="M5 7V5.5a2.5 2.5 0 015 0V7" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p style={{ color:'white', fontWeight:600, fontSize:13 }}>{t.changePwTitle}</p>
            <p style={{ color:'rgba(255,255,255,.45)', fontSize:11 }}>{t.changePwDesc}</p>
          </div>
        </div>

        {fields.map(({ key, label, ph }) => (
          <div key={key}>
            <label className="pfd-label">{label}</label>
            <div style={{ position:'relative' }}>
              <input
                type={show[key] ? 'text' : 'password'}
                className="pfd-inp"
                placeholder={ph}
                value={f[key]}
                style={{ paddingRight:38 }}
                onChange={e => {
                  const v = e.target.value;
                  setF(p => ({ ...p, [key]: v }));
                  if (key === 'next') setStr(calcStr(v));
                }}
              />
              <button type="button"
                onClick={() => setShow(p => ({ ...p, [key]: !p[key] }))}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', display:'flex' }}>
                {show[key]
                  ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 2.5 7.5 2.5 14 7.5 14 7.5 11.5 12.5 7.5 12.5 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2"/><path d="M2 2L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 2.5 7.5 2.5 14 7.5 14 7.5 11.5 12.5 7.5 12.5 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2"/></svg>
                }
              </button>
            </div>

            {/* Strength bar */}
            {key === 'next' && f.next && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ height:3, flex:1, borderRadius:99, transition:'background .3s', background: i < str ? strColors[str] : 'rgba(255,255,255,.1)' }}/>
                  ))}
                </div>
                <p style={{ fontSize:10, marginTop:4, color: strColors[str] }}>{t.str[str]}</p>
              </div>
            )}

            {/* Match indicator */}
            {key === 'confirm' && f.confirm && (
              <p style={{ fontSize:10, marginTop:4, color: f.next===f.confirm ? '#34d399' : '#f87171' }}>
                {f.next===f.confirm ? t.match : t.noMatch}
              </p>
            )}
          </div>
        ))}

        <button type="button" disabled={loading} onClick={save}
          style={{
            width:'100%', padding:'12px', borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer',
            background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'white', fontWeight:600, fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?.7:1,
          }}>
          {loading ? <><Spin/>{t.updating}</> : t.updatePw}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   MODAL 3 — Thông báo
═══════════════════════════════════════ */
const NOTIFS_DATA = [
  { id:1, read:false, time:'2m',  actor:'Minh Tuấn', icon:'🔀', text:{ vi:'đã di chuyển card "Fix login bug" sang "Đang làm"',  en:'moved card "Fix login bug" to "In Progress"' }},
  { id:2, read:false, time:'15m', actor:'Thu Hà',    icon:'💬', text:{ vi:'đã bình luận trong "Design UI màn hình chính"',      en:'commented on "Design UI main screen"' }},
  { id:3, read:false, time:'1h',  actor:'Thanh Duy', icon:'👤', text:{ vi:'đã gán bạn vào "Viết unit test module auth"',        en:'assigned you to "Write unit tests for auth"' }},
  { id:4, read:true,  time:'3h',  actor:'System',    icon:'⏰', text:{ vi:'Card "Deploy lên Render" sẽ đến hạn trong 2 giờ',   en:'Card "Deploy to Render" is due in 2 hours' }},
  { id:5, read:true,  time:'1d',  actor:'Lan Anh',   icon:'📋', text:{ vi:'đã tạo board mới "Sprint tuần 12"',                 en:'created new board "Sprint Week 12"' }},
  { id:6, read:true,  time:'1d',  actor:'Khoa Nam',  icon:'💬', text:{ vi:'đã trả lời bình luận trong "API endpoints"',        en:'replied to your comment on "API endpoints"' }},
  { id:7, read:true,  time:'2d',  actor:'Việt Hùng', icon:'🏢', text:{ vi:'đã thêm bạn vào workspace "Mobile Dev"',            en:'added you to workspace "Mobile Dev"' }},
];

function NotificationsModal({ t, lang, onClose }) {
  const [notifs, setNotifs] = useState(NOTIFS_DATA);
  const [tab, setTab]       = useState('all');

  const unread   = notifs.filter(n => !n.read).length;
  const shown    = tab === 'unread' ? notifs.filter(n => !n.read) : notifs;

  const markAll  = () => setNotifs(p => p.map(n => ({ ...n, read:true })));
  const markOne  = (id) => setNotifs(p => p.map(n => n.id===id ? { ...n, read:true } : n));
  const delOne   = (id) => setNotifs(p => p.filter(n => n.id!==id));

  return (
    <Modal title={t.notifTitle} onClose={onClose} maxW="max-w-md">

      {/* Tabs + Mark all */}
      <div style={{ padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.05)', borderRadius:999, padding:'3px' }}>
          {[{k:'all',l:t.tabAll},{k:'unread',l:unread>0?`${t.tabUnread} (${unread})`:t.tabUnread}].map(({k,l})=>(
            <button key={k} type="button" onClick={()=>setTab(k)}
              style={{
                padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all .15s',
                background: tab===k ? 'white' : 'transparent',
                color:       tab===k ? '#0f172a' : 'rgba(255,255,255,.6)',
              }}>
              {l}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#34d399', fontWeight:500 }}>
            {t.markAllRead}
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight:400, overflowY:'auto' }}>
        {shown.length === 0
          ? <div style={{ padding:'60px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:'rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🔔</div>
              <p style={{ color:'rgba(255,255,255,.35)', fontSize:13 }}>{t.noNotif}</p>
            </div>
          : shown.map((n, idx) => (
              <div key={n.id}
                className="notif-row"
                style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 20px', position:'relative', background: n.read ? 'transparent' : 'rgba(52,211,153,.04)', animationDelay:`${idx*.04}s` }}>
                {!n.read && <span style={{ position:'absolute', left:6, top:'50%', transform:'translateY(-50%)', width:6, height:6, borderRadius:'50%', background:'#34d399' }} />}
                <div style={{ width:36, height:36, borderRadius:12, background: n.read?'rgba(255,255,255,.06)':'rgba(52,211,153,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {n.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.85)', lineHeight:1.4 }}>
                    <strong style={{ color:'white' }}>{n.actor}</strong>{' '}{n.text[lang] || n.text.vi}
                  </p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:3 }}>{n.time}</p>
                </div>
                <div className="notif-actions" style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {!n.read && (
                    <button type="button" title={t.markRead} onClick={()=>markOne(n.id)}
                      style={{ width:24, height:24, borderRadius:8, border:'none', cursor:'pointer', background:'rgba(52,211,153,.15)', color:'#34d399', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  <button type="button" title={t.del} onClick={()=>delOne(n.id)}
                    style={{ width:24, height:24, borderRadius:8, border:'none', cursor:'pointer', background:'rgba(239,68,68,.1)', color:'#f87171', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
            ))
        }
      </div>

      {/* Footer */}
      {notifs.length > 0 && (
        <div style={{ padding:'10px 20px', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{t.notifCount(notifs.length)}</span>
          <button type="button" onClick={()=>setNotifs([])}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'rgba(248,113,113,.7)', fontWeight:500 }}>
            {t.deleteAll}
          </button>
        </div>
      )}

      <style>{`.notif-row:hover { background: rgba(255,255,255,0.04)!important; } .notif-actions { opacity:0; transition:opacity .15s; } .notif-row:hover .notif-actions { opacity:1; }`}</style>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Micro icons
───────────────────────────────────────────── */
function Spin() {
  return <span style={{ display:'inline-block', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </span>;
}
function Check() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/* ═══════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════ */
export default function ProfileDropdown({ onLogout }) {
  const { user }  = useAuthStore();
  // ✅ Đọc language từ uiStore – reactive khi bấm VI/EN
  const lang      = useUiStore(s => s.language) || 'vi';
  const t         = T[lang] || T.vi;

  const [open,  setOpen]  = useState(false);
  const [modal, setModal] = useState(null); // 'profile' | 'settings' | 'notifications'
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const initials = (user?.name || user?.email || '?')
    .trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const BADGE = 3;

  const items = [
    { key:'profile',       label:t.profile,       color:'#a78bfa', icon:'👤' },
    { key:'settings',      label:t.settings,      color:'#60a5fa', icon:'⚙️' },
    { key:'notifications', label:t.notifications, color:'#fbbf24', icon:'🔔', badge:BADGE },
  ];

  return (
    <>
      <div ref={ref} style={{ position:'relative' }}>
        {/* Avatar button */}
        <button type="button" onClick={() => setOpen(v => !v)}
          style={{
            position:'relative', width:36, height:36, borderRadius:'50%',
            background:'linear-gradient(135deg,#34d399,#10b981)',
            border: open ? '2px solid #34d399' : '2px solid transparent',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700, color:'#0f172a',
            boxShadow: open ? '0 0 0 3px rgba(52,211,153,.25)' : '0 2px 8px rgba(52,211,153,.25)',
            transition:'all .2s',
          }}>
          {initials}
          {BADGE > 0 && (
            <span style={{
              position:'absolute', top:-3, right:-3, width:16, height:16, borderRadius:'50%',
              background:'#ef4444', color:'white', fontSize:9, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'2px solid #0f172a',
            }}>{BADGE}</span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div style={{
            position:'absolute', right:0, top:'calc(100% + 8px)', width:256, borderRadius:18, overflow:'hidden', zIndex:9000,
            background:'linear-gradient(160deg,rgba(15,23,42,.99) 0%,rgba(8,28,25,.98) 100%)',
            border:'1px solid rgba(255,255,255,.1)',
            boxShadow:'0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(52,211,153,.06)',
            animation:'pfd-drop .18s cubic-bezier(.34,1.4,.64,1)',
          }}>

            {/* User card */}
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <MiniAvatar name={user?.name} email={user?.email} size={44} />
                <div style={{ minWidth:0, flex:1 }}>
                  <p style={{ color:'white', fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
                  <p style={{ color:'rgba(167,243,208,.45)', fontSize:11, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
                  <span style={{ display:'inline-block', marginTop:5, padding:'1px 7px', borderRadius:999, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', background:'rgba(52,211,153,.15)', color:'#34d399', border:'1px solid rgba(52,211,153,.25)' }}>
                    {user?.role || 'user'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ margin:'0 16px', borderTop:'1px solid rgba(255,255,255,.07)' }} />

            {/* Menu */}
            <div style={{ padding:'6px 0' }}>
              {items.map(item => (
                <button key={item.key} type="button"
                  onClick={() => { setModal(item.key); setOpen(false); }}
                  className="pfd-menu-btn"
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                  <span style={{ fontSize:16, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                  <span style={{ color:'rgba(167,243,208,.8)', fontSize:13, flex:1 }}>{item.label}</span>
                  {item.badge
                    ? <span style={{ minWidth:20, height:20, padding:'0 5px', borderRadius:999, background:'#ef4444', color:'white', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{item.badge}</span>
                    : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity:.3 }}><path d="M4.5 3L7.5 6L4.5 9" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  }
                </button>
              ))}
            </div>

            <div style={{ margin:'0 16px', borderTop:'1px solid rgba(255,255,255,.07)' }} />

            {/* Logout */}
            <div style={{ padding:'6px 0' }}>
              <button type="button" onClick={() => { setOpen(false); onLogout(); }}
                className="pfd-logout-btn"
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, color:'rgba(248,113,113,.8)' }}>
                  <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M11 11l3-3m0 0l-3-3m3 3H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ color:'rgba(248,113,113,.8)', fontSize:13 }}>{t.logout}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals — render qua Portal, không bị z-index header chặn */}
      {modal === 'profile'       && <ProfileModal       t={t}           onClose={() => setModal(null)} />}
      {modal === 'settings'      && <SettingsModal      t={t}           onClose={() => setModal(null)} />}
      {modal === 'notifications' && <NotificationsModal t={t} lang={lang} onClose={() => setModal(null)} />}

      <style>{`
        @keyframes pfd-drop { from{opacity:0;transform:translateY(-10px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        .pfd-menu-btn:hover { background:rgba(255,255,255,0.06)!important; }
        .pfd-menu-btn:hover span[style*="rgba(167"] { color:white!important; }
        .pfd-logout-btn:hover { background:rgba(239,68,68,0.08)!important; }
        .pfd-logout-btn:hover span { color:rgba(248,113,113,1)!important; }
      `}</style>
    </>
  );
}