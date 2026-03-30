// frontend/src/components/ai/AIAssistantWidget.jsx
// Cập nhật: hỗ trợ prop forceOpen + onToggle để navbar AI Assist button kiểm soát

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import aiService from '@services/aiService';
import { useTranslation } from '@hooks/useTranslation';

export default function AIAssistantWidget({ forceOpen, onToggle }) {
  const location = useLocation();
  const { t, language } = useTranslation();
  const assistantGreeting = t('aiAssistantGreeting');

  // Nếu có forceOpen từ ngoài thì dùng, không thì tự quản lý
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = forceOpen !== undefined ? forceOpen : internalOpen;

  const toggleOpen = () => {
    if (onToggle) onToggle();
    else setInternalOpen((v) => !v);
  };

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: assistantGreeting },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (
        prev.length !== 1 ||
        prev[0].role !== 'assistant' ||
        prev[0].content === assistantGreeting
      ) return prev;
      return [{ role: 'assistant', content: assistantGreeting }];
    });
  }, [assistantGreeting, language]);

  const boardId = useMemo(() => {
    const match = location.pathname.match(/^\/board\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const chatMutation = useMutation({
    mutationFn: ({ message, contextBoardId }) =>
      aiService.chatAssistant({ message, boardId: contextBoardId, language }),
    onSuccess: (response) => {
      const answer = response?.answer || t('aiAssistantNoAnswer');
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    },
    onError: (error) => {
      toast.error(error?.message || t('aiAssistantBusy'));
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('aiAssistantBusyHint') },
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
    if (!overrideText) setInput('');
    chatMutation.mutate({ message, contextBoardId: boardId, language });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-sm font-semibold text-emerald-50">{t('aiAssistantTitle')}</div>
                <div className="text-[11px] text-emerald-100/70">
                  {boardId ? t('aiAssistantContextOn') : t('aiAssistantContextOff')}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="h-7 w-7 rounded-full flex items-center justify-center text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors"
              onClick={toggleOpen}
              aria-label={t('aiAssistantClose')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-auto px-3 py-3 space-y-2 custom-scrollbar">
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
              <div className="rounded-xl px-3 py-2 text-sm bg-white/10 text-emerald-100 mr-8 flex items-center gap-2">
                <span className="flex gap-0.5">
                  {[0,1,2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
                {t('aiAssistantResponding')}
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={chatMutation.isPending}
                className="text-xs rounded-full border border-white/15 bg-white/5 hover:bg-white/12 text-emerald-100 px-3 py-1 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder={t('aiAssistantInputPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm shrink-0"
              onClick={() => sendMessage()}
              disabled={chatMutation.isPending}
            >
              {t('send')}
            </button>
          </div>
        </div>
      )}

      {/* FAB – chỉ hiện khi không có onToggle từ ngoài (tức là dùng standalone) */}
      {onToggle === undefined && (
        <button
          type="button"
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-400 text-slate-900 shadow-xl font-bold text-xl hover:bg-emerald-300 transition-colors z-50"
          aria-label={t('aiAssistantOpen')}
        >
          AI
        </button>
      )}
    </>
  );
}