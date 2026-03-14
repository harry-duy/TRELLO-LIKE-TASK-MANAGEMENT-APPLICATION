import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import aiService from '@services/aiService';
import { useTranslation } from '@hooks/useTranslation';

export default function AIAssistantWidget() {
  const location = useLocation();
  const { t, language } = useTranslation();
  const assistantGreeting = t('aiAssistantGreeting');
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: assistantGreeting,
    },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (
        prev.length !== 1 ||
        prev[0].role !== 'assistant' ||
        prev[0].content === assistantGreeting
      ) {
        return prev;
      }

      return [
        {
          role: 'assistant',
          content: assistantGreeting,
        },
      ];
    });
  }, [assistantGreeting, language]);

  const boardId = useMemo(() => {
    const match = location.pathname.match(/^\/board\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const chatMutation = useMutation({
    mutationFn: ({ message, contextBoardId }) =>
      aiService.chatAssistant({ message, boardId: contextBoardId }),
    onSuccess: (response) => {
      const answer = response?.answer || t('aiAssistantNoAnswer');
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    },
    onError: (error) => {
      toast.error(error?.message || t('aiAssistantBusy'));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('aiAssistantBusyHint'),
        },
      ]);
    },
  });

  const quickPrompts = boardId
    ? [
        t('quickPromptSummaryBoard'),
        t('quickPromptOverdueCards'),
        t('quickPromptCreateLoginCard'),
      ]
    : [
        t('quickPromptCheckBoard'),
        t('quickPromptCreateWeeklySprintBoard'),
        t('quickPromptCreateLoginCardBoard'),
      ];

  const sendMessage = (overrideText) => {
    const message = (overrideText ?? input).trim();
    if (!message) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    if (!overrideText) {
      setInput('');
    }
    chatMutation.mutate({ message, contextBoardId: boardId });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-50">{t('aiAssistantTitle')}</div>
              <div className="text-[11px] text-emerald-100/70">
                {boardId ? t('aiAssistantContextOn') : t('aiAssistantContextOff')}
              </div>
            </div>
            <button
              type="button"
              className="text-emerald-100/70 hover:text-white"
              onClick={() => setIsOpen(false)}
              aria-label={t('aiAssistantClose')}
            >
              ✕
            </button>
          </div>

          <div className="h-80 overflow-auto px-3 py-3 space-y-2 custom-scrollbar">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-emerald-500/20 text-emerald-50 ml-8'
                    : 'bg-white/10 text-emerald-100 mr-8'
                }`}
              >
                {message.content}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="rounded-xl px-3 py-2 text-sm bg-white/10 text-emerald-100 mr-8">
                {t('aiAssistantResponding')}
              </div>
            )}
          </div>

          <div className="px-3 pb-2 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={chatMutation.isPending}
                className="text-xs rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-emerald-100 px-3 py-1"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              className="input"
              placeholder={t('aiAssistantInputPlaceholder')}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={sendMessage}
              disabled={chatMutation.isPending}
            >
              {t('send')}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-400 text-slate-900 shadow-xl font-bold text-xl hover:bg-emerald-300 transition-colors z-50"
        aria-label={t('aiAssistantOpen')}
      >
        AI
      </button>
    </>
  );
}
