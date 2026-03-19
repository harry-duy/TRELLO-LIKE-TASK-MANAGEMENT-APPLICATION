// src/components/card/CardModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cardService from '@services/cardService';
import boardService from '@services/boardService';
import aiService from '@services/aiService';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';

export default function CardModal({ cardId, boardId, onClose }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [checklistText, setChecklistText] = useState('');
  const [aiChecklist, setAiChecklist] = useState([]);
  const [moveTargets, setMoveTargets] = useState({});

  const { data: card, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => cardService.getDetails(cardId),
  });

  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardDetails(boardId),
    enabled: !!boardId,
  });

  const destinationCards = useMemo(
    () =>
      (board?.lists || []).flatMap((list) =>
        (list.cards || [])
          .filter((boardCard) => !boardCard.isArchived && boardCard._id !== cardId)
          .map((boardCard) => ({
            value: boardCard._id,
            label: `${boardCard.title} (${list.name})`,
          }))
      ),
    [board, cardId]
  );

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

  const aiChecklistMutation = useMutation({
    mutationFn: () =>
      aiService.getChecklistSuggestions({
        title: form.title,
        description: form.description,
      }),
    onSuccess: (response) => {
      const items = response?.checklist || [];
      setAiChecklist(items);
      toast.success(t('aiSuggestedCount', { count: items.length }));
    },
    onError: (error) => {
      toast.error(error?.message || t('aiChecklistFetchError'));
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: (itemId) => cardService.toggleChecklistItem(cardId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]);
    },
  });

  const moveChecklistMutation = useMutation({
    mutationFn: ({ itemId, targetCardId }) =>
      cardService.moveChecklistItem(cardId, itemId, targetCardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['card', cardId]);
      queryClient.invalidateQueries(['card', variables.targetCardId]);
      queryClient.invalidateQueries(['board', boardId]);
      setMoveTargets((prev) => {
        const next = { ...prev };
        delete next[variables.itemId];
        return next;
      });
      toast.success(t('moveChecklistItemSuccess'));
    },
    onError: (error) => {
      toast.error(error?.message || t('moveChecklistItemError'));
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

  if (isLoading) return <div className="modal-overlay">{t('loadingCard')}</div>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card-modal w-full max-w-3xl p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          {isEditing ? (
            <input
              className="input min-w-0 flex-1 text-lg font-semibold"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t('cardTitlePlaceholderModal')}
            />
          ) : (
            <div className="min-w-0 flex-1">
              <h2 className="heading-soft break-words text-2xl font-semibold">
                {card?.title}
              </h2>
              <p className="text-sm text-emerald-50/70 mt-2">
                {t('inListLabel', { name: card?.list?.name || 'N/A' })}
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            className="shrink-0 text-xl leading-none text-emerald-50/60 hover:text-white"
            aria-label={t('close')}
          >
            ✕
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="min-w-0 space-y-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">
              {t('description')}
            </h3>
          {isEditing ? (
            <textarea
              className="input min-h-[140px]"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t('addDescription')}
            />
          ) : (
            <p className="text-emerald-50/80 bg-white/5 p-4 rounded-xl">
              {card?.description || t('noDescriptionYet')}
            </p>
          )}
          </section>

          <section className="min-w-0 space-y-3">
            <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70">
              {t('dueDate')}
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
                : t('noDueDate')}
              </p>
            </div>
          )}
          </section>
        </div>

        <section className="mt-8">
          <h3 className="text-sm uppercase tracking-[0.24em] text-emerald-100/70 mb-4">
            {t('activityComments')}
          </h3>
          <div className="space-y-4 mb-4">
            {card?.comments?.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex-shrink-0" />
                <div className="min-w-0 flex-1 rounded-xl bg-white/10 p-3">
                  <p className="text-sm font-semibold text-white">{comment.user.name}</p>
                  <p className="break-words text-sm text-emerald-50/80">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <textarea
            className="input w-full mb-2"
            placeholder={t('writeComment')}
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
            {t('checklist')}
          </h3>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => aiChecklistMutation.mutate()}
              disabled={aiChecklistMutation.isPending || !form.title.trim()}
            >
              {aiChecklistMutation.isPending
                ? t('aiSuggestingChecklist')
                : t('aiSuggestChecklist')}
            </button>
            {!!aiChecklist.length && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  try {
                    for (const item of aiChecklist) {
                      await cardService.addChecklistItem(cardId, item);
                    }
                    queryClient.invalidateQueries(['card', cardId]);
                    setAiChecklist([]);
                    toast.success(t('addedAiChecklistSuccess'));
                  } catch (error) {
                    toast.error(error?.message || t('addAiChecklistError'));
                  }
                }}
              >
                {t('addAllSuggestions')}
              </button>
            )}
          </div>

          {!!aiChecklist.length && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
              {aiChecklist.map((item) => (
                <div key={item} className="text-sm text-emerald-50/85">• {item}</div>
              ))}
            </div>
          )}

          <div className="space-y-3 mb-4">
            {card?.checklist?.map((item) => {
              const isMovingCurrentItem =
                moveChecklistMutation.isPending &&
                moveChecklistMutation.variables?.itemId === item._id;

              return (
                <div key={item._id} className="rounded-xl bg-white/5 p-3">
                  <label className="flex items-center gap-3 text-emerald-50/80">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistMutation.mutate(item._id)}
                    />
                    <span
                      className={`min-w-0 flex-1 break-words ${
                        item.completed ? 'line-through text-emerald-50/50' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>

                  {destinationCards.length > 0 ? (
                    <div className="mt-3 flex min-w-0 flex-col gap-2 lg:flex-row">
                      <select
                        className="input min-w-0 flex-1"
                        value={moveTargets[item._id] || ''}
                        onChange={(e) =>
                          setMoveTargets((prev) => ({
                            ...prev,
                            [item._id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">{t('moveToCardPlaceholder')}</option>
                        {destinationCards.map((targetCard) => (
                          <option key={targetCard.value} value={targetCard.value}>
                            {targetCard.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm w-full lg:w-auto lg:shrink-0"
                        disabled={!moveTargets[item._id] || isMovingCurrentItem}
                        onClick={() =>
                          moveChecklistMutation.mutate({
                            itemId: item._id,
                            targetCardId: moveTargets[item._id],
                          })
                        }
                      >
                        {isMovingCurrentItem
                          ? t('movingChecklistItem')
                          : t('moveChecklistItem')}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-emerald-50/60">
                      {t('noOtherCardsToMoveChecklist')}
                    </p>
                  )}
                </div>
              );
            })}
            {!card?.checklist?.length && (
              <p className="text-sm text-emerald-50/60">{t('noChecklistItemsYet')}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input min-w-0 flex-1"
              placeholder={t('addChecklistItemPlaceholder')}
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm w-full sm:w-auto sm:shrink-0"
              onClick={() => {
                if (!checklistText.trim()) return;
                checklistMutation.mutate(checklistText.trim());
              }}
            >
              {t('add')}
            </button>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
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
                  {t('save')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary btn-sm"
                >
                  {t('cancel')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary btn-sm"
              >
                {t('editCard')}
              </button>
            )}
            <button
              onClick={() => deleteMutation.mutate()}
              className="btn btn-danger btn-sm"
            >
              {t('deleteCard')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
