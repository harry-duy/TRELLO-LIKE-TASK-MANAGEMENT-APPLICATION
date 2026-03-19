// frontend/src/components/board/SortableCard.jsx
// ✅ Professional Trello-style card - dark theme, clean layout
// ✅ Labels + DueDateBadge + Checklist progress + Archive
// NOTE: Only visual changes - all props/callbacks preserved

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
    opacity: isDragging ? 0 : 1,
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
      className="card-item"
    >
      {/* ─── Label strips at top ─── */}
      {labels.length > 0 && (
        <div className="card-labels">
          {labels.map((raw, i) => (
            <LabelChip key={i} raw={raw} size="sm" />
          ))}
        </div>
      )}

      {/* ─── Card Title ─── */}
      <p className="card-title">{card.title}</p>

      {/* ─── Checklist progress bar ─── */}
      {total > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            height: 4, borderRadius: '999px',
            background: 'rgba(166,197,226,.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: '999px',
              background: progress === 100 ? '#4bce97' : '#579dff',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 3, fontSize: 10,
            color: progress === 100 ? '#4bce97' : 'var(--color-text-muted)',
            fontWeight: 500,
          }}>
            <span>{done}/{total}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* ─── Footer: due date + meta badges ─── */}
      {(card.dueDate || commentCount > 0 || attachmentCount > 0) && (
        <div className="card-meta">
          {card.dueDate && (
            <DueDateBadge dueDate={card.dueDate} isCompleted={card.isCompleted} lang={lang} />
          )}
          {commentCount > 0 && (
            <span className="card-meta-badge">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M14 9.5a1 1 0 01-1 1H5l-3 2.5V3a1 1 0 011-1h10a1 1 0 011 1v6.5z"
                  stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="card-meta-badge">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 8l-5.5 5.5a3.5 3.5 0 01-4.95-4.95l6-6a2 2 0 012.83 2.83L6.4 10.8a.5.5 0 01-.71-.71L10.5 5.3"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {attachmentCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}