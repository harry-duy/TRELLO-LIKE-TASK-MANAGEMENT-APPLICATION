// frontend/src/components/board/DueDateBadge.jsx
// ✅ Professional Trello-style due date badge
// ✅ Logic identical, visuals improved

export default function DueDateBadge({ dueDate, isCompleted, lang = 'vi' }) {
  if (!dueDate) return null;

  const due  = new Date(dueDate);
  const now  = new Date();
  const diff = due - now;
  const diffDays = diff / (1000 * 60 * 60 * 24);

  let bg, color, icon;

  if (isCompleted) {
    bg = 'rgba(75,206,151,.2)'; color = '#4bce97'; icon = '✓';
  } else if (diff < 0) {
    bg = 'rgba(248,113,104,.2)'; color = '#f87168'; icon = '⚠';
  } else if (diffDays <= 2) {
    bg = 'rgba(245,166,35,.2)'; color = '#f5a623'; icon = '⏰';
  } else {
    bg = 'rgba(166,197,226,.1)'; color = 'var(--color-text-secondary)'; icon = '📅';
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: '4px',
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        animation: diff < 0 && !isCompleted ? 'due-pulse 2s ease-in-out infinite' : 'none',
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: 9 }}>{icon}</span>
      {formatted}
    </span>
  );
}