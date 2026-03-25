// frontend/src/components/layout/ProfileDropdown.jsx
// ✅ Đã bỏ mục Thông báo (chuyển ra NotificationBell ngoài navbar)

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import authService from '@services/authService';
import apiClient from '@config/api';
import toast from 'react-hot-toast';
import workspaceService from '@services/workspaceService';

/* ─────────────── i18n ─────────────── */
const T = {
  vi: {
    profile:'Hồ sơ cá nhân', settings:'Cài đặt tài khoản', logout:'Đăng xuất',
    profileTitle:'Hồ sơ cá nhân', fullName:'Họ và tên', emailLabel:'Email', emailHint:'Không thể thay đổi',
    avatarLabel:'URL ảnh đại diện (tùy chọn)', avatarPh:'https://example.com/avatar.jpg', namePh:'Nguyễn Văn A',
    saveBtn:'Lưu thay đổi', saving:'Đang lưu...', saved:'Đã lưu!',
    statusLabel:'Trạng thái', active:'Hoạt động', locked:'Bị khoá',
    emailVerifiedLabel:'Xác thực email', verified:'Đã xác thực', notVerified:'Chưa xác thực',
    joinDate:'Ngày tham gia', saveOk:'Đã cập nhật hồ sơ!', saveFail:'Cập nhật thất bại', nameRequired:'Tên không được để trống',
    settingsTitle:'Cài đặt tài khoản', changePwTitle:'Đổi mật khẩu', changePwDesc:'Mật khẩu mới phải ≥ 8 ký tự',
    curPw:'Mật khẩu hiện tại', newPw:'Mật khẩu mới', confirmPw:'Xác nhận mật khẩu mới',
    updatePw:'Cập nhật mật khẩu', updating:'Đang cập nhật...',
    match:'✓ Khớp', noMatch:'✗ Không khớp',
    str:['Quá yếu','Yếu','Trung bình','Mạnh','Rất mạnh'],
    errCurPw:'Nhập mật khẩu hiện tại', errMinLen:'Tối thiểu 8 ký tự', errConfirm:'Mật khẩu không khớp',
    pwOk:'Đổi mật khẩu thành công!', pwFail:'Đổi mật khẩu thất bại',
  },
  en: {
    profile:'My Profile', settings:'Account Settings', logout:'Sign out',
    profileTitle:'My Profile', fullName:'Full name', emailLabel:'Email', emailHint:'Cannot be changed',
    avatarLabel:'Avatar URL (optional)', avatarPh:'https://example.com/avatar.jpg', namePh:'John Doe',
    saveBtn:'Save changes', saving:'Saving...', saved:'Saved!',
    statusLabel:'Status', active:'Active', locked:'Locked',
    emailVerifiedLabel:'Email verified', verified:'Verified', notVerified:'Not verified',
    joinDate:'Joined', saveOk:'Profile updated!', saveFail:'Update failed', nameRequired:'Name is required',
    settingsTitle:'Account Settings', changePwTitle:'Change password', changePwDesc:'New password must be ≥ 8 characters',
    curPw:'Current password', newPw:'New password', confirmPw:'Confirm new password',
    updatePw:'Update password', updating:'Updating...',
    match:'✓ Passwords match', noMatch:'✗ Passwords do not match',
    str:['Too weak','Weak','Fair','Strong','Very strong'],
    errCurPw:'Enter current password', errMinLen:'At least 8 characters', errConfirm:'Passwords do not match',
    pwOk:'Password changed!', pwFail:'Failed to change password',
  },
};

/* ─────────────── Helpers ─────────────── */
function useClickOutside(ref, cb) {
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}
function useEsc(cb) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') cb(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [cb]);
}

/* ─────────────── UserAvatar ─────────────── */
function UserAvatar({ name, email, avatarUrl, size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || email || '?').trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const showImg  = avatarUrl && !imgError;

  return showImg ? (
    <img
      src={avatarUrl}
      alt={name || 'avatar'}
      onError={() => setImgError(true)}
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0,
        border: '2px solid rgba(52,211,153,0.4)',
        boxShadow: '0 2px 10px rgba(52,211,153,0.25)',
      }}
      className={className}
    />
  ) : (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#34d399,#10b981)',
        boxShadow: '0 2px 10px rgba(52,211,153,0.25)',
        fontSize: size * 0.35, fontWeight: 700, color: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, userSelect: 'none',
      }}
      className={className}
    >
      {initials}
    </div>
  );
}

