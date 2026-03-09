// src/components/board/SortableCard.jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableCard({ card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = 
    useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, // Hiệu ứng khi đang kéo [cite: 179]
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card card-hover mb-2 cursor-grab active:cursor-grabbing"
    >
      {card.title}
    </div>
  );
}