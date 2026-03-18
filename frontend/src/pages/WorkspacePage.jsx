// frontend/src/pages/WorkspacePage.jsx
// ✅ i18n VI/EN  ✅ StarButton trên mỗi board card  ✅ Tạo workspace/board

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUiStore } from '@store/uiStore';
import { useAuthStore } from '@store/authStore';
import workspaceService from '@services/workspaceService';
import boardService from '@services/boardService';
import BoardCanvas from '@components/board/BoardCanvas';
import StarButton from '@components/board/StarButton';

/* ─── i18n ─── */
const L = {
  vi: {
    // Create workspace page
    createWsTitle:  'Tạo Workspace',
    createWsDesc:   'Thêm tên và mô tả để bắt đầu.',
    wsNamePh:       'Tên workspace',
    descPh:         'Mô tả (không bắt buộc)',
    createWsBtn:    'Tạo workspace',
    cancel:         'Huỷ',
    // Workspace page
    loadingWs:      'Đang tải workspace...',
    loadWsError:    'Không thể tải workspace',
    boardsTitle:    'Boards',
    gridView:       'Dạng lưới',
    createNewBoard: '+ Tạo board mới',
    wsFallback:     'Workspace',
    createdAt:      'Tạo: {date}',
    // Board form
    boardNamePh:    'Tên board',
    boardDescPh:    'Mô tả (không bắt buộc)',
    createBoardBtn: 'Tạo board',
    // Sidebar
    sidebarBoards:  'BOARDS',
  },
  en: {
    createWsTitle:  'Create Workspace',
    createWsDesc:   'Add a name and description to get started.',
    wsNamePh:       'Workspace name',
    descPh:         'Description (optional)',
    createWsBtn:    'Create workspace',
    cancel:         'Cancel',
    loadingWs:      'Loading workspace...',
    loadWsError:    'Could not load workspace',
    boardsTitle:    'Boards',
    gridView:       'Grid view',
    createNewBoard: '+ Create new board',
    wsFallback:     'Workspace',
    createdAt:      'Created: {date}',
    boardNamePh:    'Board name',
    boardDescPh:    'Description (optional)',
    createBoardBtn: 'Create board',
    sidebarBoards:  'BOARDS',
  },
};

