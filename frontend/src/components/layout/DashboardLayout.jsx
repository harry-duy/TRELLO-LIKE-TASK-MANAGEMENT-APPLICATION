// frontend/src/components/layout/DashboardLayout.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useUiStore } from '@store/uiStore';
import AIAssistantWidget from '@components/ai/AIAssistantWidget';
import ProfileDropdown from '@components/layout/ProfileDropdown';
import NotificationBell from '@components/layout/NotificationBell';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import apiClient from '@config/api';
import toast from 'react-hot-toast';
import Footer from '@components/layout/Footer';

/* ═══════════════════════════════════════════
   i18n dictionary
═══════════════════════════════════════════ */
const L = {
  vi: {
    wsLabel:       'Tổ chức',
    yourWs:        'Workspaces của bạn',
    wsLoading:     'Đang tải...',
    wsEmpty:       'Chưa có workspace nào',
    wsCreate:      '+ Tạo workspace mới',
    members:       'thành viên',
    tabWorkspaces: 'Workspaces',
    tabRecent:     'Gần đây',
    tabStarred:    'Đã đánh dấu',
    tabAdmin:      'Quản trị',
    recentBoards:  'BOARDS GẦN ĐÂY',
    starredBoards: 'BOARDS ĐÃ ĐÁNH DẤU',
    noRecent:      'Chưa mở board nào gần đây',
    noStarred:     'Chưa đánh dấu board nào',
    starTip:       'Đánh dấu board',
    unstarTip:     'Bỏ đánh dấu',
    searchPh:      'Tìm kiếm bảng, thẻ, thành viên...',
    searchTitle:   'BOARDS',
    searchEmpty:   'Không tìm thấy kết quả',
    searchType:    'Nhập ít nhất 2 ký tự...',
    aiAssist:      'AI Assist',
    createNew:     '+ Tạo mới',
    createTitle:   'Tạo mới',
    createBoard:   'Board',
    createBoardD:  'Tạo bảng Kanban mới',
    createWs:      'Workspace',
    createWsD:     'Tạo không gian nhóm mới',
    bgColor:       'Màu nền',
    boardName:     'Tên board',
    boardNamePh:   'VD: Sprint tuần 3...',
    wsName:        'Tên workspace',
    wsNamePh:      'VD: Nhóm Dev Intern...',
    descLabel:     'Mô tả (tùy chọn)',
    descPh:        'Mô tả ngắn...',
    wsSelect:      'Workspace',
    goBack:        'Quay lại',
    creating:      'Đang tạo...',
    errName:       'Vui lòng nhập tên',
    errWs:         'Chọn workspace trước',
    errFail:       'Tạo thất bại, thử lại',
  },
  en: {
    wsLabel:       'Organization',
    yourWs:        'Your workspaces',
    wsLoading:     'Loading...',
    wsEmpty:       'No workspaces yet',
    wsCreate:      '+ Create new workspace',
    members:       'members',
    tabWorkspaces: 'Workspaces',
    tabRecent:     'Recent',
    tabStarred:    'Starred',
    tabAdmin:      'Admin',
    recentBoards:  'RECENT BOARDS',
    starredBoards: 'STARRED BOARDS',
    noRecent:      'No boards opened recently',
    noStarred:     'No starred boards yet',
    starTip:       'Star board',
    unstarTip:     'Unstar board',
    searchPh:      'Search boards, cards, members...',
    searchTitle:   'BOARDS',
    searchEmpty:   'No results found',
    searchType:    'Type at least 2 characters...',
    aiAssist:      'AI Assist',
    createNew:     '+ New',
    createTitle:   'Create',
    createBoard:   'Board',
    createBoardD:  'Create a new Kanban board',
    createWs:      'Workspace',
    createWsD:     'Create a new team workspace',
    bgColor:       'Background color',
    boardName:     'Board name',
    boardNamePh:   'e.g. Sprint Week 3...',
    wsName:        'Workspace name',
    wsNamePh:      'e.g. Dev Team...',
    descLabel:     'Description (optional)',
    descPh:        'Short description...',
    wsSelect:      'Workspace',
    goBack:        'Go back',
    creating:      'Creating...',
    errName:       'Please enter a name',
    errWs:         'Please select a workspace',
    errFail:       'Failed to create, try again',
  },
};

