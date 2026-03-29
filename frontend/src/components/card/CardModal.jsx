// frontend/src/components/card/CardModal.jsx
// ✅ Cover color picker  ✅ Duplicate card  ✅ Watch/unwatch
// ✅ Activity log        ✅ @mention in comments
// ✅ Fix comment textarea state  ✅ Confirm before archive

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cardService  from '@services/cardService';
import boardService from '@services/boardService';
import aiService    from '@services/aiService';
import { useUiStore } from '@store/uiStore';
import { useAuthStore } from '@store/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';
import LabelManager, { LabelChip } from '@components/board/LabelManager';
import DueDateBadge from '@components/board/DueDateBadge';
import apiClient from '@config/api';

const COVER_COLORS = [
  null,
  '#ef4444','#f97316','#eab308','#22c55e',
  '#14b8a6','#3b82f6','#8b5cf6','#ec4899',
  '#64748b','#0f172a',
];

const ACTION_LABEL = {
  vi: {
    card_created:'đã tạo card', card_updated:'đã cập nhật', card_deleted:'đã xoá',
    card_moved:'đã di chuyển', card_archived:'đã lưu trữ', card_restored:'đã khôi phục',
    card_completed:'đã hoàn thành', comment_added:'đã bình luận',
    checklist_item_added:'đã thêm checklist', checklist_item_completed:'đã tick checklist',
    checklist_item_moved:'đã chuyển checklist', attachment_added:'đã đính kèm file',
    attachment_removed:'đã xoá đính kèm', due_date_changed:'đã đổi hạn chót',
    label_added:'đã thêm nhãn', label_removed:'đã xoá nhãn',
    member_assigned:'đã giao card', member_unassigned:'đã bỏ giao',
  },
  en: {
    card_created:'created card', card_updated:'updated', card_deleted:'deleted',
    card_moved:'moved', card_archived:'archived', card_restored:'restored',
    card_completed:'completed', comment_added:'commented',
    checklist_item_added:'added checklist item', checklist_item_completed:'ticked checklist',
    checklist_item_moved:'moved checklist item', attachment_added:'attached file',
    attachment_removed:'removed attachment', due_date_changed:'changed due date',
    label_added:'added label', label_removed:'removed label',
    member_assigned:'assigned card', member_unassigned:'unassigned',
  },
};

function timeAgo(d, lang = 'vi') {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return lang === 'vi' ? 'vừa xong' : 'just now';
  if (m < 60) return lang === 'vi' ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'vi' ? `${h} giờ trước` : `${h}h ago`;
  return lang === 'vi' ? `${Math.floor(h/24)} ngày trước` : `${Math.floor(h/24)}d ago`;
}

function CommentText({ content }) {
  const parts = content.split(/(@[\w\s]+?(?=\s|$|[^a-zA-Z\s]))/g);
  return (
    <p className="break-words text-sm text-emerald-50/80 mt-1">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} style={{ color: '#60a5fa', fontWeight: 600 }}>{part}</span>
        ) : part
      )}
    </p>
  );
}

