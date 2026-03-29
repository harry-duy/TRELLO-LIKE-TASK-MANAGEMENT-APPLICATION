// frontend/src/components/card/CardModal.jsx
// ✅ Thêm: upload attachment, xoá attachment
// ✅ Đã có: LabelManager, DueDateBadge, Archive, Checklist progress, Assignees

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cardService  from '@services/cardService';
import boardService from '@services/boardService';
import { useUiStore } from '@store/uiStore';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';
import LabelManager, { LabelChip } from '@components/board/LabelManager';
import DueDateBadge from '@components/board/DueDateBadge';
import apiClient from '@config/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function CardModal({ cardId, boardId, onClose }) {
  const queryClient = useQueryClient();
  const { t }  = useTranslation();
  const lang   = useUiStore(s => s.language) || 'vi';

  const [isEditing,       setIsEditing]       = useState(false);
  const [form,            setForm]            = useState({ title: '', description: '', dueDate: '' });
  const [checklistText,   setChecklistText]   = useState('');
  const [moveTargets,     setMoveTargets]     = useState({});
  const [wsMembers,       setWsMembers]       = useState([]);
  const [loadingMembers,  setLoadingMembers]  = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [uploadingFile,   setUploadingFile]   = useState(false);
  const fileInputRef = useRef(null);
  const assigneePickerRef = useRef(null);

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
      title:       card.title || '',
      description: card.description || '',
      dueDate:     card.dueDate ? card.dueDate.slice(0, 10) : '',
    });
  }, [card]);

  // Load workspace members
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

  useEffect(() => {
    if (!showAssigneePicker) return undefined;

    const handleClickOutside = (event) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(event.target)) {
        setShowAssigneePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssigneePicker]);

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
    onSuccess:  () => queryClient.invalidateQueries(['card', cardId]),
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
    onSuccess: (_, { targetCardId }) => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['card', targetCardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setMoveTargets(p => { const n = { ...p }; delete n[_?.itemId]; return n; });
      toast.success(t('moveChecklistItemSuccess'));
    },
    onError: err => toast.error(err?.message || t('moveChecklistItemError')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => cardService.delete(cardId),
    onSuccess:  () => { queryClient.invalidateQueries(['board', boardId]); onClose(); },
  });

  const archiveMutation = useMutation({
    mutationFn: () => cardService.update(cardId, { isArchived: true }),
    onSuccess:  () => { queryClient.invalidateQueries(['board', boardId]); toast.success(lang === 'vi' ? 'Đã lưu trữ card' : 'Card archived'); onClose(); },
  });

  const handleLabelsUpdate = async (newLabels) => {
    await cardService.update(cardId, { labels: newLabels });
    queryClient.invalidateQueries(['card', cardId]);
    queryClient.invalidateQueries(['board', boardId]);
  };

  // ── File upload ──────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(lang === 'vi' ? 'File tối đa 5MB' : 'Max file size is 5MB'); return; }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/cards/${cardId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries(['card', cardId]);
      toast.success(lang === 'vi' ? 'Đã đính kèm file!' : 'File attached!');
    } catch (err) {
      toast.error(err?.message || (lang === 'vi' ? 'Upload thất bại' : 'Upload failed'));
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm(lang === 'vi' ? 'Xoá file này?' : 'Delete this attachment?')) return;
    try {
      await apiClient.delete(`/cards/${cardId}/attachments/${attachmentId}`);
      queryClient.invalidateQueries(['card', cardId]);
      toast.success(lang === 'vi' ? 'Đã xoá file' : 'Attachment deleted');
    } catch (err) {
      toast.error(err?.message || (lang === 'vi' ? 'Xoá thất bại' : 'Delete failed'));
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  if (isLoading) return <div className="modal-overlay"><div style={{ color: 'white' }}>{t('loadingCard')}</div></div>;

  const labels    = card?.labels || [];
  const checklist = card?.checklist || [];
  const done      = checklist.filter(i => i.completed).length;
  const total     = checklist.length;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;
  const attachments = card?.attachments || [];
  const assignedIds = new Set((card?.assignees || []).map((a) => (a?._id || a)?.toString()).filter(Boolean));
  const assignedMembers = wsMembers.filter((member) => assignedIds.has((member?._id || member)?.toString()));

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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)', fontSize: 12, cursor: 'pointer' }}>
                🏷 {lang === 'vi' ? 'Nhãn' : 'Labels'}
              </span>
            } />
        </div>

        {/* ─── Assignees ─── */}
        <div className="mb-5">
          <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-3">{lang === 'vi' ? 'Thành viên được giao' : 'Assignees'}</h3>
          {loadingMembers ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{lang === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
          ) : wsMembers.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>{lang === 'vi' ? 'Chưa có thành viên' : 'No members'}</p>
          ) : (
            <div style={{ position: 'relative' }} ref={assigneePickerRef}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {assignedMembers.map((member) => {
                const memberId   = member?._id || member;
                const memberName = member?.name || String(memberId);
                return (
                  <button key={String(memberId)} type="button" onClick={() => handleToggleAssignee(memberId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(52,211,153,.5)', background: 'rgba(52,211,153,.15)', cursor: 'pointer' }}>
                    {member?.avatar ? (
                      <img src={member.avatar} alt={memberName} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `hsl(${memberName.charCodeAt(0)*17%360},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {memberName[0].toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#6ee7b7', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {memberName}
                    </span>
                  </button>
                );
              })}

                <button
                  type="button"
                  onClick={() => setShowAssigneePicker((prev) => !prev)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '999px',
                    border: '1px dashed rgba(255,255,255,.2)',
                    background: showAssigneePicker ? 'rgba(52,211,153,.18)' : 'rgba(255,255,255,.05)',
                    color: showAssigneePicker ? '#6ee7b7' : 'rgba(255,255,255,.7)',
                    fontSize: 20,
                    lineHeight: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  aria-label={lang === 'vi' ? 'Chọn thành viên phụ trách' : 'Pick assignees'}
                  title={lang === 'vi' ? 'Chọn thành viên phụ trách' : 'Pick assignees'}
                >
                  +
                </button>
              </div>

              {assignedMembers.length === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontStyle: 'italic', marginTop: 10 }}>
                  {lang === 'vi' ? 'Chưa giao cho ai. Bấm dấu cộng để chọn người phụ trách.' : 'No assignees yet. Click plus to pick people.'}
                </p>
              )}

              {showAssigneePicker && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: 0,
                  width: 'min(360px, 100%)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,.12)',
                  background: 'linear-gradient(160deg,rgba(13,21,38,.98),rgba(8,28,24,.98))',
                  boxShadow: '0 18px 40px rgba(0,0,0,.45)',
                  padding: 12,
                  zIndex: 30,
                }}>
                  <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(167,243,208,.7)' }}>
                    {lang === 'vi' ? 'Chọn người phụ trách' : 'Pick assignees'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {wsMembers.map((member) => {
                      const memberId   = member?._id || member;
                      const memberName = member?.name || String(memberId);
                      const isAssigned = assignedIds.has(memberId?.toString());
                      return (
                        <button
                          key={`picker-${String(memberId)}`}
                          type="button"
                          onClick={() => handleToggleAssignee(memberId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 12,
                            border: '1px solid',
                            borderColor: isAssigned ? 'rgba(52,211,153,.45)' : 'rgba(255,255,255,.08)',
                            background: isAssigned ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.04)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {member?.avatar ? (
                            <img src={member.avatar} alt={memberName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${memberName.charCodeAt(0)*17%360},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                              {memberName[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {memberName}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {member?.email || ''}
                            </div>
                          </div>
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `1px solid ${isAssigned ? 'rgba(52,211,153,.8)' : 'rgba(255,255,255,.2)'}`,
                            background: isAssigned ? '#34d399' : 'transparent',
                            color: isAssigned ? '#042f2e' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 12,
                            fontWeight: 700,
                          }}>
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Status & Due date ─── */}
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer rounded bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-50 border border-emerald-500/30 transition hover:bg-emerald-500/30">
            <input
              type="checkbox"
              checked={card?.isCompleted || false}
              onChange={(e) => updateMutation.mutate({ isCompleted: e.target.checked })}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'vi' ? 'Đã hoàn thành' : 'Completed'}</span>
          </label>
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
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm w-full text-left">✎ {t('editCard')}</button>
              ) : (
                <>
                  <button onClick={() => updateMutation.mutate({ title: form.title, description: form.description, dueDate: form.dueDate || null })}
                    className="btn btn-primary btn-sm w-full">{t('save')}</button>
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm w-full">{t('cancel')}</button>
                </>
              )}
              <button onClick={() => archiveMutation.mutate()} className="btn btn-secondary btn-sm w-full text-left" style={{ color: '#fbbf24' }}>
                📦 {lang === 'vi' ? 'Lưu trữ' : 'Archive'}
              </button>
              <button onClick={() => { if (window.confirm(lang === 'vi' ? 'Xoá card này?' : 'Delete this card?')) deleteMutation.mutate(); }}
                className="btn btn-danger btn-sm w-full text-left">
                🗑 {t('deleteCard')}
              </button>
            </div>
          </section>
        </div>

        {/* ─── Attachments ─── */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">
              {lang === 'vi' ? 'Đính kèm' : 'Attachments'}
              {attachments.length > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 999, background: 'rgba(255,255,255,.1)', fontSize: 10 }}>
                  {attachments.length}
                </span>
              )}
            </h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                style={{ fontSize: 12 }}
              >
                {uploadingFile
                  ? (lang === 'vi' ? 'Đang tải...' : 'Uploading...')
                  : (lang === 'vi' ? '+ Đính kèm file' : '+ Attach file')
                }
              </button>
            </div>
          </div>

          {attachments.length === 0 ? (
            <p className="text-sm text-emerald-50/40 italic">
              {lang === 'vi' ? 'Chưa có file đính kèm. Hỗ trợ ảnh & PDF, tối đa 5MB.' : 'No attachments yet. Images & PDFs supported, max 5MB.'}
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att._id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{getFileIcon(att.type)}</span>
                  <a href={att.url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, minWidth: 0, color: '#60a5fa', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                    {att.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att._id)}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}
                    title={lang === 'vi' ? 'Xoá' : 'Delete'}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

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