/* ═══════════════ HELPERS ═══════════════ */
function useClickOutside(ref, cb) {
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn);
    };
  }, [ref, cb]);
}

function BoardColor({ color, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: color || '#0f766e', flexShrink: 0,
    }} />
  );
}

function StarIcon({ filled, size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      fill={filled ? '#fbbf24' : 'none'}
      stroke={filled ? '#fbbf24' : 'currentColor'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.127L8 10.77l-3.708 2.14.708-4.127L2 5.86l4.146-.603L8 1.5z"/>
    </svg>
  );
}

/* ═══════════════ WORKSPACE SWITCHER ═══════════════ */
function WorkspaceSwitcher({ l }) {
  const [open, setOpen]     = useState(false);
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    workspaceService.getMyWorkspaces()
      .then(d => setList(Array.isArray(d) ? d : d?.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)} className="nav-pill">
        <span style={{ fontSize: 11, color: 'rgba(236,253,245,.8)', fontWeight: 500 }}>{l.wsLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ flexShrink: 0, color: 'rgba(255,255,255,.5)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : '' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="nav-dropdown" style={{ width: 260, left: 0, top: 'calc(100% + 8px)' }}>
          <p className="nav-dropdown-title">{l.yourWs}</p>
          {loading ? (
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(167,243,208,.6)', fontSize: 13 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(52,211,153,.4)', borderTopColor: '#34d399', animation: 'nav-spin .8s linear infinite', display: 'inline-block' }} />
              {l.wsLoading}
            </div>
          ) : list.length === 0 ? (
            <p style={{ padding: '10px 16px', fontSize: 13, color: 'rgba(255,255,255,.4)' }}>{l.wsEmpty}</p>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {list.map(ws => (
                <button key={ws._id} type="button"
                  onClick={() => { navigate(`/workspace/${ws._id}`); setOpen(false); }}
                  className="nav-dropdown-item">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${(ws.name?.charCodeAt(0)||0)*13%360},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {(ws.name || 'W')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: 'white', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{ws.name}</p>
                    <p style={{ color: 'rgba(167,243,208,.45)', fontSize: 11, margin: 0 }}>{ws.members?.length || 0} {l.members}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', padding: '6px 8px' }}>
            <button type="button" onClick={() => { navigate('/workspace/new'); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,.1)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              {l.wsCreate}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ BOARD MENU ITEM ═══════════════ */
function BoardItem({ board, userId, onClose, onStarChange, l }) {
  const navigate = useNavigate();
  const [starred, setStarred] = useState(() =>
    (board.starredBy || []).some(id => (id?._id||id)?.toString() === userId?.toString())
  );
  const [busy, setBusy] = useState(false);

  const toggleStar = async e => {
    e.stopPropagation();
    if (busy) return;
    const next = !starred;
    setStarred(next);
    setBusy(true);
    try {
      await boardService.toggleStar(board._id);
      if (onStarChange) onStarChange();
    } catch {
      setStarred(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nav-dropdown-item" style={{ paddingRight: 10 }}>
      <button type="button"
        onClick={() => { navigate(`/board/${board._id}`); onClose(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
        <BoardColor color={board.background} size={28} />
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'white', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{board.name}</p>
          <p style={{ color: 'rgba(167,243,208,.4)', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.workspace?.name || ''}</p>
        </div>
      </button>
      <button type="button" onClick={toggleStar} title={starred ? l.unstarTip : l.starTip}
        style={{ background: 'none', border: 'none', cursor: busy ? 'wait' : 'pointer', padding: '2px 4px', borderRadius: 6, color: starred ? '#fbbf24' : 'rgba(255,255,255,.3)', flexShrink: 0, display: 'flex', transition: 'all .15s' }}
        onMouseEnter={e => { if (!starred) e.currentTarget.style.color='#fbbf24'; }}
        onMouseLeave={e => { if (!starred) e.currentTarget.style.color='rgba(255,255,255,.3)'; }}>
        <StarIcon filled={starred} />
      </button>
    </div>
  );
}

/* ═══════════════ NAV TABS ═══════════════ */
function NavTabs({ user, l }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userId   = user?._id;
  const [active,  setActive]  = useState('workspaces');
  const [drop,    setDrop]    = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [starred, setStarred] = useState([]);
  const ref = useRef(null);
  useClickOutside(ref, () => setDrop(null));

  useEffect(() => {
    setActive(location.pathname.startsWith('/admin') ? 'admin' : 'workspaces');
  }, [location.pathname]);

  const loadRecent = useCallback(async () => {
    try {
      const d = await boardService.getBoards({ isClosed: false });
      const all = Array.isArray(d) ? d : d?.data || [];
      setRecent([...all].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 10));
    } catch { setRecent([]); }
  }, []);

  const loadStarred = useCallback(async () => {
    try {
      const d = await boardService.getBoards({ isClosed: false });
      const all = Array.isArray(d) ? d : d?.data || [];
      setStarred(all.filter(b =>
        (b.starredBy || []).some(id => (id?._id||id)?.toString() === userId?.toString())
      ));
    } catch { setStarred([]); }
  }, [userId]);

  const handleTab = key => {
    if (key === 'workspaces') { navigate('/dashboard'); setDrop(null); setActive('workspaces'); }
    else if (key === 'recent')  { if (drop==='recent')  { setDrop(null); return; } loadRecent();  setDrop('recent');  }
    else if (key === 'starred') { if (drop==='starred') { setDrop(null); return; } loadStarred(); setDrop('starred'); }
    else if (key === 'admin')   { navigate('/admin');    setDrop(null); setActive('admin'); }
  };

  const tabs = [
    { key: 'workspaces', label: l.tabWorkspaces },
    { key: 'recent',     label: l.tabRecent,  arrow: true },
    { key: 'starred',    label: l.tabStarred, arrow: true },
    ...(user?.role === 'admin' ? [{ key: 'admin', label: l.tabAdmin }] : []),
  ];

  const dropTitle = drop === 'recent' ? l.recentBoards : l.starredBoards;
  const dropList  = drop === 'recent' ? recent : starred;
  const dropEmpty = drop === 'recent' ? l.noRecent : l.noStarred;

  return (
    <div ref={ref} style={{ position: 'relative' }} className="hidden md:flex">
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,.05)', borderRadius: 999, padding: '3px', border: '1px solid rgba(255,255,255,.08)' }}>
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => handleTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 999, border: 'none',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all .2s',
              background: active === tab.key ? 'white' : 'transparent',
              color:      active === tab.key ? '#0f172a' : 'rgba(236,253,245,.75)',
            }}
            onMouseEnter={e => { if (active !== tab.key) e.currentTarget.style.background='rgba(255,255,255,.1)'; }}
            onMouseLeave={e => { if (active !== tab.key) e.currentTarget.style.background='transparent'; }}>
            {tab.label}
            {tab.arrow && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ))}
      </nav>

      {drop && (
        <div className="nav-dropdown" style={{ width: 280, left: 0, top: 'calc(100% + 8px)' }}>
          <p className="nav-dropdown-title">{dropTitle}</p>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {dropList.length === 0
              ? <p style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)' }}>{dropEmpty}</p>
              : dropList.map(board => (
                  <BoardItem key={board._id} board={board} userId={userId} l={l}
                    onClose={() => setDrop(null)}
                    onStarChange={() => { loadStarred(); loadRecent(); }} />
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ SEARCH BAR ═══════════════ */
function SearchBar({ l, userId }) {
  const [q,       setQ]       = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref   = useRef(null);
  const timer = useRef(null);
  const nav   = useNavigate();
  useClickOutside(ref, () => { setFocused(false); setQ(''); setResults([]); });

  const search = useCallback(async val => {
    if (!val.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const d = await boardService.getBoards({ search: val.trim() });
      setResults((Array.isArray(d) ? d : d?.data || []).slice(0, 6));
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: 380 }} className="hidden sm:block">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        borderRadius: 999, padding: '6px 14px',
        border: focused ? '1px solid rgba(255,255,255,.3)' : '1px solid rgba(255,255,255,.12)',
        background: focused ? 'rgba(255,255,255,.15)' : 'rgba(15,23,42,.4)',
        boxShadow: focused ? '0 0 0 3px rgba(52,211,153,.12)' : 'none',
        transition: 'all .2s',
      }}>
        {loading
          ? <span style={{ width:13, height:13, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#34d399', animation:'nav-spin .8s linear infinite', flexShrink:0, display:'block' }} />
          : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color:'rgba(255,255,255,.4)', flexShrink:0 }}><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        }
        <input type="text" value={q}
          onChange={e => { const v=e.target.value; setQ(v); clearTimeout(timer.current); timer.current=setTimeout(()=>search(v),300); }}
          onFocus={() => setFocused(true)}
          placeholder={l.searchPh}
          style={{ background:'none', border:'none', outline:'none', color:'white', fontSize:12, width:'100%', minWidth:0 }}
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setResults([]); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', display:'flex', padding:0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {focused && q.length > 0 && (
        <div className="nav-dropdown" style={{ width: '100%', top: 'calc(100% + 8px)', left: 0 }}>
          {results.length === 0 && !loading
            ? <p style={{ padding:'16px', textAlign:'center', fontSize:13, color:'rgba(255,255,255,.4)' }}>{q.length < 2 ? l.searchType : l.searchEmpty}</p>
            : <div>
                <p className="nav-dropdown-title">{l.searchTitle}</p>
                {results.map(board => (
                  <BoardItem key={board._id} board={board} userId={userId} l={l}
                    onClose={() => { setFocused(false); setQ(''); }} />
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

/* ═══════════════ CREATE MODAL ═══════════════ */
function CreateModal({ onClose, l }) {
  const [mode,    setMode]    = useState('choose');
  const [name,    setName]    = useState('');
  const [desc,    setDesc]    = useState('');
  const [wsId,    setWsId]    = useState('');
  const [wsList,  setWsList]  = useState([]);
  const [bg,      setBg]      = useState('#0f766e');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (e.key==='Escape') onClose(); };
    document.addEventListener('keydown', fn);
    workspaceService.getMyWorkspaces()
      .then(d => { const ws=Array.isArray(d)?d:d?.data||[]; setWsList(ws); if(ws[0]) setWsId(ws[0]._id); })
      .catch(()=>{});
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const bgOpts = ['#0f766e','#0369a1','#7c3aed','#b91c1c','#b45309','#065f46','#1e1b4b','#334155'];

  const doCreate = async () => {
    if (!name.trim()) { setError(l.errName); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'workspace') {
        const r = await workspaceService.createWorkspace({ name:name.trim(), description:desc.trim()||undefined });
        onClose(); navigate(`/workspace/${(r?.data||r)._id}`);
      } else {
        if (!wsId) { setError(l.errWs); setLoading(false); return; }
        const r = await boardService.createBoard({ name:name.trim(), description:desc.trim()||undefined, workspaceId:wsId, background:bg });
        onClose(); navigate(`/board/${(r?.data||r)._id}`);
      }
    } catch(e) { setError(e?.message||l.errFail); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', padding:'1rem' }}
      onMouseDown={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div ref={ref} style={{ width:'100%', maxWidth:360, borderRadius:18, overflow:'hidden', background:'rgba(13,20,36,.98)', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 40px 80px rgba(0,0,0,.6)', animation:'nav-modal-in .2s cubic-bezier(.34,1.56,.64,1)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <span style={{ fontSize:15, fontWeight:600, color:'white' }}>
            {mode==='choose' ? l.createTitle : mode==='workspace' ? l.createWs : l.createBoard}
          </span>
          <button type="button" onClick={onClose}
            style={{ width:28, height:28, borderRadius:'50%', background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
          {mode === 'choose' ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { key:'board', icon:'📋', title:l.createBoard, desc:l.createBoardD, color:'rgba(52,211,153,.12)', border:'rgba(52,211,153,.2)' },
                { key:'workspace', icon:'🏢', title:l.createWs, desc:l.createWsD, color:'rgba(96,165,250,.12)', border:'rgba(96,165,250,.2)' },
              ].map(opt => (
                <button key={opt.key} type="button" onClick={()=>setMode(opt.key)}
                  style={{ padding:'1rem', borderRadius:14, border:`1px solid ${opt.border}`, background:opt.color, cursor:'pointer', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'transform .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.03)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                  <span style={{ fontSize:28 }}>{opt.icon}</span>
                  <span style={{ color:'white', fontSize:13, fontWeight:600 }}>{opt.title}</span>
                  <span style={{ color:'rgba(255,255,255,.45)', fontSize:11 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Back */}
              <button type="button" onClick={() => { setMode('choose'); setName(''); setDesc(''); setError(''); }}
                style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'rgba(167,243,208,.6)', fontSize:11, padding:0, width:'fit-content' }}
                onMouseEnter={e=>e.currentTarget.style.color='#34d399'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(167,243,208,.6)'}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {l.goBack}
              </button>

              {/* BG picker for board */}
              {mode === 'board' && (
                <div>
                  <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(167,243,208,.5)', marginBottom:8 }}>{l.bgColor}</p>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {bgOpts.map(c => (
                      <button key={c} type="button" onClick={()=>setBg(c)}
                        style={{ width:30, height:30, borderRadius:8, background:c, border:bg===c?'3px solid white':'3px solid transparent', cursor:'pointer', transition:'transform .15s', transform:bg===c?'scale(1.1)':'scale(1)' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(167,243,208,.5)', marginBottom:6 }}>
                  {mode==='board' ? l.boardName : l.wsName} <span style={{ color:'#f87171' }}>*</span>
                </p>
                <input
                  style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.07)', color:'white', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  placeholder={mode==='board' ? l.boardNamePh : l.wsNamePh}
                  value={name} onChange={e=>setName(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') doCreate(); }}
                  autoFocus
                  onFocus={e=>e.target.style.borderColor='rgba(52,211,153,.5)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.1)'}
                />
              </div>

              {/* Desc */}
              <div>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(167,243,208,.5)', marginBottom:6 }}>{l.descLabel}</p>
                <textarea rows={2}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.07)', color:'white', fontSize:13, outline:'none', resize:'none', boxSizing:'border-box' }}
                  placeholder={l.descPh}
                  value={desc} onChange={e=>setDesc(e.target.value)}
                  onFocus={e=>e.target.style.borderColor='rgba(52,211,153,.5)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.1)'}
                />
              </div>

              {/* WS picker */}
              {mode === 'board' && wsList.length > 0 && (
                <div>
                  <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(167,243,208,.5)', marginBottom:6 }}>{l.wsSelect}</p>
                  <select value={wsId} onChange={e=>setWsId(e.target.value)}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,.1)', background:'rgba(15,20,36,.9)', color:'white', fontSize:13, outline:'none', boxSizing:'border-box' }}>
                    {wsList.map(ws => <option key={ws._id} value={ws._id}>{ws.name}</option>)}
                  </select>
                </div>
              )}

              {error && <p style={{ fontSize:12, color:'#f87171', background:'rgba(239,68,68,.1)', borderRadius:8, padding:'8px 12px' }}>{error}</p>}

              <button type="button" disabled={loading} onClick={doCreate}
                style={{ width:'100%', padding:'11px', borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', background:'linear-gradient(135deg,#10b981,#059669)', color:'white', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?.7:1 }}>
                {loading
                  ? <><span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', animation:'nav-spin .7s linear infinite', display:'inline-block' }}/>{l.creating}</>
                  : (mode==='board' ? l.createBoard : l.createWs)
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ LANG TOGGLE ═══════════════ */
function LangToggle() {
  const lang        = useUiStore(s => s.language) || 'vi';
  const setLanguage = useUiStore(s => s.setLanguage);
  return (
    <div style={{ display:'inline-flex', borderRadius:999, overflow:'hidden', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)' }}>
      {['VI','EN'].map(lc => (
        <button key={lc} type="button" onClick={() => setLanguage(lc.toLowerCase())}
          style={{
            padding:'5px 9px', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, transition:'all .15s',
            background: lang===lc.toLowerCase() ? 'white' : 'transparent',
            color:      lang===lc.toLowerCase() ? '#0f172a' : 'rgba(236,253,245,.7)',
          }}>
          {lc}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════ MAIN LAYOUT ═══════════════ */
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuthStore();
  const lang = useUiStore(s => s.language) || 'vi';
  const l    = L[lang] || L.vi;

  const navigate = useNavigate();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [aiOpen,     setAiOpen]     = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isBoardPage = location.pathname.startsWith('/board/');

  return (
    <div className={`min-h-screen flex flex-col text-slate-100 ${isBoardPage ? 'board-surface' : 'bg-slate-900'}`}>

      {/* ─── Navbar ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(15,23,42,.72)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          maxWidth: 1600, margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', height: 56, gap: 10,
        }}>

          {/* Logo */}
          <Link to="/dashboard" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', flexShrink:0 }}>
            <span style={{ width:32, height:32, borderRadius:10, background:'rgba(52,211,153,.9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 2px 8px rgba(52,211,153,.3)' }}>⚡</span>
            <span className="hidden sm:block" style={{ fontSize:15, fontWeight:700, color:'white', letterSpacing:'-.02em' }}>TaskFlow</span>
          </Link>

          <WorkspaceSwitcher l={l} />
          <NavTabs user={user} l={l} />

          {/* Search — center */}
          <div style={{ flex:1, display:'flex', justifyContent:'center', padding:'0 8px' }}>
            <SearchBar l={l} userId={user?._id} />
          </div>

          {/* Right actions */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>

            {/* Language toggle */}
            <LangToggle />

            {/* AI Assist */}
            <button type="button" onClick={() => setAiOpen(v=>!v)}
              className="hidden md:inline-flex"
              style={{
                alignItems:'center', gap:6, borderRadius:999,
                background:'rgba(52,211,153,.12)',
                border:'1px solid rgba(52,211,153,.22)',
                padding:'6px 12px', fontSize:11, fontWeight:600,
                color:'#6ee7b7', cursor:'pointer', transition:'all .2s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(52,211,153,.22)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(52,211,153,.12)'}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', animation:'nav-pulse 1.5s ease-in-out infinite', display:'inline-block' }}/>
              {l.aiAssist}
            </button>

            {/* ✅ Notification Bell — hiển thị ngoài navbar */}
            <NotificationBell />

            {/* Create */}
            <button type="button" onClick={() => setShowCreate(true)}
              style={{
                display:'inline-flex', alignItems:'center', gap:4,
                borderRadius:999, background:'white', color:'#0f172a',
                padding:'6px 12px', fontSize:11, fontWeight:700,
                cursor:'pointer', border:'none',
                boxShadow:'0 1px 4px rgba(0,0,0,.2)', transition:'all .15s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background='#ecfdf5';e.currentTarget.style.transform='scale(1.02)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.transform='scale(1)';}}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              <span className="hidden sm:inline">{l.createNew}</span>
            </button>

            {/* Profile */}
            {user && <ProfileDropdown onLogout={handleLogout} />}
          </div>
        </div>
      </header>

      {/* ─── Page content ─── */}
      <main style={{ flex:1, width:'100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth:1600, width:'100%', margin:'0 auto', padding:'24px 20px', flex:1 }}>
          {children}
        </div>
      </main>

      {/* ─── Footer ─── */}
      {!isBoardPage && <Footer />}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} l={l} />}
      <AIAssistantWidget forceOpen={aiOpen} onToggle={() => setAiOpen(v=>!v)} />

      {/* Global nav styles */}
      <style>{`
        @keyframes nav-spin   { to{transform:rotate(360deg)} }
        @keyframes nav-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }
        @keyframes nav-modal-in { from{opacity:0;transform:scale(.93) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .nav-pill {
          display:inline-flex; align-items:center; gap:5px; padding:5px 11px;
          border-radius:999px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
          cursor:pointer; white-space:nowrap; transition:all .15s;
        }
        .nav-pill:hover { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.2); }

        .nav-dropdown {
          position:absolute; z-index:9000;
          border-radius:16px; border:1px solid rgba(255,255,255,.1);
          background:rgba(13,20,36,.98); backdrop-filter:blur(24px);
          box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04);
          animation:nav-drop-in .15s ease-out; overflow:hidden;
        }
        @keyframes nav-drop-in { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }

        .nav-dropdown-title {
          font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em;
          color:rgba(167,243,208,.4); padding:12px 16px 6px; margin:0;
        }

        .nav-dropdown-item {
          display:flex; align-items:center; gap:10; padding:9px 14px;
          background:none; border:none; cursor:pointer; width:100%; text-align:left;
          transition:background .12s; margin:0 4px; width:calc(100% - 8px); border-radius:10px;
        }
        .nav-dropdown-item:hover { background:rgba(255,255,255,.06)!important; }
      `}</style>
    </div>
  );
}