import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUiStore } from '@store/uiStore';
import { LabelChip } from '@components/board/LabelManager';
import DueDateBadge from '@components/board/DueDateBadge';

export function SortableCard({ card, onClick }) {
  const lang = useUiStore((state) => state.language) || 'vi';
  const [isHovered, setIsHovered] = useState(false);

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
    boxShadow: isDragging ? '0 18px 36px rgba(15, 23, 42, 0.24)' : undefined,
  };

  const labels        = card.labels || [];
  const checklist     = card.checklist || [];
  const done          = checklist.filter((item) => item.completed).length;
  const total         = checklist.length;
  const progress      = total > 0 ? Math.round((done / total) * 100) : 0;
  const commentCount  = card.comments?.length || 0;
  const attachCount   = card.attachments?.length || 0;
  const descPreview   = card.description?.trim();
  const coverColor    = card.cover?.color;
  const assignees     = card.assignees || [];
  const isWatched     = card.watchers?.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card-item mb-2 cursor-grab active:cursor-grabbing"
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        paddingTop: coverColor ? 0 : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover color strip */}
      {coverColor && (
        <div style={{
          height: 32,
          background: coverColor,
          margin: '-10px -10px 10px -10px',
          borderRadius: '10px 10px 0 0',
        }} />
      )}

      {/* Labels */}
      {labels.length > 0 && (
        <div className="card-labels">
          {labels.map((raw, index) => (
            <LabelChip key={index} raw={raw} size="sm" />
          ))}
        </div>
      )}

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <p className="card-title" style={{ flex: 1, marginBottom: 0 }}>{card.title}</p>
        {isWatched && (
          <span title={lang === 'vi' ? 'Đang theo dõi' : 'Watching'} style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', flexShrink: 0, marginTop: 2 }}>
            👁
          </span>
        )}
      </div>

      {/* Description preview */}
      {descPreview && (
        <p style={{
          marginTop: 6,
          marginBottom: 0,
          color: '#64748b',
          fontSize: 12,
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {descPreview}
        </p>
      )}

      {/* Checklist progress */}
      {total > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 5, borderRadius: 999, background: 'rgba(148,163,184,.18)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 999,
              background: progress === 100 ? '#22c55e' : '#3b82f6',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: progress === 100 ? '#16a34a' : '#64748b', fontWeight: 600 }}>
            <span>{done}/{total}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Footer: due date, badges, assignees */}
      {(card.dueDate || commentCount > 0 || attachCount > 0 || assignees.length > 0) && (
        <div className="card-meta" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {card.dueDate && (
              <DueDateBadge dueDate={card.dueDate} isCompleted={card.isCompleted} lang={lang} />
            )}
            {commentCount > 0 && (
              <span className="card-meta-badge">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M14 9.5a1 1 0 01-1 1H5l-3 2.5V3a1 1 0 011-1h10a1 1 0 011 1v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
                {commentCount}
              </span>
            )}
            {attachCount > 0 && (
              <span className="card-meta-badge">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 8l-5.5 5.5a3.5 3.5 0 01-4.95-4.95l6-6a2 2 0 012.83 2.83L6.4 10.8a.5.5 0 01-.71-.71L10.5 5.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {attachCount}
              </span>
            )}
          </div>

          {/* Assignee avatars */}
          {assignees.length > 0 && (
            <div style={{ display: 'flex', gap: -4 }}>
              {assignees.slice(0, 3).map((a) => {
                const name = a?.name || '?';
                return a?.avatar ? (
                  <img key={a._id} src={a.avatar} alt={name} title={name}
                    style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(15,23,42,.8)', marginLeft: -4 }} />
                ) : (
                  <div key={a._id || name} title={name}
                    style={{ width: 20, height: 20, borderRadius: '50%', background: `hsl(${name.charCodeAt(0)*17%360},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white', border: '1.5px solid rgba(15,23,42,.8)', marginLeft: -4, flexShrink: 0 }}>
                    {name[0].toUpperCase()}
                  </div>
                );
              })}
              {assignees.length > 3 && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white', border: '1.5px solid rgba(15,23,42,.8)', marginLeft: -4 }}>
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hover quick-edit button */}
      {isHovered && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClick?.(); }}
          title={lang === 'vi' ? 'Mở card' : 'Open card'}
          style={{
            position: 'absolute',
            top: coverColor ? 40 : 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255,255,255,.18)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            backdropFilter: 'blur(4px)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}
