// frontend/src/components/board/SortableCard.jsx
// ✅ Labels + DueDateBadge + Checklist progress + Archive

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUiStore } from '@store/uiStore';
import { LabelChip } from '@components/board/LabelManager';
import DueDateBadge from '@components/board/DueDateBadge';

export function SortableCard({ card, onClick }) {
  const lang = useUiStore(s => s.language) || 'vi';
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: card._id, data: { type: 'card', listId: card.list } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const labels    = card.labels || [];
  const checklist = card.checklist || [];
  const done      = checklist.filter(i => i.completed).length;
  const total     = checklist.length;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;
  const commentCount    = card.comments?.length || 0;
  const attachmentCount = card.attachments?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick && onClick(card._id)}
      className="card-item mb-2 cursor-pointer select-none"
    >
      {/* ─── Labels row ─── */}
      {labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {labels.map((raw, i) => (
            <LabelChip key={i} raw={raw} size="sm" />
          ))}
        </div>
      )}

      {/* ─── Title ─── */}
      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', lineHeight: 1.4, margin: 0 }}>
        {card.title}
      </p>

      {/* ─── Checklist progress bar ─── */}
      {total > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>{done}/{total}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>{progress}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${progress}%`,
              background: progress === 100 ? '#22c55e' : '#3b82f6',
              transition: 'width .3s',
            }} />
          </div>
        </div>
      )}

      {/* ─── Footer: due date + meta ─── */}
      {(card.dueDate || commentCount > 0 || attachmentCount > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {card.dueDate && (
            <DueDateBadge dueDate={card.dueDate} isCompleted={card.isCompleted} lang={lang} />
          )}
          {commentCount > 0 && (
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M14 9.5a1 1 0 01-1 1H5l-3 2.5V3a1 1 0 011-1h10a1 1 0 011 1v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
              📎 {attachmentCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}