/* ─── Board Card with StarButton ─── */
function BoardCard({ board, onClick, onStarToggle }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 cursor-pointer group transition-all hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20">
      {/* Color bar — click để mở board */}
      <button type="button" className="w-full text-left" onClick={onClick}>
        <div style={{ height: 48, background: board.background || '#0f766e' }} />
      </button>
      {/* Footer */}
      <div className="p-3 bg-white/8 flex items-center justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onClick}>
          <p className="text-sm font-semibold text-white truncate">{board.name}</p>
          {board.description && (
            <p className="text-xs text-emerald-50/50 truncate mt-0.5">{board.description}</p>
          )}
        </button>
        {/* ✅ Star button — stopPropagation để không trigger navigate */}
        <div onClick={e => e.stopPropagation()}>
          <StarButton board={board} size="sm" onToggle={onStarToggle} />
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate  = useNavigate();
  const lang      = useUiStore(s => s.language) || 'vi';
  const l         = L[lang] || L.vi;
  const { user }  = useAuthStore();

  const [state, setState] = useState({ status: 'loading', workspace: null, error: null });
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [boardName,       setBoardName]       = useState('');
  const [boardDesc,       setBoardDesc]       = useState('');

  // For "create workspace" page
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');

  /* ─── Load workspace ─── */
  const loadWorkspace = async () => {
    if (workspaceId === 'new') {
      setState({ status: 'ready', workspace: null, error: null });
      return;
    }
    setState(p => ({ ...p, status: 'loading', error: null }));
    try {
      const data = await workspaceService.getWorkspace(workspaceId);
      const ws   = data?.data || data;
      setState({ status: 'ready', workspace: ws, error: null });
    } catch (err) {
      setState({ status: 'error', workspace: null, error: err });
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  /* ─── Auto-select first board ─── */
  useEffect(() => {
    if (workspaceId === 'new' || state.status !== 'ready') return;
    const boards = state.workspace?.boards || [];
    if (!boards.length) return;
    if (!selectedBoardId || !boards.some(b => (b._id||b.id) === selectedBoardId)) {
      setSelectedBoardId(boards[0]._id || boards[0].id);
    }
  }, [workspaceId, state]);

  /* ─── Create workspace ─── */
  if (workspaceId === 'new') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-white heading-soft">{l.createWsTitle}</h1>
        <p className="text-soft mt-2">{l.createWsDesc}</p>
        <div className="panel-soft mt-6 p-6 space-y-4">
          <input
            className="input"
            placeholder={l.wsNamePh}
            value={wsName}
            onChange={e => setWsName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateWs(); }}
            autoFocus
          />
          <textarea
            className="input min-h-[100px] resize-none"
            placeholder={l.descPh}
            value={wsDesc}
            onChange={e => setWsDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleCreateWs}>{l.createWsBtn}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>{l.cancel}</button>
          </div>
        </div>
      </div>
    );
  }

  async function handleCreateWs() {
    if (!wsName.trim()) return;
    const res = await workspaceService.createWorkspace({ name: wsName.trim(), description: wsDesc.trim() || undefined });
    const ws  = res?.data || res;
    if (ws?._id) navigate(`/workspace/${ws._id}`);
  }

  /* ─── Loading / Error ─── */
  if (state.status === 'loading') return (
    <div className="flex items-center gap-2 text-emerald-100/70">
      <div className="spinner border-primary-600" />
      {l.loadingWs}
    </div>
  );

  if (state.status === 'error') return (
    <div className="card bg-white/10 border border-white/10 p-4">
      <p className="text-sm text-red-300">{l.loadWsError}</p>
    </div>
  );

  const boards = state.workspace?.boards || [];

  /* ─── Create board handler ─── */
  const handleCreateBoard = async () => {
    if (!boardName.trim()) return;
    try {
      const res     = await boardService.createBoard({
        name:        boardName.trim(),
        description: boardDesc.trim() || undefined,
        workspaceId,
      });
      const created = res?.data || res;
      setBoardName(''); setBoardDesc(''); setIsCreatingBoard(false);
      // Reload workspace để lấy board mới
      const fresh = await workspaceService.getWorkspace(workspaceId);
      setState(p => ({ ...p, workspace: fresh?.data || fresh }));
      if (created?._id) setSelectedBoardId(created._id);
    } catch { /* ignore */ }
  };

  /* ─── Board selected → show BoardCanvas + sidebar ─── */
  if (selectedBoardId) {
    return (
      <div className="grid gap-4 lg:grid-cols-[240px_1fr] items-start">
        {/* Sidebar */}
        <aside className="card bg-white/10 border border-white/10 p-3 sticky top-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/40">{l.sidebarBoards}</p>
              <h2 className="text-sm font-semibold text-white mt-0.5 truncate">
                {state.workspace?.name || l.wsFallback}
              </h2>
            </div>
            <button type="button" onClick={() => setSelectedBoardId(null)}
              className="text-[10px] text-emerald-100/50 hover:text-white whitespace-nowrap transition-colors">
              {l.gridView}
            </button>
          </div>

          <div className="space-y-0.5 max-h-[65vh] overflow-auto custom-scrollbar pr-1">
            {boards.map(board => {
              const id       = board._id || board.id;
              const isActive = id === selectedBoardId;
              const isStarred = (board.starredBy || []).some(uid =>
                (uid?._id||uid)?.toString() === user?._id?.toString()
              );
              return (
                <div key={id}
                  className={`flex items-center gap-2 rounded-xl px-2 py-2 transition-all group ${
                    isActive ? 'bg-emerald-400/20 border border-emerald-300/30' : 'hover:bg-white/8'
                  }`}>
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: board.background || '#0f766e' }} />
                  {/* Name */}
                  <button type="button" onClick={() => setSelectedBoardId(id)}
                    className={`flex-1 min-w-0 text-left text-sm truncate font-medium ${isActive ? 'text-emerald-100' : 'text-emerald-100/70 hover:text-white'}`}>
                    {board.name}
                  </button>
                  {/* Star */}
                  <div className={`transition-opacity ${isActive || isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <StarButton
                      board={board}
                      size="sm"
                      onToggle={loadWorkspace}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add board button in sidebar */}
          <button type="button" onClick={() => setIsCreatingBoard(true)}
            className="mt-3 w-full text-xs text-emerald-400/70 hover:text-emerald-300 text-center py-1.5 rounded-xl hover:bg-white/5 transition-colors border border-dashed border-white/10 hover:border-emerald-400/30">
            + {l.createNewBoard.replace('+ ', '')}
          </button>
        </aside>

        {/* Board Canvas */}
        <div className="min-w-0">
          <BoardCanvas boardId={selectedBoardId} showHeader={false} />
        </div>

        {/* Create board modal */}
        {isCreatingBoard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setIsCreatingBoard(false); }}>
            <div className="w-full max-w-sm rounded-2xl bg-slate-900/98 border border-white/12 p-5 shadow-2xl">
              <h3 className="text-base font-semibold text-white mb-4">{l.boardsTitle}</h3>
              <div className="space-y-3">
                <input className="input" placeholder={l.boardNamePh} value={boardName}
                  onChange={e => setBoardName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateBoard(); if (e.key === 'Escape') setIsCreatingBoard(false); }}
                  autoFocus />
                <textarea className="input resize-none" rows={2} placeholder={l.boardDescPh}
                  value={boardDesc} onChange={e => setBoardDesc(e.target.value)} />
                <div className="flex gap-2 pt-1">
                  <button className="btn btn-primary btn-sm" onClick={handleCreateBoard}>{l.createBoardBtn}</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setIsCreatingBoard(false); setBoardName(''); setBoardDesc(''); }}>{l.cancel}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Grid view ─── */
  return (
    <div>
      {/* Workspace header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
            style={{ background: `hsl(${(state.workspace?.name?.charCodeAt(0)||0)*13%360},60%,42%)` }}>
            {(state.workspace?.name || 'W')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white heading-soft">
              {state.workspace?.name || l.wsFallback}
            </h1>
            {state.workspace?.description && (
              <p className="text-soft text-sm mt-0.5">{state.workspace.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Boards grid */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-100/60 uppercase tracking-wider mb-3">{l.boardsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(board => (
            <BoardCard
              key={board._id || board.id}
              board={board}
              onClick={() => setSelectedBoardId(board._id || board.id)}
              onStarToggle={loadWorkspace}
            />
          ))}

          {/* Create new board */}
          <div className="rounded-2xl overflow-hidden border border-white/10">
            {isCreatingBoard ? (
              <div className="p-4 bg-white/8 space-y-3">
                <input className="input" placeholder={l.boardNamePh} value={boardName}
                  onChange={e => setBoardName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateBoard(); if (e.key === 'Escape') { setIsCreatingBoard(false); setBoardName(''); setBoardDesc(''); } }}
                  autoFocus />
                <textarea className="input resize-none" rows={2} placeholder={l.boardDescPh}
                  value={boardDesc} onChange={e => setBoardDesc(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={handleCreateBoard}>{l.createBoardBtn}</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setIsCreatingBoard(false); setBoardName(''); setBoardDesc(''); }}>{l.cancel}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setIsCreatingBoard(true)}
                className="w-full min-h-[120px] flex items-center justify-center text-emerald-50/50 hover:text-emerald-100 hover:bg-white/8 transition-all border-2 border-dashed border-white/15 hover:border-emerald-400/30 rounded-2xl font-medium">
                {l.createNewBoard}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}