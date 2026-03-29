// frontend/src/components/board/ArchivePanel.jsx
// Panel showing archived cards for a board. Cards can be restored or permanently deleted.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@config/api';
import cardService from '@services/cardService';
import toast from 'react-hot-toast';

const L = {
  vi: {
    title:       'Lưu trữ',
    subtitle:    'Cards đã lưu trữ trong board này',
    searchPh:    'Tìm card trong lưu trữ...',
    empty:       'Không có card nào trong lưu trữ.',
    emptyHint:   'Kéo card vào vùng "Kéo để lưu trữ" ở cuối board để lưu trữ.',
    loading:     'Đang tải...',
    restore:     'Khôi phục',
    delete:      'Xoá vĩnh viễn',
    confirmDel:  'Xoá card này vĩnh viễn? Hành động này không thể hoàn tác.',
    restoreOk:   'Đã khôi phục card về danh sách cũ',
    restoreFail: 'Không thể khôi phục card',
    deleteOk:    'Đã xoá card vĩnh viễn',
    deleteFail:  'Không thể xoá card',
    inList:      'Trong:',
    close:       'Đóng',
  },
  en: {
    title:       'Archive',
    subtitle:    'Archived cards in this board',
    searchPh:    'Search archived cards...',
    empty:       'No archived cards.',
    emptyHint:   'Drag a card to the "Drag to archive" zone at the bottom of the board.',
    loading:     'Loading...',
    restore:     'Restore',
    delete:      'Delete permanently',
    confirmDel:  'Permanently delete this card? This cannot be undone.',
    restoreOk:   'Card restored to its original list',
    restoreFail: 'Could not restore card',
    deleteOk:    'Card permanently deleted',
    deleteFail:  'Could not delete card',
    inList:      'In:',
    close:       'Close',
  },
};

export default function ArchivePanel({ boardId, lang = 'vi', onClose }) {
  const l = L[lang] || L.vi;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['archived-cards', boardId],
    queryFn:  () => apiClient.get(`/boards/${boardId}/archived-cards`).then(r => r?.data ?? r),
    enabled:  !!boardId,
  });

  const cards = (data?.data || []).filter(card =>
    !search.trim() || card.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const restoreMutation = useMutation({
    mutationFn: (cardId) => cardService.update(cardId, { isArchived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['archived-cards', boardId]);
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(l.restoreOk);
    },
    onError: () => toast.error(l.restoreFail),
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId) => cardService.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries(['archived-cards', boardId]);
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(l.deleteOk);
    },
    onError: () => toast.error(l.deleteFail),
  });

  const handleDelete = (card) => {
    if (!window.confirm(l.confirmDel)) return;
    deleteMutation.mutate(card._id);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(13,20,36,.99), rgba(10,16,30,.99))',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="1.5" width="13" height="3" rx="1" stroke="#fbbf24" strokeWidth="1.4"/>
                <path d="M3 4.5v9a1 1 0 001 1h8a1 1 0 001-1v-9" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M6.5 7.5h3" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{l.title}</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', margin: 0 }}>{l.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.07)',
              color: 'rgba(255,255,255,.7)',
              cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 18px', flexShrink: 0 }}>
          <input
            placeholder={l.searchPh}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.06)',
              color: 'white', fontSize: 13, outline: 'none',
            }}
          />
        </div>

        {/* Card list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>
              {l.loading}
            </div>
          ) : cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.7)', margin: '0 0 6px' }}>{l.empty}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', margin: 0 }}>{l.emptyHint}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cards.map(card => (
                <div
                  key={card._id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(255,255,255,.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* Card info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.88)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {card.title}
                    </p>
                    {card.list?.name && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: '2px 0 0' }}>
                        {l.inList} {card.list.name}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={restoreMutation.isPending}
                      onClick={() => restoreMutation.mutate(card._id)}
                      style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: '1px solid rgba(52,211,153,.4)',
                        background: 'rgba(52,211,153,.1)',
                        color: '#6ee7b7', cursor: 'pointer',
                        opacity: restoreMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      ↩ {l.restore}
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(card)}
                      style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: '1px solid rgba(239,68,68,.35)',
                        background: 'rgba(239,68,68,.1)',
                        color: '#f87171', cursor: 'pointer',
                        opacity: deleteMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      🗑 {l.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
