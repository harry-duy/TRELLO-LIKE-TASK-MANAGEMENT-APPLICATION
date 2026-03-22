// frontend/src/components/card/CardModal.jsx
// ✅ LabelManager ✅ DueDateBadge ✅ Archive ✅ Checklist progress

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cardService  from '@services/cardService';
import boardService from '@services/boardService';
import aiService    from '@services/aiService';
import { useUiStore } from '@store/uiStore';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';
import LabelManager, { LabelChip } from '@components/board/LabelManager';
import DueDateBadge from '@components/board/DueDateBadge';
import apiClient from '@config/api';

export default function CardModal({ cardId, boardId, onClose }) {
  const queryClient = useQueryClient();
  const { t }  = useTranslation();
  const lang   = useUiStore(s => s.language) || 'vi';

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
  const [checklistText, setChecklistText] = useState('');
  const [aiChecklist,   setAiChecklist]   = useState([]);
  const [moveTargets,   setMoveTargets]   = useState({});
  const [wsMembers,      setWsMembers]      = useState([]);  // members của workspace
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { data: card, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn:  () => cardService.getDetails(cardId),
  });

  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn:  () => boardService.getBoardDetails(boardId),
    enabled:  !!boardId,
  });

  const destinationCards = useMemo(() =>
    (board?.lists || []).flatMap(list =>
      (list.cards || [])
        .filter(c => !c.isArchived && c._id !== cardId)
        .map(c => ({ value: c._id, label: `${c.title} (${list.name})` }))
    ),
  [board, cardId]);

  useEffect(() => {
    if (!card) return;
    setForm({
      title: card.title || '',
      description: card.description || '',
      dueDate: card.dueDate ? card.dueDate.slice(0, 10) : '',
    });
  }, [card]);

  useEffect(() => {
    if (!boardId) return;

    const loadBoardMembers = async () => {
      setLoadingMembers(true);
      try {
        // ── Bước 1: Lấy thông tin board → tìm workspaceId ──────────────────
        const boardRes  = await boardService.getBoardDetails(boardId);
        const boardData = boardRes?.data ?? boardRes;
        const workspaceId =
          boardData?.workspace?._id || boardData?.workspace;

        if (!workspaceId) {
          setWsMembers([]);
          return;
        }

        // ── Bước 2: Lấy workspace → lấy danh sách members ──────────────────
        const wsRes = await apiClient.get(`/workspaces/${workspaceId}`);
        const ws    = wsRes?.data ?? wsRes;

        // ── Bước 3: Gộp owner + members, LOẠI TRÙNG ────────────────────────
        const ownerId   = (ws.owner?._id || ws.owner)?.toString();
        const ownerUser = ws.owner;

        // Lọc bỏ owner ra khỏi members[] để tránh hiện 2 lần
        const otherMembers = (ws.members || [])
          .filter(
            (m) =>
              (m.user?._id || m.user)?.toString() !== ownerId
          )
          .map((m) => m.user)
          .filter(Boolean);

        // Gộp: owner đứng đầu, sau đó là các member khác
        const merged = [ownerUser, ...otherMembers].filter(Boolean);

        // ── Bước 4: Deduplicate lần cuối theo _id (an toàn tuyệt đối) ───────
        const seen      = new Set();
        const memberList = merged.filter((u) => {
          const id = (u?._id || u)?.toString();
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        setWsMembers(memberList);
      } catch (err) {
        console.error('loadBoardMembers error:', err);
        setWsMembers([]);
      }
      setLoadingMembers(false);
    };

    loadBoardMembers();
  }, [boardId]);

  // ── Thêm hàm toggle assignee:
  const handleToggleAssignee = async (userId) => {
    const currentAssignees = card?.assignees?.map((a) => a._id || a) || [];
    const isAssigned = currentAssignees.some(
      (id) => id?.toString() === userId?.toString()
    );

    const newAssignees = isAssigned
      ? currentAssignees.filter((id) => id?.toString() !== userId?.toString())
      : [...currentAssignees, userId];

    await cardService.update(cardId, { assignees: newAssignees });
    queryClient.invalidateQueries(['card', cardId]);
    queryClient.invalidateQueries(['board', boardId]);
  };

  const updateMutation = useMutation({
    mutationFn: updates => cardService.update(cardId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setIsEditing(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: content => cardService.addComment(cardId, { content, boardId }),
    onSuccess:  () => queryClient.invalidateQueries(['card', cardId]),
  });

  const checklistMutation = useMutation({
    mutationFn: text => cardService.addChecklistItem(cardId, text),
    onSuccess:  () => { queryClient.invalidateQueries(['card', cardId]); setChecklistText(''); },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: itemId => cardService.toggleChecklistItem(cardId, itemId),
    onSuccess:  () => queryClient.invalidateQueries(['card', cardId]),
  });

  const moveChecklistMutation = useMutation({
    mutationFn: ({ itemId, targetCardId }) => cardService.moveChecklistItem(cardId, itemId, targetCardId),
    onSuccess: (_, { targetCardId }) => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['card', targetCardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setMoveTargets(p => { const n = { ...p }; delete n[_?.itemId]; return n; });
      toast.success(t('moveChecklistItemSuccess'));
    },
    onError: err => toast.error(err?.message || t('moveChecklistItemError')),
  });

  const aiChecklistMutation = useMutation({
    mutationFn: () => aiService.getChecklistSuggestions({ title: form.title, description: form.description }),
    onSuccess: res => { setAiChecklist(res?.checklist || []); toast.success(t('aiSuggestedCount', { count: res?.checklist?.length || 0 })); },
    onError:   err => toast.error(err?.message || t('aiChecklistFetchError')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => cardService.delete(cardId),
    onSuccess:  () => { queryClient.invalidateQueries(['board', boardId]); onClose(); },
  });

  const archiveMutation = useMutation({
    mutationFn: () => cardService.update(cardId, { isArchived: true }),
    onSuccess:  () => {
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(lang === 'vi' ? 'Đã lưu trữ card' : 'Card archived');
      onClose();
    },
  });

  /* ─── Update labels ─── */
  const handleLabelsUpdate = async (newLabels) => {
    await cardService.update(cardId, { labels: newLabels });
    queryClient.invalidateQueries(['card', cardId]);
    queryClient.invalidateQueries(['board', boardId]);
  };

  if (isLoading) return <div className="modal-overlay"><div style={{ color: 'white' }}>{t('loadingCard')}</div></div>;

  const labels    = card?.labels || [];
  const checklist = card?.checklist || [];
  const done      = checklist.filter(i => i.completed).length;
  const total     = checklist.length;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-modal w-full max-w-3xl p-4 sm:p-6"
        onClick={e => e.stopPropagation()}>

        {/* ─── Header ─── */}
        <header className="mb-5 flex items-start justify-between gap-4">
          {isEditing ? (
            <input className="input min-w-0 flex-1 text-lg font-semibold"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder={t('cardTitlePlaceholderModal')} />
          ) : (
            <div className="min-w-0 flex-1">
              <h2 className="heading-soft break-words text-2xl font-semibold">{card?.title}</h2>
              <p className="text-sm text-emerald-50/70 mt-1">{t('inListLabel', { name: card?.list?.name || 'N/A' })}</p>
            </div>
          )}
          <button onClick={onClose} className="shrink-0 text-xl leading-none text-emerald-50/60 hover:text-white" aria-label={t('close')}>✕</button>
        </header>

        {/* ─── Labels row ─── */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          {labels.map((raw, i) => <LabelChip key={i} raw={raw} />)}
          <LabelManager labels={labels} onUpdate={handleLabelsUpdate}
            trigger={
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 999, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.6)', fontSize: 12, cursor: 'pointer', transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.18)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}>
                🏷 {lang === 'vi' ? 'Nhãn' : 'Labels'}
              </span>
            } />
        </div>

        {/* ─── Assignees ─── */}
        <div className="mb-5">
          <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-3">
            {lang === 'vi' ? 'Thành viên được giao' : 'Assignees'}
          </h3>

          {loadingMembers ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
              {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
            </p>
          ) : wsMembers.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>
              {lang === 'vi'
                ? 'Workspace chưa có thành viên nào'
                : 'No workspace members found'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {wsMembers.map((member) => {
                const memberId   = member?._id || member;
                const memberName = member?.name  || String(memberId);
                const isAssigned = (card?.assignees || []).some(
                  (a) => (a?._id || a)?.toString() === memberId?.toString()
                );

                return (
                  <button
                    key={String(memberId)}
                    type="button"
                    onClick={() => handleToggleAssignee(memberId)}
                    title={isAssigned
                      ? (lang === 'vi' ? 'Bỏ giao việc' : 'Unassign')
                      : (lang === 'vi' ? 'Giao việc'    : 'Assign')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 10px', borderRadius: 999,
                      border: '1px solid',
                      borderColor: isAssigned
                        ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.12)',
                      background: isAssigned
                        ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.06)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {/* Avatar */}
                    {member?.avatar ? (
                      <img
                        src={member.avatar}
                        alt={memberName}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `hsl(${memberName.charCodeAt(0) * 17 % 360},60%,42%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {memberName[0].toUpperCase()}
                      </div>
                    )}

                    {/* Name */}
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: isAssigned ? '#6ee7b7' : 'rgba(255,255,255,.75)',
                      maxWidth: 120, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {memberName}
                    </span>

                    {/* Check icon nếu đã giao */}
                    {isAssigned && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M1.5 5.5L4 8L9.5 2.5"
                          stroke="#34d399" strokeWidth="1.6" strokeLinecap="round"
                          strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Due date ─── */}
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <DueDateBadge dueDate={card?.dueDate} isCompleted={card?.isCompleted} lang={lang} />
          {isEditing && (
            <input type="date" className="input w-auto" value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          )}
          {!isEditing && !card?.dueDate && (
            <button onClick={() => setIsEditing(true)}
              style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'none', border: '1px dashed rgba(255,255,255,.2)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}>
              + {lang === 'vi' ? 'Thêm hạn chót' : 'Add due date'}
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Description */}
          <section className="min-w-0 space-y-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">{t('description')}</h3>
            {isEditing ? (
              <textarea className="input min-h-[120px]" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={t('addDescription')} />
            ) : (
              <p className="text-emerald-50/80 bg-white/5 p-4 rounded-xl text-sm">
                {card?.description || <span style={{ color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>{t('noDescriptionYet')}</span>}
              </p>
            )}
          </section>

          {/* Quick actions */}
          <section className="space-y-2">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">{lang === 'vi' ? 'Thao tác' : 'Actions'}</h3>
            <div className="space-y-2">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm w-full text-left">
                  ✎ {t('editCard')}
                </button>
              ) : (
                <>
                  <button onClick={() => updateMutation.mutate({ title: form.title, description: form.description, dueDate: form.dueDate || null })}
                    className="btn btn-primary btn-sm w-full">{t('save')}</button>
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm w-full">{t('cancel')}</button>
                </>
              )}
              <button onClick={() => archiveMutation.mutate()} className="btn btn-secondary btn-sm w-full text-left"
                style={{ color: '#fbbf24' }}>
                📦 {lang === 'vi' ? 'Lưu trữ' : 'Archive'}
              </button>
              <button onClick={() => { if (window.confirm(lang === 'vi' ? 'Xoá card này?' : 'Delete this card?')) deleteMutation.mutate(); }}
                className="btn btn-danger btn-sm w-full text-left">
                🗑 {t('deleteCard')}
              </button>
            </div>
          </section>
        </div>

        {/* ─── Checklist ─── */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">{t('checklist')}</h3>
            {total > 0 && (
              <span style={{ fontSize: 11, color: progress === 100 ? '#4ade80' : 'rgba(255,255,255,.4)', fontWeight: 600 }}>
                {done}/{total} ({progress}%)
              </span>
            )}
          </div>

          {total > 0 && (
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.1)', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, borderRadius: 99, background: progress === 100 ? '#22c55e' : '#3b82f6', transition: 'width .3s' }} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => aiChecklistMutation.mutate()}
              disabled={aiChecklistMutation.isPending || !form.title.trim()}>
              {aiChecklistMutation.isPending ? t('aiSuggestingChecklist') : t('aiSuggestChecklist')}
            </button>
            {aiChecklist.length > 0 && (
              <button type="button" className="btn btn-primary btn-sm"
                onClick={async () => {
                  for (const item of aiChecklist) await cardService.addChecklistItem(cardId, item);
                  queryClient.invalidateQueries(['card', cardId]);
                  setAiChecklist([]);
                  toast.success(t('addedAiChecklistSuccess'));
                }}>
                {t('addAllSuggestions')}
              </button>
            )}
          </div>

          {aiChecklist.length > 0 && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
              {aiChecklist.map(item => <div key={item} className="text-sm text-emerald-50/80">• {item}</div>)}
            </div>
          )}

          <div className="space-y-2 mb-4">
            {checklist.map(item => {
              const isMoving = moveChecklistMutation.isPending && moveChecklistMutation.variables?.itemId === item._id;
              return (
                <div key={item._id} className="rounded-xl bg-white/5 p-3">
                  <label className="flex items-center gap-3 text-emerald-50/80 cursor-pointer">
                    <input type="checkbox" checked={item.completed}
                      onChange={() => toggleChecklistMutation.mutate(item._id)} />
                    <span className={`min-w-0 flex-1 break-words text-sm ${item.completed ? 'line-through text-emerald-50/40' : ''}`}>
                      {item.text}
                    </span>
                  </label>
                  {destinationCards.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <select className="input py-1 min-w-0 flex-1 text-xs"
                        value={moveTargets[item._id] || ''}
                        onChange={e => setMoveTargets(p => ({ ...p, [item._id]: e.target.value }))}>
                        <option value="">{t('moveToCardPlaceholder')}</option>
                        {destinationCards.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <button type="button" className="btn btn-secondary btn-sm"
                        disabled={!moveTargets[item._id] || isMoving}
                        onClick={() => moveChecklistMutation.mutate({ itemId: item._id, targetCardId: moveTargets[item._id] })}>
                        {isMoving ? t('movingChecklistItem') : t('moveChecklistItem')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {!checklist.length && <p className="text-sm text-emerald-50/40">{t('noChecklistItemsYet')}</p>}
          </div>

          <div className="flex gap-2">
            <input className="input min-w-0 flex-1" placeholder={t('addChecklistItemPlaceholder')}
              value={checklistText} onChange={e => setChecklistText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && checklistText.trim()) checklistMutation.mutate(checklistText.trim()); }} />
            <button className="btn btn-primary btn-sm shrink-0"
              onClick={() => checklistText.trim() && checklistMutation.mutate(checklistText.trim())}>
              {t('add')}
            </button>
          </div>
        </section>

        {/* ─── Comments ─── */}
        <section className="mt-6">
          <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-4">{t('activityComments')}</h3>
          <div className="space-y-3 mb-4">
            {card?.comments?.map(comment => (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 shrink-0 flex items-center justify-center text-white text-xs font-bold">
                  {(comment.user?.name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 rounded-xl bg-white/10 p-3">
                  <p className="text-sm font-semibold text-white">{comment.user?.name}</p>
                  <p className="break-words text-sm text-emerald-50/80 mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
          <textarea className="input w-full" placeholder={t('writeComment')} rows={2}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commentMutation.mutate(e.target.value);
                e.target.value = '';
              }
            }} />
        </section>
      </div>
    </div>
  );
}