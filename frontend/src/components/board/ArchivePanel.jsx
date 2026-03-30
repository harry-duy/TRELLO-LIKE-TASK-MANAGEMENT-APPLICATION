// frontend/src/components/board/ArchivePanel.jsx
// Archive panel: shows archived cards, allows restore & permanent delete

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import cardService from '@services/cardService';
import toast from 'react-hot-toast';

const L = {
  vi: {
    title:        'Lưu trữ',
    subtitle:     'Cards đã lưu trữ trong board này',
    searchPh:     'Tìm card trong lưu trữ...',
    empty:        'Không có card nào trong lưu trữ.',
    emptyHint:    'Kéo card vào vùng "Kéo để lưu trữ" ở cuối board để lưu trữ.',
    restore:      'Khôi phục',
    delete:       'Xoá vĩnh viễn',
    deleteConfirm:'Xoá vĩnh viễn card này? Không thể hoàn tác.',
    restoreOk:    'Đã khôi phục card về board',
    restoreFail:  'Không thể khôi phục card',
    deleteOk:     'Đã xoá card vĩnh viễn',
    deleteFail:   'Không thể xoá card',
    inList:       'Thuộc danh sách',
    listDeleted:  '(danh sách đã bị xóa)',
    loading:      'Đang tải...',
  },
  en: {
    title:        'Archive',
    subtitle:     'Archived cards in this board',
    searchPh:     'Search archived cards...',
    empty:        'No archived cards.',
    emptyHint:    'Drag a card into the "Drag to archive" zone at the bottom of the board.',
    restore:      'Restore',
    delete:       'Delete permanently',
    deleteConfirm:'Permanently delete this card? This cannot be undone.',
    restoreOk:    'Card restored to board',
    restoreFail:  'Could not restore card',
    deleteOk:     'Card permanently deleted',
    deleteFail:   'Could not delete card',
    inList:       'In list',
    listDeleted:  '(list was deleted)',
    loading:      'Loading...',
  },
};

export default function ArchivePanel({ boardId, lang = 'vi', onClose }) {
  const l = L[lang] || L.vi;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: archivedCards = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['archivedCards', boardId],
    queryFn:  () => cardService.getArchived(boardId),
    enabled:  !!boardId,
  });

  const restoreMutation = useMutation({
    mutationFn: (cardId) => cardService.restore(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries(['archivedCards', boardId]);
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(l.restoreOk);
    },
    onError: () => toast.error(l.restoreFail),
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId) => cardService.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries(['archivedCards', boardId]);
      queryClient.invalidateQueries(['board', boardId]);
      toast.success(l.deleteOk);
    },
    onError: () => toast.error(l.deleteFail),
  });

  const handleDelete = (card) => {
    if (!window.confirm(l.deleteConfirm)) return;
    deleteMutation.mutate(card._id);
  };

  const filtered = (archivedCards || []).filter(c =>
    !search.trim() || c.title?.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: 520,
          width: '92vw',
          padding: 0,
          background: 'rgba(13,22,41,0.98)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 18,
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>{l.title}</h2>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{l.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.08)',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              cursor: 'pointer',
              color: 'rgba(255,255,255,.6)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px' }}>
          <input
            className="input"
            placeholder={l.searchPh}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Card list */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '0 20px 20px' }}>
          {isLoading ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13, padding: '24px 0' }}>{l.loading}</p>
          ) : isError ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>
                {lang === 'vi' ? 'Không thể tải dữ liệu.' : 'Failed to load.'}
              </p>
              <button type="button" onClick={() => refetch()}
                style={{ marginTop: 8, padding: '4px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 12 }}>
                {lang === 'vi' ? 'Thử lại' : 'Retry'}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>{l.empty}</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.5 }}>{l.emptyHint}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(card => (
                <div
                  key={card._id}
                  style={{
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Card info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,.88)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {card.title}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,.38)' }}>
                      {l.inList}: <span style={{ color: 'rgba(255,255,255,.55)' }}>
                        {card.list?.name || l.listDeleted}
                      </span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => restoreMutation.mutate(card._id)}
                      disabled={restoreMutation.isPending || deleteMutation.isPending}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(52,211,153,.35)',
                        background: 'rgba(52,211,153,.12)',
                        color: '#6ee7b7',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ↩ {l.restore}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(card)}
                      disabled={restoreMutation.isPending || deleteMutation.isPending}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(248,113,104,.35)',
                        background: 'rgba(248,113,104,.12)',
                        color: '#f87171',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
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
