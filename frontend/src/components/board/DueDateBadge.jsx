// frontend/src/components/board/DueDateBadge.jsx
// ✅ Badge hạn chót với màu cảnh báo: xanh / cam / đỏ

export default function DueDateBadge({ dueDate, isCompleted, lang = 'vi' }) {
  if (!dueDate) return null;

  const due  = new Date(dueDate);
  const now  = new Date();
  const diff = due - now; // ms
  const diffDays = diff / (1000 * 60 * 60 * 24);

  let bg, color, icon;

  if (isCompleted) {
    bg = 'rgba(34,197,94,.2)'; color = '#4ade80'; icon = '✓';
  } else if (diff < 0) {
    // Quá hạn
    bg = 'rgba(239,68,68,.2)'; color = '#f87171'; icon = '⚠';
  } else if (diffDays <= 2) {
    // Sắp hạn (≤ 2 ngày)
    bg = 'rgba(249,115,22,.2)'; color = '#fb923c'; icon = '⏰';
  } else {
    // Còn thời gian
    bg = 'rgba(255,255,255,.1)'; color = 'rgba(255,255,255,.6)'; icon = '📅';
  }

  const formatted = due.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric', month: 'short',
  });

  const tooltip = isCompleted
    ? (lang === 'vi' ? 'Đã hoàn thành' : 'Completed')
    : diff < 0
      ? (lang === 'vi' ? 'Quá hạn!' : 'Overdue!')
      : diffDays <= 2
        ? (lang === 'vi' ? 'Sắp đến hạn' : 'Due soon')
        : (lang === 'vi' ? 'Hạn chót' : 'Due date');

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 999,
        background: bg, color,
        fontSize: 11, fontWeight: 600,
        transition: 'all .2s',
        animation: diff < 0 && !isCompleted ? 'due-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`
        @keyframes due-pulse {
          0%,100% { opacity: 1 }
          50%      { opacity: .65 }
        }
      `}</style>
      <span style={{ fontSize: 10 }}>{icon}</span>
      {formatted}
    </span>
  );
}