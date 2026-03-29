import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUiStore } from '@store/uiStore';
import { LabelChip } from '@components/board/LabelManager';
import DueDateBadge from '@components/board/DueDateBadge';

export function SortableCard({ card, onClick }) {
  const lang = useUiStore((state) => state.language) || 'vi';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id, data: { type: 'card', listId: card.list } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    boxShadow: isDragging
      ? '0 18px 36px rgba(15, 23, 42, 0.24)'
      : undefined,
  };

  const labels = card.labels || [];
  const checklist = card.checklist || [];
  const done = checklist.filter((item) => item.completed).length;
  const total = checklist.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const commentCount = card.comments?.length || 0;
  const attachmentCount = card.attachments?.length || 0;
  const descriptionPreview = card.description?.trim();
  const assignees = Array.isArray(card.assignees) ? card.assignees.slice(0, 4) : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card-item mb-2 cursor-grab active:cursor-grabbing"
    >
      {labels.length > 0 && (
        <div className="card-labels">
          {labels.map((raw, index) => (
            <LabelChip key={index} raw={raw} size="sm" />
          ))}
        </div>
      )}

      <p className="card-title">{card.title}</p>

      {descriptionPreview ? (
        <p
          style={{
            marginTop: 6,
            marginBottom: 0,
            color: '#64748b',
            fontSize: 12,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {descriptionPreview}
        </p>
      ) : null}

      {total > 0 && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              height: 5,
              borderRadius: '999px',
              background: 'rgba(148,163,184,.18)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: '999px',
                background: progress === 100 ? '#22c55e' : '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 4,
              fontSize: 10,
              color: progress === 100 ? '#16a34a' : '#64748b',
              fontWeight: 600,
            }}
          >
            <span>
              {done}/{total}
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {(card.dueDate || commentCount > 0 || attachmentCount > 0) && (
        <div className="card-meta">
          {card.dueDate && (
            <DueDateBadge dueDate={card.dueDate} isCompleted={card.isCompleted} lang={lang} />
          )}

          {commentCount > 0 && (
            <span className="card-meta-badge">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path
                  d="M14 9.5a1 1 0 01-1 1H5l-3 2.5V3a1 1 0 011-1h10a1 1 0 011 1v6.5z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              {commentCount}
            </span>
          )}

          {attachmentCount > 0 && (
            <span className="card-meta-badge">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.5 8l-5.5 5.5a3.5 3.5 0 01-4.95-4.95l6-6a2 2 0 012.83 2.83L6.4 10.8a.5.5 0 01-.71-.71L10.5 5.3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              {attachmentCount}
            </span>
          )}
        </div>
      )}

      {assignees.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {assignees.map((assignee, index) => {
              const name = assignee?.name || assignee?.email || '?';
              const avatar = assignee?.avatar;
              return avatar ? (
                <img
                  key={assignee?._id || `${name}-${index}`}
                  src={avatar}
                  alt={name}
                  title={name}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(15,23,42,.9)',
                    marginLeft: index === 0 ? 0 : -6,
                    boxShadow: '0 2px 6px rgba(0,0,0,.18)',
                    background: '#0f172a',
                  }}
                />
              ) : (
                <div
                  key={assignee?._id || `${name}-${index}`}
                  title={name}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid rgba(15,23,42,.9)',
                    marginLeft: index === 0 ? 0 : -6,
                    background: `hsl(${(name.charCodeAt(0) * 17) % 360},60%,42%)`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,.18)',
                  }}
                >
                  {name[0].toUpperCase()}
                </div>
              );
            })}
          </div>

          {card.assignees.length > 4 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#94a3b8',
                background: 'rgba(148,163,184,.14)',
                borderRadius: 999,
                padding: '2px 7px',
              }}
            >
              +{card.assignees.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
