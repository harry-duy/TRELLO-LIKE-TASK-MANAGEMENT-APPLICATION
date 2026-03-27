// frontend/src/components/board/StarButton.jsx
// ✅ Gọi PATCH /boards/:id/star — lưu đúng vào DB

import { useState } from 'react';
import { useAuthStore } from '@store/authStore';
import boardService from '@services/boardService';
import toast from 'react-hot-toast';

/**
 * Props:
 *  board      — object { _id, starredBy: [...] }
 *  onToggle   — callback() sau khi toggle thành công
 *  size       — 'sm' | 'md' | 'lg'
 *  showLabel  — boolean
 *  labelStar / labelUnstar — string
 */
export default function StarButton({
  board,
  onToggle,
  size        = 'md',
  showLabel   = false,
  labelStar   = 'Đánh dấu',
  labelUnstar = 'Bỏ đánh dấu',
}) {
  const { user } = useAuthStore();
  const userId   = user?._id;

  // Tính trạng thái ban đầu từ prop board
  const calcStarred = () =>
    (board?.starredBy || []).some(id => (id?._id || id)?.toString() === userId?.toString());

  const [starred,   setStarred]   = useState(calcStarred);
  const [loading,   setLoading]   = useState(false);
  const [animating, setAnimating] = useState(false);

  const sz = { sm: 13, md: 16, lg: 20 }[size] ?? 16;
  const pd = { sm: '3px 6px', md: '5px 10px', lg: '6px 14px' }[size] ?? '5px 10px';
  const fs = { sm: 11, md: 12, lg: 13 }[size] ?? 12;

  const toggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading || !board?._id) return;

    // Optimistic
    const next = !starred;
    setStarred(next);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
    setLoading(true);

    try {
      // ✅ Gọi PATCH /boards/:id/star — backend xử lý toggle
      await boardService.toggleStar(board._id);
      if (onToggle) onToggle(next);
    } catch (err) {
      // Rollback
      setStarred(!next);
      toast.error(err?.message || 'Không thể lưu. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={starred ? labelUnstar : labelStar}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: pd, borderRadius: 999, border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        background: starred ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.08)',
        color:      starred ? '#fbbf24' : 'rgba(255,255,255,.45)',
        transition: 'all .2s',
        transform:  animating ? 'scale(1.25)' : 'scale(1)',
        outline: 'none',
      }}
      onMouseEnter={e => {
        if (!starred) {
          e.currentTarget.style.background = 'rgba(251,191,36,.12)';
          e.currentTarget.style.color = '#fbbf24';
        }
      }}
      onMouseLeave={e => {
        if (!starred) {
          e.currentTarget.style.background = 'rgba(255,255,255,.08)';
          e.currentTarget.style.color = 'rgba(255,255,255,.45)';
        }
      }}
    >
      {loading ? (
        <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"
          style={{ animation: 'sb-spin .6s linear infinite', flexShrink: 0 }}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
          <style>{`@keyframes sb-spin{to{transform:rotate(360deg)}}`}</style>
        </svg>
      ) : (
        <svg
          width={sz} height={sz} viewBox="0 0 16 16"
          fill={starred ? '#fbbf24' : 'none'}
          stroke={starred ? '#fbbf24' : 'currentColor'}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'all .2s', flexShrink: 0 }}
        >
          <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.127L8 10.77l-3.708 2.14.708-4.127L2 5.86l4.146-.603L8 1.5z"/>
        </svg>
      )}
      {showLabel && (
        <span style={{ fontSize: fs, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {starred ? labelUnstar : labelStar}
        </span>
      )}
    </button>
  );
}