import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    </div>
  );
}