function Spin() {
  return <span style={{ display:'inline-block', width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', animation:'pfd-spin .7s linear infinite', flexShrink:0 }} />;
}

/* ─────────────── Modal via Portal ─────────────── */
function Modal({ title, onClose, children, maxW = 'max-w-md' }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  useEsc(onClose);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', background:'rgba(0,0,0,.72)', backdropFilter:'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} className={`w-full ${maxW} rounded-2xl overflow-hidden`}
        style={{ background:'linear-gradient(160deg,#0d1b2a 0%,#0a2018 100%)', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 40px 80px rgba(0,0,0,.7)', animation:'pfd-in .22s cubic-bezier(.34,1.5,.64,1)', maxHeight:'calc(100vh - 2rem)', overflowY:'auto' }}>
        {/* Sticky header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.08)', position:'sticky', top:0, background:'rgba(13,27,42,.97)', zIndex:1 }}>
          <span style={{ fontSize:15, fontWeight:600, color:'white' }}>{title}</span>
          <button type="button" onClick={onClose}
            style={{ width:28, height:28, borderRadius:'50%', background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.1)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
        {children}
      </div>

      <style>{`
        @keyframes pfd-in   { from{opacity:0;transform:scale(.93) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pfd-spin { to{transform:rotate(360deg)} }
        .pfd-inp { width:100%; padding:9px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.06); color:white; font-size:13px; outline:none; transition:border-color .2s,box-shadow .2s; box-sizing:border-box; }
        .pfd-inp:focus { border-color:rgba(52,211,153,.5)!important; box-shadow:0 0 0 3px rgba(52,211,153,.1); }
        .pfd-inp::placeholder { color:rgba(255,255,255,.28); }
        .pfd-lbl { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:rgba(167,243,208,.5); margin-bottom:6px; }
      `}</style>
    </div>,
    document.body
  );
}

/* ═══════════════ MODAL: Hồ sơ ═══════════════ */
function ProfileModal({ t, onClose }) {
  const { user } = useAuthStore();
  const [name,   setName]   = useState(user?.name   || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]   = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error(t.nameRequired); return; }
    setLoading(true);
    try {
      const raw   = await authService.updateProfile({ name: name.trim(), avatar: avatar.trim() || undefined });
      const fresh = raw?.data?.data || raw?.data || raw;
      useAuthStore.setState(s => ({ ...s, user: { ...s.user, ...fresh } }));
      setDone(true);
      toast.success(t.saveOk);
      setTimeout(() => setDone(false), 2500);
    } catch (e) { toast.error(e?.message || t.saveFail); }
    finally { setLoading(false); }
  };

  const previewUrl = avatar.trim() || user?.avatar || '';

  return (
    <Modal title={t.profileTitle} onClose={onClose}>
      <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

        {/* Avatar preview */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <UserAvatar name={name || user?.name} email={user?.email} avatarUrl={previewUrl} size={80} />
          <div style={{ textAlign:'center' }}>
            <p style={{ color:'white', fontWeight:600, fontSize:14, margin:0 }}>{name || user?.name}</p>
            <p style={{ color:'rgba(167,243,208,.5)', fontSize:12, marginTop:2 }}>{user?.email}</p>
            <span style={{ display:'inline-block', marginTop:6, padding:'2px 8px', borderRadius:999, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', background:'rgba(52,211,153,.15)', color:'#34d399', border:'1px solid rgba(52,211,153,.25)' }}>
              {user?.role || 'user'}
            </span>
          </div>
        </div>

        <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,.07)' }} />

        <div>
          <label className="pfd-lbl">{t.fullName}</label>
          <input className="pfd-inp" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePh} />
        </div>

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span className="pfd-lbl" style={{ marginBottom:0 }}>{t.emailLabel}</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{t.emailHint}</span>
          </div>
          <input className="pfd-inp" value={user?.email || ''} disabled style={{ opacity:.5, cursor:'not-allowed' }} />
        </div>

        <div>
          <label className="pfd-lbl">{t.avatarLabel}</label>
          <input className="pfd-inp" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder={t.avatarPh} />
          {previewUrl && (
            <p style={{ fontSize:10, color:'rgba(167,243,208,.5)', marginTop:4 }}>↑ Preview đang hiển thị phía trên</p>
          )}
        </div>

        {/* Info chips */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { label:t.statusLabel,        val:user?.isActive?t.active:t.locked,              color:user?.isActive?'#34d399':'#f87171' },
            { label:t.emailVerifiedLabel, val:user?.isEmailVerified?t.verified:t.notVerified, color:user?.isEmailVerified?'#34d399':'#fbbf24' },
            { label:t.joinDate,           val:user?.createdAt?new Date(user.createdAt).toLocaleDateString():'—', color:'white' },
          ].map(c => (
            <div key={c.label} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <p style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.06em', color:'rgba(255,255,255,.35)', margin:0 }}>{c.label}</p>
              <p style={{ fontSize:11, fontWeight:600, color:c.color, margin:0, marginTop:4 }}>{c.val}</p>
            </div>
          ))}
        </div>

        <button type="button" disabled={loading} onClick={save}
          style={{ width:'100%', padding:12, borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', background:done?'linear-gradient(135deg,#059669,#047857)':'linear-gradient(135deg,#10b981,#059669)', color:'white', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?.7:1, transition:'background .3s' }}>
          {loading ? <><Spin/>{t.saving}</>
            : done  ? <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>{t.saved}</>
            : t.saveBtn}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════ MODAL: Settings ═══════════════ */
function SettingsModal({ t, onClose }) {
  const [f, setF]       = useState({ cur:'', next:'', confirm:'' });
  const [show, setShow] = useState({ cur:false, next:false, confirm:false });
  const [loading, setLoading] = useState(false);
  const [str, setStr]   = useState(0);
  const colors = ['#ef4444','#f97316','#eab308','#22c55e','#10b981'];
  const calc   = pw => { let s=0; if(pw.length>=8)s++; if(/[A-Z]/.test(pw))s++; if(/[0-9]/.test(pw))s++; if(/[^A-Za-z0-9]/.test(pw))s++; return s; };
  const Eye = ({ v }) => v
    ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 2.5 7.5 2.5 14 7.5 14 7.5 11.5 12.5 7.5 12.5 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2"/><path d="M2 2L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
    : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 2.5 7.5 2.5 14 7.5 14 7.5 11.5 12.5 7.5 12.5 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2"/></svg>;

  const save = async () => {
    if (!f.cur)              { toast.error(t.errCurPw);  return; }
    if (f.next.length < 8)   { toast.error(t.errMinLen); return; }
    if (f.next !== f.confirm) { toast.error(t.errConfirm); return; }
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword:f.cur, newPassword:f.next });
      toast.success(t.pwOk);
      setTimeout(onClose, 1400);
    } catch(e) { toast.error(e?.message||t.pwFail); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={t.settingsTitle} onClose={onClose}>
      <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:12, background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)' }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'rgba(59,130,246,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="7" width="10" height="6.5" rx="1.5" stroke="#60a5fa" strokeWidth="1.3"/><path d="M5 7V5.5a2.5 2.5 0 015 0V7" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p style={{ color:'white', fontWeight:600, fontSize:13, margin:0 }}>{t.changePwTitle}</p>
            <p style={{ color:'rgba(255,255,255,.45)', fontSize:11, margin:0 }}>{t.changePwDesc}</p>
          </div>
        </div>

        {[{key:'cur',label:t.curPw,ph:'••••••••'},{key:'next',label:t.newPw,ph:t.changePwDesc},{key:'confirm',label:t.confirmPw,ph:'••••••••'}].map(({key,label,ph}) => (
          <div key={key}>
            <label className="pfd-lbl">{label}</label>
            <div style={{ position:'relative' }}>
              <input type={show[key]?'text':'password'} className="pfd-inp" placeholder={ph} value={f[key]} style={{ paddingRight:38 }}
                onChange={e=>{ const v=e.target.value; setF(p=>({...p,[key]:v})); if(key==='next') setStr(calc(v)); }} />
              <button type="button" onClick={()=>setShow(p=>({...p,[key]:!p[key]}))}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', display:'flex' }}>
                <Eye v={show[key]} />
              </button>
            </div>
            {key==='next' && f.next && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4 }}>{[0,1,2,3].map(i=><div key={i} style={{ height:3, flex:1, borderRadius:99, transition:'background .3s', background:i<str?colors[str]:'rgba(255,255,255,.1)' }}/>)}</div>
                <p style={{ fontSize:10, marginTop:4, color:colors[str], margin:'4px 0 0' }}>{t.str[str]}</p>
              </div>
            )}
            {key==='confirm' && f.confirm && (
              <p style={{ fontSize:10, marginTop:4, color:f.next===f.confirm?'#34d399':'#f87171', margin:'4px 0 0' }}>
                {f.next===f.confirm ? t.match : t.noMatch}
              </p>
            )}
          </div>
        ))}

        <button type="button" disabled={loading} onClick={save}
          style={{ width:'100%', padding:12, borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'white', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?.7:1 }}>
          {loading ? <><Spin/>{t.updating}</> : t.updatePw}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════ MAIN EXPORT ═══════════════ */
export default function ProfileDropdown({ onLogout }) {
  const { user } = useAuthStore();
  const lang = useUiStore(s => s.language) || 'vi';
  const t    = T[lang] || T.vi;

  const [open,  setOpen]  = useState(false);
  const [modal, setModal] = useState(null); // 'profile' | 'settings' | null
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  // Chỉ còn 2 mục: Profile và Settings
  const items = [
    { key:'profile',  label:t.profile,  icon:'👤' },
    { key:'settings', label:t.settings, icon:'⚙️' },
  ];

  return (
    <>
      <div ref={ref} style={{ position:'relative' }}>
        {/* Avatar button */}
        <button type="button" onClick={() => setOpen(v=>!v)}
          style={{
            position:'relative', width:36, height:36,
            borderRadius:'50%', padding:0,
            border: open ? '2px solid #34d399' : '2px solid transparent',
            cursor:'pointer', overflow:'hidden',
            boxShadow: open
              ? '0 0 0 3px rgba(52,211,153,.25)'
              : '0 2px 8px rgba(52,211,153,.25)',
            transition:'all .2s', background:'transparent',
          }}>
          <UserAvatar
            name={user?.name} email={user?.email}
            avatarUrl={user?.avatar}
            size={32}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position:'absolute', right:0, top:'calc(100% + 8px)',
            width:240, borderRadius:18, overflow:'hidden',
            zIndex:9000,
            background:'linear-gradient(160deg,rgba(15,23,42,.99) 0%,rgba(8,28,25,.98) 100%)',
            border:'1px solid rgba(255,255,255,.1)',
            boxShadow:'0 24px 60px rgba(0,0,0,.55)',
            animation:'pfd-drop .18s cubic-bezier(.34,1.4,.64,1)',
          }}>

            {/* User card */}
            <div style={{ padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <UserAvatar name={user?.name} email={user?.email} avatarUrl={user?.avatar} size={42} />
                <div style={{ minWidth:0, flex:1 }}>
                  <p style={{ color:'white', fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{user?.name}</p>
                  <p style={{ color:'rgba(167,243,208,.45)', fontSize:11, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{user?.email}</p>
                  <span style={{ display:'inline-block', marginTop:5, padding:'1px 7px', borderRadius:999, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', background:'rgba(52,211,153,.15)', color:'#34d399', border:'1px solid rgba(52,211,153,.25)' }}>
                    {user?.role || 'user'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ margin:'0 14px', borderTop:'1px solid rgba(255,255,255,.07)' }}/>

            <div style={{ padding:'6px 0' }}>
              {items.map(item => (
                <button key={item.key} type="button"
                  onClick={() => { setModal(item.key); setOpen(false); }}
                  className="pfd-menu-btn"
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                  <span style={{ fontSize:15, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                  <span style={{ color:'rgba(167,243,208,.8)', fontSize:13, flex:1 }}>{item.label}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity:.3 }}>
                    <path d="M4.5 3L7.5 6L4.5 9" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>

            <div style={{ margin:'0 14px', borderTop:'1px solid rgba(255,255,255,.07)' }}/>

            <div style={{ padding:'6px 0' }}>
              <button type="button"
                onClick={() => { setOpen(false); onLogout(); }}
                className="pfd-logout-btn"
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, color:'rgba(248,113,113,.8)' }}>
                  <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M11 11l3-3m0 0l-3-3m3 3H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ color:'rgba(248,113,113,.8)', fontSize:13 }}>{t.logout}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'profile'  && <ProfileModal  t={t} onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal t={t} onClose={() => setModal(null)} />}

      <style>{`
        @keyframes pfd-drop { from{opacity:0;transform:translateY(-10px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pfd-in   { from{opacity:0;transform:scale(.93) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pfd-spin { to{transform:rotate(360deg)} }
        .pfd-menu-btn:hover   { background:rgba(255,255,255,.06)!important; }
        .pfd-logout-btn:hover { background:rgba(239,68,68,.08)!important; }
        .pfd-inp { width:100%; padding:9px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.06); color:white; font-size:13px; outline:none; transition:border-color .2s,box-shadow .2s; box-sizing:border-box; }
        .pfd-inp:focus { border-color:rgba(52,211,153,.5)!important; box-shadow:0 0 0 3px rgba(52,211,153,.1); }
        .pfd-inp::placeholder { color:rgba(255,255,255,.28); }
        .pfd-lbl { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:rgba(167,243,208,.5); margin-bottom:6px; }
      `}</style>
    </>
  );
}