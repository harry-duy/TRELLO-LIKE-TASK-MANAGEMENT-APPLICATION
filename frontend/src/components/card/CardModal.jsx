// src/components/card/CardModal.jsx
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cardService from '@services/cardService';

export default function CardModal({ cardId, boardId, onClose }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [checklistText, setChecklistText] = useState('');

  const { data: card, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => cardService.getDetails(cardId),
  });

  useEffect(() => {
    if (!card) return;
    setForm({
      title: card.title || '',
      description: card.description || '',
      dueDate: card.dueDate ? card.dueDate.slice(0, 10) : '',
    });
  }, [card]);

  const commentMutation = useMutation({
    mutationFn: (content) => cardService.addComment(cardId, { content, boardId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
    },
  });

  const checklistMutation = useMutation({
    mutationFn: (text) => cardService.addChecklistItem(cardId, text),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
      setChecklistText('');
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: (itemId) => cardService.toggleChecklistItem(cardId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => cardService.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries(['board', boardId]);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => cardService.update(cardId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setIsEditing(false);
    },
  });

  if (isLoading) return <div className="modal-overlay">Loading...</div>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card-modal max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          {isEditing ? (
            <input
              className="input text-lg font-semibold"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Card title"
            />
          ) : (
            <div>
              <h2 className="text-2xl font-semibold heading-soft">{card?.title}</h2>
              <p className="text-sm text-emerald-50/70 mt-2">
                In list: {card?.list?.name}
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-emerald-50/60 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">
              Description
            </h3>
          {isEditing ? (
            <textarea
              className="input min-h-[140px]"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Add a description..."
            />
          ) : (
            <p className="text-emerald-50/80 bg-white/5 p-4 rounded-xl">
              {card?.description || 'No description yet...'}
            </p>
          )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">
              Due date
            </h3>
          {isEditing ? (
            <input
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            />
          ) : (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-emerald-50/80">
              {card?.dueDate
                ? new Date(card.dueDate).toLocaleDateString()
                : 'No due date'}
              </p>
            </div>
          )}
          </section>
        </div>

        <section className="mt-8">
          <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-4">
            Activity (Comments)
          </h3>
          <div className="space-y-4 mb-4">
            {card?.comments?.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex-shrink-0" />
                <div className="bg-white/10 p-3 rounded-xl flex-1">
                  <p className="text-sm font-semibold text-white">{comment.user.name}</p>
                  <p className="text-sm text-emerald-50/80">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          <textarea
            className="input w-full mb-2"
            placeholder="Write a comment..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commentMutation.mutate(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </section>

        <section className="mt-8">
          <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-4">
            Checklist
          </h3>
          <div className="space-y-3 mb-4">
            {card?.checklist?.map((item) => (
              <label key={item._id} className="flex items-center gap-3 text-emerald-50/80">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleChecklistMutation.mutate(item._id)}
                />
                <span className={item.completed ? 'line-through text-emerald-50/50' : ''}>
                  {item.text}
                </span>
              </label>
            ))}
            {!card?.checklist?.length && (
              <p className="text-sm text-emerald-50/60">No checklist items yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Add checklist item..."
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (!checklistText.trim()) return;
                checklistMutation.mutate(checklistText.trim());
              }}
            >
              Add
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      title: form.title,
                      description: form.description,
                      dueDate: form.dueDate || null,
                    })
                  }
                  className="btn btn-primary btn-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary btn-sm"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => deleteMutation.mutate()}
              className="btn btn-danger btn-sm"
            >
              Delete card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