export default function CardModal({ cardId, boardId, onClose }) {
  const queryClient = useQueryClient();
  const { t }  = useTranslation();
  const lang   = useUiStore(s => s.language) || 'vi';
  const me     = useAuthStore(s => s.user);

  const [isEditing,       setIsEditing]       = useState(false);
  const [form,            setForm]            = useState({ title: '', description: '', dueDate: '' });
  const [checklistText,   setChecklistText]   = useState('');
  const [aiChecklist,     setAiChecklist]     = useState([]);
  const [moveTargets,     setMoveTargets]     = useState({});
  const [wsMembers,       setWsMembers]       = useState([]);
  const [loadingMembers,  setLoadingMembers]  = useState(false);
  const [uploadingFile,   setUploadingFile]   = useState(false);
  const [activeTab,       setActiveTab]       = useState('comments');
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Comment edit state
  const [editingCommentId,   setEditingCommentId]   = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Comment with @mention
  const [commentText,   setCommentText]   = useState('');
  const [mentionQuery,  setMentionQuery]  = useState('');
  const [showMentions,  setShowMentions]  = useState(false);
  const [mentionCursor, setMentionCursor] = useState(0);
  const commentRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: card, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn:  () => cardService.getDetails(cardId),
  });

  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn:  () => boardService.getBoardDetails(boardId),
    enabled:  !!boardId,
  });

  const { data: activityList = [] } = useQuery({
    queryKey: ['cardActivity', cardId],
    queryFn:  () => cardService.getActivity(cardId),
    enabled:  activeTab === 'activity',
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
      title:       card.title || '',
      description: card.description || '',
      dueDate:     card.dueDate ? card.dueDate.slice(0, 10) : '',
    });
  }, [card]);

  useEffect(() => {
    if (!boardId) return;
    setLoadingMembers(true);
    boardService.getBoardDetails(boardId)
      .then(async (boardRes) => {
        const bd = boardRes?.data ?? boardRes;
        const workspaceId = bd?.workspace?._id || bd?.workspace;
        if (!workspaceId) return setWsMembers([]);
        const wsRes = await apiClient.get(`/workspaces/${workspaceId}`);
        const ws    = wsRes?.data ?? wsRes;
        const ownerId = (ws.owner?._id || ws.owner)?.toString();
        const others  = (ws.members || [])
          .filter(m => (m.user?._id || m.user)?.toString() !== ownerId)
          .map(m => m.user).filter(Boolean);
        const merged = [ws.owner, ...others].filter(Boolean);
        const seen   = new Set();
        setWsMembers(merged.filter(u => { const id = (u?._id || u)?.toString(); if (!id || seen.has(id)) return false; seen.add(id); return true; }));
      })
      .catch(() => setWsMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [boardId]);

  const mentionSuggestions = useMemo(() =>
    !mentionQuery ? [] :
    wsMembers.filter(m => (m?.name || '').toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6),
  [wsMembers, mentionQuery]);

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const cur = e.target.selectionStart;
    const before = val.slice(0, cur);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setMentionCursor(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (member) => {
    const name = member?.name || '';
    const cur = commentRef.current?.selectionStart || commentText.length;
    const before = commentText.slice(0, cur);
    const after  = commentText.slice(cur);
    const replaced = before.replace(/@(\w*)$/, `@${name} `);
    setCommentText(replaced + after);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => commentRef.current?.focus(), 0);
  };

  const handleCommentKeyDown = (e) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionCursor(c => Math.min(c+1, mentionSuggestions.length-1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionCursor(c => Math.max(c-1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); insertMention(mentionSuggestions[mentionCursor]); return; }
      if (e.key === 'Escape')    { setShowMentions(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      if (commentText.trim()) submitComment();
    }
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
    setCommentText('');
  };

  const handleToggleAssignee = async (userId) => {
    const currentIds = card?.assignees?.map(a => a._id || a) || [];
    const isAssigned = currentIds.some(id => id?.toString() === userId?.toString());
    const newAssignees = isAssigned
      ? currentIds.filter(id => id?.toString() !== userId?.toString())
      : [...currentIds, userId];
    await cardService.update(cardId, { assignees: newAssignees });
    queryClient.invalidateQueries(['card', cardId]);
    queryClient.invalidateQueries(['board', boardId]);
  };

  const updateMutation = useMutation({
    mutationFn: (updates) => cardService.update(cardId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setIsEditing(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content) => cardService.addComment(cardId, { content, boardId }),
    onSuccess:  () => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['cardActivity', cardId]);
    },
  });

  const checklistMutation = useMutation({
    mutationFn: (text) => cardService.addChecklistItem(cardId, text),
    onSuccess:  () => { queryClient.invalidateQueries(['card', cardId]); setChecklistText(''); },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: (itemId) => cardService.toggleChecklistItem(cardId, itemId),
    onSuccess:  () => queryClient.invalidateQueries(['card', cardId]),
  });

  const moveChecklistMutation = useMutation({
    mutationFn: ({ itemId, targetCardId }) => cardService.moveChecklistItem(cardId, itemId, targetCardId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['card', vars.targetCardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setMoveTargets(p => { const n = { ...p }; delete n[vars.itemId]; return n; });
      toast.success(t('moveChecklistItemSuccess'));
    },
    onError: err => toast.error(err?.message || t('moveChecklistItemError')),
  });

  const aiChecklistMutation = useMutation({
    mutationFn: () => aiService.getChecklistSuggestions({ title: form.title, description: form.description, language: lang }),
    onSuccess: res => { setAiChecklist(res?.checklist || []); toast.success(t('aiSuggestedCount', { count: res?.checklist?.length || 0 })); },
    onError:   err => toast.error(err?.message || t('aiChecklistFetchError')),
  });

  const archiveMutation = useMutation({
    mutationFn: () => cardService.update(cardId, { isArchived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['board', boardId]);
      queryClient.invalidateQueries(['archivedCards', boardId]);
      toast.success(lang === 'vi' ? 'Đã lưu trữ card' : 'Card archived');
      onClose();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => cardService.duplicate(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(lang === 'vi' ? 'Đã sao chép card' : 'Card duplicated');
      onClose();
    },
    onError: () => toast.error(lang === 'vi' ? 'Không thể sao chép card' : 'Could not duplicate'),
  });

  const watchMutation = useMutation({
    mutationFn: () => cardService.toggleWatch(cardId),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(res?.isWatching
        ? (lang === 'vi' ? 'Đang theo dõi card' : 'Watching card')
        : (lang === 'vi' ? 'Đã bỏ theo dõi' : 'Unwatched card'));
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }) => cardService.updateComment(cardId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
      setEditingCommentId(null);
      setEditingCommentText('');
    },
    onError: (err) => toast.error(err?.message || (lang === 'vi' ? 'Không thể sửa bình luận' : 'Could not edit comment')),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => cardService.deleteComment(cardId, commentId),
    onSuccess: () => queryClient.invalidateQueries(['card', cardId]),
    onError: (err) => toast.error(err?.message || (lang === 'vi' ? 'Không thể xoá bình luận' : 'Could not delete comment')),
  });

  const coverMutation = useMutation({
    mutationFn: (color) => cardService.update(cardId, { cover: { color } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setShowCoverPicker(false);
    },
  });

  const handleLabelsUpdate = async (newLabels) => {
    await cardService.update(cardId, { labels: newLabels });
    queryClient.invalidateQueries(['card', cardId]);
    queryClient.invalidateQueries(['board', boardId]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(lang === 'vi' ? 'File tối đa 5MB' : 'Max 5MB'); return; }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/cards/${cardId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      queryClient.invalidateQueries(['card', cardId]);
      toast.success(lang === 'vi' ? 'Đã đính kèm file!' : 'File attached!');
    } catch (err) {
      toast.error(err?.message || (lang === 'vi' ? 'Upload thất bại' : 'Upload failed'));
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm(lang === 'vi' ? 'Xoá file này?' : 'Delete attachment?')) return;
    try {
      await apiClient.delete(`/cards/${cardId}/attachments/${attachmentId}`);
      queryClient.invalidateQueries(['card', cardId]);
      toast.success(lang === 'vi' ? 'Đã xoá file' : 'Deleted');
    } catch (err) {
      toast.error(err?.message || (lang === 'vi' ? 'Xoá thất bại' : 'Failed'));
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  const handleArchive = () => {
    const msg = lang === 'vi'
      ? 'Lưu trữ card này? Card sẽ bị ẩn khỏi board (có thể khôi phục sau).'
      : 'Archive this card? It will be hidden from the board (can be restored later).';
    if (!window.confirm(msg)) return;
    archiveMutation.mutate();
  };

  if (isLoading) return <div className="modal-overlay"><div style={{ color: 'white' }}>{t('loadingCard')}</div></div>;

  const labels      = card?.labels || [];
  const checklist   = card?.checklist || [];
  const done        = checklist.filter(i => i.completed).length;
  const total       = checklist.length;
  const progress    = total > 0 ? Math.round((done / total) * 100) : 0;
  const attachments = card?.attachments || [];
  const coverColor  = card?.cover?.color;
  const isWatching  = (card?.watchers || []).some(w => (w?._id || w)?.toString() === me?._id?.toString());
  const actLabels   = ACTION_LABEL[lang] || ACTION_LABEL.vi;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-modal w-full max-w-3xl p-0 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Cover color bar */}
        {coverColor && (
          <div style={{ height: 40, background: coverColor, position: 'relative', flexShrink: 0 }}>
            <button type="button" onClick={() => setShowCoverPicker(v => !v)}
              style={{ position:'absolute', bottom:6, right:12, fontSize:10, padding:'2px 8px', borderRadius:6, border:'none', background:'rgba(0,0,0,.35)', color:'white', cursor:'pointer' }}>
              {lang === 'vi' ? 'Đổi màu' : 'Change cover'}
            </button>
          </div>
        )}

        <div style={{ padding: '20px 24px 24px', overflowY: 'auto', maxHeight: coverColor ? 'calc(90vh - 40px)' : '90vh' }}>

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
            <button onClick={onClose} className="shrink-0 text-xl leading-none text-emerald-50/60 hover:text-white">✕</button>
          </header>

          {/* ─── Labels ─── */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {labels.map((raw, i) => <LabelChip key={i} raw={raw} />)}
            <LabelManager labels={labels} onUpdate={handleLabelsUpdate}
              trigger={
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.6)', fontSize:12, cursor:'pointer' }}>
                  🏷 {lang==='vi'?'Nhãn':'Labels'}
                </span>
              } />
          </div>

          {/* ─── Assignees ─── */}
          <div className="mb-5">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-3">{lang==='vi'?'Thành viên được giao':'Assignees'}</h3>
            {loadingMembers ? (
              <p style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{lang==='vi'?'Đang tải...':'Loading...'}</p>
            ) : wsMembers.length === 0 ? (
              <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', fontStyle:'italic' }}>{lang==='vi'?'Chưa có thành viên':'No members'}</p>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {wsMembers.map(member => {
                  const memberId   = member?._id || member;
                  const memberName = member?.name || String(memberId);
                  const isAssigned = (card?.assignees || []).some(a => (a?._id || a)?.toString() === memberId?.toString());
                  return (
                    <button key={String(memberId)} type="button" onClick={() => handleToggleAssignee(memberId)}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px', borderRadius:999, border:'1px solid', borderColor: isAssigned?'rgba(52,211,153,.5)':'rgba(255,255,255,.12)', background: isAssigned?'rgba(52,211,153,.15)':'rgba(255,255,255,.06)', cursor:'pointer' }}>
                      {member?.avatar
                        ? <img src={member.avatar} alt={memberName} style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover' }} />
                        : <div style={{ width:22, height:22, borderRadius:'50%', background:`hsl(${memberName.charCodeAt(0)*17%360},60%,42%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>{memberName[0].toUpperCase()}</div>
                      }
                      <span style={{ fontSize:12, fontWeight:500, color: isAssigned?'#6ee7b7':'rgba(255,255,255,.75)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{memberName}</span>
                      {isAssigned && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5L4 8L9.5 2.5" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Status & Due date ─── */}
          <div className="mb-5 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer rounded bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-50 border border-emerald-500/30 transition hover:bg-emerald-500/30">
              <input type="checkbox" checked={card?.isCompleted || false}
                onChange={e => updateMutation.mutate({ isCompleted: e.target.checked })}
                className="accent-emerald-500 w-4 h-4 cursor-pointer" />
              <span style={{ fontSize:13, fontWeight:600 }}>{lang==='vi'?'Đã hoàn thành':'Completed'}</span>
            </label>
            <DueDateBadge dueDate={card?.dueDate} isCompleted={card?.isCompleted} lang={lang} />
            {isEditing && (
              <input type="date" className="input w-auto" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            )}
            {!isEditing && !card?.dueDate && (
              <button onClick={() => setIsEditing(true)}
                style={{ fontSize:11, color:'rgba(255,255,255,.4)', background:'none', border:'1px dashed rgba(255,255,255,.2)', borderRadius:999, padding:'3px 10px', cursor:'pointer' }}>
                + {lang==='vi'?'Thêm hạn chót':'Add due date'}
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
                  {card?.description || <span style={{ color:'rgba(255,255,255,.3)', fontStyle:'italic' }}>{t('noDescriptionYet')}</span>}
                </p>
              )}
            </section>

            {/* Quick actions */}
            <section className="space-y-2">
              <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">{lang==='vi'?'Thao tác':'Actions'}</h3>
              <div className="space-y-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm w-full text-left">✎ {t('editCard')}</button>
                ) : (
                  <>
                    <button onClick={() => updateMutation.mutate({ title: form.title, description: form.description, dueDate: form.dueDate || null })}
                      className="btn btn-primary btn-sm w-full">{t('save')}</button>
                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm w-full">{t('cancel')}</button>
                  </>
                )}

                {/* Cover color picker */}
                <div style={{ position:'relative' }}>
                  <button onClick={() => setShowCoverPicker(v => !v)}
                    className="btn btn-secondary btn-sm w-full text-left"
                    style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:14, height:14, borderRadius:4, background: coverColor || 'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.2)', flexShrink:0, display:'inline-block' }} />
                    {lang==='vi'?'Màu bìa':'Cover color'}
                  </button>
                  {showCoverPicker && (
                    <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:9999, background:'rgba(13,22,41,.98)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:12, display:'flex', flexWrap:'wrap', gap:6, width:184 }}>
                      {COVER_COLORS.map((c, i) => (
                        <button key={i} type="button" onClick={() => coverMutation.mutate(c)}
                          style={{ width:30, height:30, borderRadius:8, background: c || 'rgba(255,255,255,.08)', border: coverColor===c?'2px solid white':'1px solid rgba(255,255,255,.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {!c && <span style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>✕</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duplicate */}
                <button onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}
                  className="btn btn-secondary btn-sm w-full text-left">
                  📋 {lang==='vi'?'Sao chép card':'Duplicate'}
                </button>

                {/* Watch */}
                <button onClick={() => watchMutation.mutate()} disabled={watchMutation.isPending}
                  className="btn btn-secondary btn-sm w-full text-left"
                  style={{ color: isWatching ? '#6ee7b7' : undefined }}>
                  👁 {isWatching ? (lang==='vi'?'Đang theo dõi':'Watching') : (lang==='vi'?'Theo dõi':'Watch')}
                </button>

                {/* Archive */}
                <button onClick={handleArchive} className="btn btn-secondary btn-sm w-full text-left" style={{ color:'#fbbf24' }}>
                  📦 {lang==='vi'?'Lưu trữ':'Archive'}
                </button>

                {/* Attach file */}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={handleFileUpload} />
                  <button type="button" className="btn btn-secondary btn-sm w-full text-left"
                    onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={{ fontSize:12 }}>
                    {uploadingFile ? (lang==='vi'?'Đang tải...':'Uploading...') : (lang==='vi'?'+ Đính kèm file':'+ Attach file')}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ─── Attachments ─── */}
          {attachments.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-3">
                {lang==='vi'?'Đính kèm':'Attachments'}
                <span style={{ marginLeft:6, padding:'1px 7px', borderRadius:999, background:'rgba(255,255,255,.1)', fontSize:10 }}>{attachments.length}</span>
              </h3>
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)' }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{getFileIcon(att.type)}</span>
                    <a href={att.url} target="_blank" rel="noreferrer"
                      style={{ flex:1, minWidth:0, color:'#60a5fa', fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:'none' }}>
                      {att.name}
                    </a>
                    <button type="button" onClick={() => handleDeleteAttachment(att._id)}
                      style={{ width:24, height:24, borderRadius:'50%', border:'none', background:'rgba(239,68,68,.2)', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Checklist ─── */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">{t('checklist')}</h3>
              {total > 0 && (
                <span style={{ fontSize:11, color: progress===100?'#4ade80':'rgba(255,255,255,.4)', fontWeight:600 }}>
                  {done}/{total} ({progress}%)
                </span>
              )}
            </div>
            {total > 0 && (
              <div style={{ height:5, borderRadius:99, background:'rgba(255,255,255,.1)', marginBottom:12, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, borderRadius:99, background: progress===100?'#22c55e':'#3b82f6', transition:'width .3s' }} />
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
                    for (const item of aiChecklist.filter(i => i.trim())) await cardService.addChecklistItem(cardId, item);
                    queryClient.invalidateQueries(['card', cardId]);
                    setAiChecklist([]);
                    toast.success(t('addedAiChecklistSuccess'));
                  }}>
                  {t('addAllSuggestions')}
                </button>
              )}
            </div>
            {aiChecklist.length > 0 && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="text-xs text-emerald-100/60 mb-2">{lang==='vi'?'Chỉnh sửa trước khi thêm:':'Edit before adding:'}</div>
                {aiChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-emerald-50/50">•</span>
                    <input className="input min-w-0 flex-1 py-1 text-sm bg-black/20 border-transparent" value={item}
                      onChange={e => { const n=[...aiChecklist]; n[idx]=e.target.value; setAiChecklist(n); }} />
                    <button type="button" className="text-red-400 px-2" onClick={() => setAiChecklist(aiChecklist.filter((_,i)=>i!==idx))}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 mb-4">
              {checklist.map(item => {
                const isMoving = moveChecklistMutation.isPending && moveChecklistMutation.variables?.itemId === item._id;
                return (
                  <div key={item._id} className="rounded-xl bg-white/5 p-3">
                    <label className="flex items-center gap-3 text-emerald-50/80 cursor-pointer">
                      <input type="checkbox" checked={item.completed} onChange={() => toggleChecklistMutation.mutate(item._id)} />
                      <span className={`min-w-0 flex-1 break-words text-sm ${item.completed?'line-through text-emerald-50/40':''}`}>{item.text}</span>
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
                onKeyDown={e => { if (e.key==='Enter' && checklistText.trim()) checklistMutation.mutate(checklistText.trim()); }} />
              <button className="btn btn-primary btn-sm shrink-0"
                onClick={() => checklistText.trim() && checklistMutation.mutate(checklistText.trim())}>
                {t('add')}
              </button>
            </div>
          </section>

          {/* ─── Tabs: Comments | Activity ─── */}
          <section className="mt-6">
            <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.08)', marginBottom:16 }}>
              {[['comments', lang==='vi'?'Bình luận':'Comments'], ['activity', lang==='vi'?'Hoạt động':'Activity']].map(([tab, label]) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  style={{ padding:'6px 16px', fontSize:12, fontWeight:600, color: activeTab===tab?'#6ee7b7':'rgba(255,255,255,.45)', background:'none', border:'none', borderBottom: activeTab===tab?'2px solid #6ee7b7':'2px solid transparent', cursor:'pointer', marginBottom:-1, textTransform:'uppercase', letterSpacing:'.06em' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* COMMENTS TAB */}
            {activeTab === 'comments' && (
              <>
                <div className="space-y-3 mb-4">
                  {(card?.comments || []).map(comment => {
                    const isOwn = comment.user?._id?.toString() === me?._id?.toString()
                      || comment.user?.toString() === me?._id?.toString();
                    const isEditing = editingCommentId === comment._id;
                    return (
                      <div key={comment._id} className="flex gap-3">
                        <div style={{ width:32, height:32, borderRadius:'50%', background:`hsl(${((comment.user?.name||'?').charCodeAt(0)*17)%360},60%,42%)`, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {(comment.user?.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 rounded-xl bg-white/10 p-3">
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <p className="text-sm font-semibold text-white" style={{ margin:0 }}>{comment.user?.name}</p>
                              <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{timeAgo(comment.createdAt, lang)}</span>
                              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                <span style={{ fontSize:10, color:'rgba(255,255,255,.25)', fontStyle:'italic' }}>
                                  {lang === 'vi' ? '(đã sửa)' : '(edited)'}
                                </span>
                              )}
                            </div>
                            {isOwn && !isEditing && (
                              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                                <button type="button"
                                  onClick={() => { setEditingCommentId(comment._id); setEditingCommentText(comment.content); }}
                                  style={{ fontSize:10, color:'rgba(255,255,255,.4)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:6, transition:'color .15s' }}
                                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,.8)'}
                                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,.4)'}>
                                  {lang === 'vi' ? 'Sửa' : 'Edit'}
                                </button>
                                <button type="button"
                                  onClick={() => {
                                    if (!window.confirm(lang === 'vi' ? 'Xoá bình luận này?' : 'Delete this comment?')) return;
                                    deleteCommentMutation.mutate(comment._id);
                                  }}
                                  style={{ fontSize:10, color:'rgba(248,113,113,.5)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:6, transition:'color .15s' }}
                                  onMouseEnter={e => e.target.style.color='#f87171'}
                                  onMouseLeave={e => e.target.style.color='rgba(248,113,113,.5)'}>
                                  {lang === 'vi' ? 'Xoá' : 'Delete'}
                                </button>
                              </div>
                            )}
                          </div>
                          {isEditing ? (
                            <div style={{ marginTop:8 }}>
                              <textarea
                                className="input w-full"
                                rows={2}
                                value={editingCommentText}
                                onChange={e => setEditingCommentText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editingCommentText.trim()) updateCommentMutation.mutate({ commentId: comment._id, content: editingCommentText }); }
                                  if (e.key === 'Escape') { setEditingCommentId(null); setEditingCommentText(''); }
                                }}
                                autoFocus
                              />
                              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                                <button type="button" className="btn btn-primary btn-sm"
                                  disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
                                  onClick={() => updateCommentMutation.mutate({ commentId: comment._id, content: editingCommentText })}>
                                  {lang === 'vi' ? 'Lưu' : 'Save'}
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm"
                                  onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}>
                                  {lang === 'vi' ? 'Huỷ' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <CommentText content={comment.content} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comment input with @mention */}
                <div style={{ position:'relative' }}>
                  <textarea ref={commentRef} className="input w-full"
                    placeholder={lang==='vi'?'Viết bình luận... (@ để mention thành viên)':'Write a comment... (@ to mention)'}
                    rows={2} value={commentText}
                    onChange={handleCommentChange} onKeyDown={handleCommentKeyDown} />
                  {commentText.trim() && (
                    <button type="button" className="btn btn-primary btn-sm mt-2" onClick={submitComment}>
                      {lang==='vi'?'Gửi':'Send'}
                    </button>
                  )}
                  {/* @mention dropdown */}
                  {showMentions && mentionSuggestions.length > 0 && (
                    <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:0, zIndex:9999, background:'rgba(13,22,41,.98)', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, overflow:'hidden', minWidth:180, boxShadow:'0 8px 24px rgba(0,0,0,.4)' }}>
                      {mentionSuggestions.map((m, i) => (
                        <button key={m?._id || i} type="button"
                          onPointerDown={e => { e.preventDefault(); insertMention(m); }}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', width:'100%', border:'none', background: i===mentionCursor?'rgba(255,255,255,.1)':'transparent', color:'rgba(255,255,255,.85)', cursor:'pointer', fontSize:13, textAlign:'left' }}>
                          <div style={{ width:24, height:24, borderRadius:'50%', background:`hsl(${(m?.name||'').charCodeAt(0)*17%360},60%,42%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>
                            {(m?.name||'?')[0].toUpperCase()}
                          </div>
                          {m?.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                {activityList.length === 0 ? (
                  <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', fontStyle:'italic' }}>
                    {lang==='vi'?'Chưa có hoạt động nào.':'No activity yet.'}
                  </p>
                ) : activityList.map(act => (
                  <div key={act._id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:`hsl(${(act.actor?.name||'U').charCodeAt(0)*17%360},60%,42%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>
                      {(act.actor?.name||'U')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,.75)', margin:0, lineHeight:1.5 }}>
                        <span style={{ fontWeight:600, color:'white' }}>{act.actor?.name||'?'}</span>
                        {' '}
                        <span style={{ color:'rgba(167,243,208,.7)' }}>{actLabels[act.action] || act.action}</span>
                      </p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', margin:'2px 0 0' }}>{timeAgo(act.createdAt, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
