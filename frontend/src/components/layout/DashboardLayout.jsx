// frontend/src/components/layout/DashboardLayout.jsx
// Thay thế file cũ bằng file này

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useTranslation } from '../../hooks/useTranslation';
import AIAssistantWidget from '@components/ai/AIAssistantWidget';
import ProfileDropdown from '@components/layout/ProfileDropdown';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';

/* ── helpers ── */
function useClickOutside(ref, handler) {
  useEffect(() => {
    const fn = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler(); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('touchstart', fn); };
  }, [ref, handler]);
}

/* ─────────────────────────────────────────────
   Workspace Switcher
───────────────────────────────────────────── */
function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    workspaceService.getMyWorkspaces()
      .then((data) => setWorkspaces(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="navbar-pill flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-emerald-50/80 truncate max-w-[120px]">To chuc Cong Viec</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`shrink-0 text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="dropdown-panel w-64 left-0 top-full mt-2">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] uppercase tracking-widest text-emerald-100/40 font-semibold">Workspaces của bạn</p>
          </div>
          {loading ? (
            <div className="px-3 py-4 flex items-center gap-2 text-emerald-100/60 text-sm">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-emerald-400/40 border-t-emerald-400 animate-spin" />
              Đang tải...
            </div>
          ) : workspaces.length === 0 ? (
            <p className="px-3 py-3 text-sm text-emerald-100/50">Chưa có workspace nào</p>
          ) : (
            <div className="py-1 max-h-56 overflow-auto custom-scrollbar">
              {workspaces.map((ws) => (
                <button key={ws._id} type="button" onClick={() => { navigate(`/workspace/${ws._id}`); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 transition-colors rounded-lg mx-1 text-left" style={{ width: 'calc(100% - 8px)' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: `hsl(${(ws.name?.charCodeAt(0) || 0) * 13 % 360}, 65%, 45%)` }}>
                    {(ws.name || 'W').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ws.name}</p>
                    <p className="text-[11px] text-emerald-100/50">{ws.members?.length || 0} thành viên</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-white/8 p-2">
            <button type="button" onClick={() => { navigate('/workspace/new'); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/8 text-emerald-400 text-sm font-medium transition-colors">
              <span className="text-lg leading-none">+</span> Tạo workspace mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Nav Tabs
───────────────────────────────────────────── */
function BoardMenuItem({ board, onClose }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => { navigate(`/board/${board._id}`); onClose(); }}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/8 transition-colors rounded-lg mx-1 text-left" style={{ width: 'calc(100% - 8px)' }}>
      <div className="h-8 w-8 rounded-lg shrink-0" style={{ background: board.background || '#0079bf' }} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{board.name}</p>
        <p className="text-[11px] text-emerald-100/50 truncate">{board.workspace?.name || 'Workspace'}</p>
      </div>
    </button>
  );
}

function NavTabs({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('workspaces');
  const [recentBoards, setRecentBoards] = useState([]);
  const [starredBoards, setStarredBoards] = useState([]);
  const [showDropdown, setShowDropdown] = useState(null);
  const dropRef = useRef(null);
  useClickOutside(dropRef, () => setShowDropdown(null));

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) setActiveTab('admin');
    else setActiveTab('workspaces');
  }, [location.pathname]);

  const loadRecent = useCallback(async () => {
    try {
      const data = await boardService.getBoards({ isClosed: false });
      const boards = Array.isArray(data) ? data : data?.data || [];
      setRecentBoards([...boards].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8));
    } catch { setRecentBoards([]); }
  }, []);

  const loadStarred = useCallback(async () => {
    try {
      const data = await boardService.getBoards({ isClosed: false });
      const boards = Array.isArray(data) ? data : data?.data || [];
      const userId = useAuthStore.getState().user?._id;
      setStarredBoards(boards.filter((b) => b.starredBy?.includes(userId)));
    } catch { setStarredBoards([]); }
  }, []);

  const tabs = [
    { key: 'workspaces', label: t('workspaces') },
    { key: 'recent', label: t('recent'), hasDropdown: true },
    { key: 'starred', label: t('starred'), hasDropdown: true },
    ...(user?.role === 'admin' ? [{ key: 'admin', label: t('admin') }] : []),
  ];

  const handleTabClick = (tab) => {
    if (tab === 'workspaces') { navigate('/dashboard'); setShowDropdown(null); setActiveTab('workspaces'); }
    else if (tab === 'recent') { if (showDropdown === 'recent') { setShowDropdown(null); return; } loadRecent(); setShowDropdown('recent'); }
    else if (tab === 'starred') { if (showDropdown === 'starred') { setShowDropdown(null); return; } loadStarred(); setShowDropdown('starred'); }
    else if (tab === 'admin') { navigate('/admin'); setShowDropdown(null); setActiveTab('admin'); }
  };

  return (
    <div ref={dropRef} className="relative hidden md:flex items-center">
      <nav className="flex items-center gap-0.5 rounded-full bg-white/5 px-1 py-1 border border-white/8">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => handleTabClick(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-emerald-50/75 hover:text-white hover:bg-white/10'
            }`}>
            {tab.label}
            {tab.hasDropdown && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ))}
      </nav>

      {showDropdown && (
        <div className="dropdown-panel w-72 left-0 top-full mt-2">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] uppercase tracking-widest text-emerald-100/40 font-semibold">
              {showDropdown === 'recent' ? 'Boards gần đây' : 'Boards đã đánh dấu'}
            </p>
          </div>
          <div className="py-1 max-h-64 overflow-auto custom-scrollbar">
            {(showDropdown === 'recent' ? recentBoards : starredBoards).length === 0 ? (
              <p className="px-3 py-4 text-sm text-emerald-100/50 text-center">
                {showDropdown === 'recent' ? 'Chưa mở board nào gần đây' : 'Chưa đánh dấu board nào'}
              </p>
            ) : (
              (showDropdown === 'recent' ? recentBoards : starredBoards).map((board) => (
                <BoardMenuItem key={board._id} board={board} onClose={() => setShowDropdown(null)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Search Bar
───────────────────────────────────────────── */
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  useClickOutside(ref, () => { setFocused(false); setResults([]); setQuery(''); });

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await boardService.getBoards({ search: q.trim() });
      setResults((Array.isArray(data) ? data : data?.data || []).slice(0, 6));
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value; setQuery(val);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(val), 300);
  };

  return (
    <div ref={ref} className="relative flex-1 max-w-xs hidden sm:block">
      <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-200 ${
        focused ? 'bg-white/15 border-white/30 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]' : 'bg-slate-900/40 border-white/12 hover:border-white/20'
      }`}>
        {loading
          ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-emerald-400 animate-spin shrink-0" />
          : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white/40 shrink-0"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        }
        <input type="text" value={query} onChange={handleChange} onFocus={() => setFocused(true)}
          placeholder="Tìm kiếm bảng, thẻ, thành viên..."
          className="bg-transparent border-none outline-none text-emerald-50 placeholder:text-emerald-100/40 text-xs w-full min-w-0" />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); }} className="text-white/40 hover:text-white/70 shrink-0 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
      {focused && query.length > 0 && (
        <div className="dropdown-panel w-full top-full mt-2 left-0">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-4 text-sm text-emerald-100/50 text-center">{query.length < 2 ? 'Nhập ít nhất 2 ký tự...' : 'Không tìm thấy kết quả'}</p>
          ) : (
            <div className="py-1">
              <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-emerald-100/40 font-semibold">Boards</p>
              {results.map((board) => (
                <BoardMenuItem key={board._id} board={board} onClose={() => { setFocused(false); setQuery(''); }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Create Modal
───────────────────────────────────────────── */
function CreateModal({ onClose }) {
  const [mode, setMode] = useState('choose');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bg, setBg] = useState('#0f766e');
  const navigate = useNavigate();
  const ref = useRef(null);
  useClickOutside(ref, onClose);

  useEffect(() => {
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') onClose(); });
    workspaceService.getMyWorkspaces()
      .then((data) => { const ws = Array.isArray(data) ? data : data?.data || []; setWorkspaces(ws); if (ws.length > 0) setWorkspaceId(ws[0]._id); })
      .catch(() => {});
  }, []);

  const bgOptions = ['#0f766e','#0369a1','#7c3aed','#b91c1c','#b45309','#065f46','#1e1b4b','#334155'];

  const handleCreate = async () => {
    if (!name.trim()) { setError('Vui lòng nhập tên'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'workspace') {
        const res = await workspaceService.createWorkspace({ name: name.trim(), description: description.trim() || undefined });
        onClose(); navigate(`/workspace/${(res?.data || res)._id}`);
      } else {
        if (!workspaceId) { setError('Chọn workspace trước'); setLoading(false); return; }
        const res = await boardService.createBoard({ name: name.trim(), description: description.trim() || undefined, workspaceId, background: bg });
        onClose(); navigate(`/board/${(res?.data || res)._id}`);
      }
    } catch (e) { setError(e?.message || 'Tạo thất bại, thử lại'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div ref={ref} className="w-full max-w-sm rounded-2xl border border-white/12 bg-slate-900/98 shadow-2xl overflow-hidden"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{mode === 'choose' ? 'Tạo mới' : mode === 'workspace' ? 'Tạo Workspace' : 'Tạo Board'}</h2>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="p-5">
          {mode === 'choose' ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'board', icon: '📋', title: 'Board', desc: 'Tạo bảng Kanban mới', color: 'border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400' },
                { key: 'workspace', icon: '🏢', title: 'Workspace', desc: 'Tạo không gian nhóm mới', color: 'border-blue-500/20 hover:bg-blue-500/10 text-blue-400' },
              ].map((opt) => (
                <button key={opt.key} type="button" onClick={() => setMode(opt.key)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-center ${opt.color}`}>
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{opt.title}</p>
                    <p className="text-[11px] text-white/50 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button type="button" onClick={() => { setMode('choose'); setName(''); setDescription(''); setError(''); }}
                className="flex items-center gap-1.5 text-[11px] text-emerald-100/60 hover:text-emerald-300 transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Quay lại
              </button>
              {mode === 'board' && (
                <div>
                  <label className="form-label">Màu nền</label>
                  <div className="flex gap-2 flex-wrap">
                    {bgOptions.map((c) => (
                      <button key={c} type="button" onClick={() => setBg(c)}
                        className={`h-8 w-8 rounded-lg transition-all ${bg === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="form-label">Tên {mode === 'board' ? 'board' : 'workspace'} <span className="text-red-400">*</span></label>
                <input className="modal-input" placeholder={mode === 'board' ? 'VD: Sprint tuần 3...' : 'VD: Nhóm Dev Intern...'}
                  value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} autoFocus />
              </div>
              <div>
                <label className="form-label">Mô tả (tùy chọn)</label>
                <textarea className="modal-input resize-none" rows={2} placeholder="Mô tả ngắn..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {mode === 'board' && workspaces.length > 0 && (
                <div>
                  <label className="form-label">Workspace</label>
                  <select className="modal-input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                    {workspaces.map((ws) => <option key={ws._id} value={ws._id}>{ws.name}</option>)}
                  </select>
                </div>
              )}
              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
              <button type="button" disabled={loading} onClick={handleCreate}
                className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
                {loading
                  ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Đang tạo...</>
                  : `Tạo ${mode === 'board' ? 'board' : 'workspace'}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN LAYOUT
───────────────────────────────────────────── */
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { language, setLanguage } = useTranslation();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col board-surface text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-900/70 border-b border-white/8 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5">
          <div className="flex items-center h-14 gap-2 sm:gap-3">

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0 group">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/95 text-slate-950 shadow-lg group-hover:bg-emerald-300 transition-colors">⚡</span>
              <span className="hidden sm:block text-[15px] font-bold text-white tracking-tight">TaskFlow</span>
            </Link>

            <WorkspaceSwitcher />
            <NavTabs user={user} />

            {/* Search */}
            <div className="flex-1 flex justify-center px-2">
              <SearchBar />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Language */}
              <div className="inline-flex rounded-full bg-white/8 border border-white/12 text-[10px] font-bold overflow-hidden">
                {['VI','EN'].map((lang) => (
                  <button key={lang} type="button" onClick={() => setLanguage(lang.toLowerCase())}
                    className={`px-2.5 py-1.5 transition-all duration-150 ${language === lang.toLowerCase() ? 'bg-white text-slate-900 shadow-sm' : 'text-emerald-50/70 hover:text-white hover:bg-white/10'}`}>
                    {lang}
                  </button>
                ))}
              </div>

              {/* AI Assist */}
              <button type="button" onClick={() => setAiOpen((v) => !v)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200 transition-all duration-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Assist
              </button>

              {/* Create */}
              <button type="button" onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white text-slate-900 px-3 py-1.5 text-[11px] font-bold shadow-sm hover:bg-emerald-50 active:scale-95 transition-all duration-150">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <span className="hidden sm:inline">Tạo mới</span>
              </button>

              {/* Profile Dropdown (tách riêng với đầy đủ chức năng) */}
              {user && <ProfileDropdown onLogout={handleLogout} />}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-8 py-6">
        {children}
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      <AIAssistantWidget forceOpen={aiOpen} onToggle={() => setAiOpen((v) => !v)} />

      <style>{`
        .navbar-pill { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border-radius:9999px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); transition:all .15s; white-space:nowrap; }
        .navbar-pill:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.2); }
        .dropdown-panel { position:absolute; z-index:50; border-radius:16px; border:1px solid rgba(255,255,255,0.1); background:rgba(15,23,42,0.97); backdrop-filter:blur(24px); box-shadow:0 24px 64px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.05); animation:dropIn 0.15s ease-out; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .form-label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:rgba(167,243,208,0.5); margin-bottom:6px; }
        .modal-input { width:100%; padding:9px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.07); color:white; font-size:13px; outline:none; transition:border-color .2s,box-shadow .2s; }
        .modal-input:focus { border-color:rgba(52,211,153,.5); box-shadow:0 0 0 3px rgba(52,211,153,.1); }
        .modal-input::placeholder { color:rgba(255,255,255,.25); }
        select.modal-input option { background:#0f172a; color:white; }
        .hover\\:bg-white\\/8:hover { background:rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
}