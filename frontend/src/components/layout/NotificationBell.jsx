// frontend/src/components/layout/NotificationBell.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import notificationService from '@services/notificationService';
import { getSocket } from '@config/socket';
import { useUiStore } from '@store/uiStore';

function timeAgo(d, lang = 'vi') {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return lang === 'vi' ? 'vừa xong' : 'just now';
  if (m < 60) return `${m}${lang === 'vi' ? 'p' : 'm'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d`;
  return new Date(d).toLocaleDateString();
}

const TYPE_ICON = {
  member_added_workspace:   '🏢',
  member_added_card:        '👤',
  member_removed_workspace: '🚫',
  member_removed_card:      '👋',
  board_updated:            '✏️',
  card_created:             '📋',
  card_updated:             '📝',
  card_moved:               '🔀',
  card_completed:           '✅',
  comment_added:            '💬',
  workspace_updated:        '🏢',
};

export default function NotificationBell() {
  const lang = useUiStore(s => s.language) || 'vi';

  const [open,          setOpen]    = useState(false);
  const [unread,        setUnread]  = useState(0);
  const [notifications, setNotifs] = useState([]);
  const [loading,       setLoading] = useState(false);
  const [tab,           setTab]     = useState('all');
  const [shaking,       setShaking] = useState(false);
  const [pos,           setPos]     = useState({ top: 60, right: 16 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  const btnRef   = useRef(null);
  const panelRef = useRef(null);

  // Load unread count on mount
  useEffect(() => {
    notificationService.getUnreadCount()
      .then(res => setUnread(Math.min(res?.count ?? res?.data?.count ?? 0, 99)))
      .catch(() => {});
  }, []);

  // Socket: listen for new notifications
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif) => {
      setNotifs(prev => [notif, ...prev]);
      setUnread(prev => Math.min(prev + 1, 99));
      setShaking(true);
      setTimeout(() => setShaking(false), 700);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll({ limit: 30 });
      setNotifs(res?.notifications || []);
      setUnread(Math.min(res?.unreadCount ?? 0, 99));
    } catch { setNotifs([]); }
    setLoading(false);
  }, []);

  const handleOpen = () => {
    if (!open) {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
      }
      loadNotifs();
    }
    setOpen(v => !v);
  };

  const markRead = async (id) => {
    await notificationService.markRead(id);
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(prev - 1, 0));
  };

  const markAll = async () => {
    await notificationService.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const clearAllLegacy = async () => {
    if (!windowConfirmLegacy(
      lang === 'vi'
        ? 'Xoá tất cả thông báo? Hành động này không thể hoàn tác.'
        : 'Clear all notifications? This action cannot be undone.'
    )) return;
    await notificationService.clearAll();
    setNotifs([]);
    setUnread(0);
  };

  const clearAll = async () => {
    if (clearBusy) return;
    setClearBusy(true);
    try {
      await notificationService.clearAll();
      setNotifs([]);
      setUnread(0);
      setShowClearConfirm(false);
    } finally {
      setClearBusy(false);
    }
  };

  const shown = tab === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <>
      {/* Bell Button */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        title={lang === 'vi' ? 'Thông báo' : 'Notifications'}
        style={{
          position: 'relative',
          width: 36, height: 36,
          borderRadius: '50%',
          border: open
            ? '1px solid rgba(52,211,153,.55)'
            : '1px solid rgba(255,255,255,.12)',
          background: open
            ? 'rgba(52,211,153,.12)'
            : 'rgba(255,255,255,.06)',
          color: open ? '#34d399' : 'rgba(255,255,255,.72)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(255,255,255,.1)';
            e.currentTarget.style.color = 'white';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(255,255,255,.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,.72)';
          }
        }}
      >
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{
            transformOrigin: 'top center',
            animation: shaking ? 'nb-shake .6s ease-in-out' : 'none',
          }}
        >
          <path
            d="M8 1.5a4.5 4.5 0 00-4.5 4.5v2.8l-1.3 2.2h11.6l-1.3-2.2V6A4.5 4.5 0 008 1.5z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
          />
          <path d="M6.2 13a1.8 1.8 0 003.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, padding: '0 4px',
            borderRadius: 999,
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            color: 'white', fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0f172a',
            boxSizing: 'border-box',
            lineHeight: 1,
            animation: shaking ? 'nb-badge-pop .3s cubic-bezier(.34,1.8,.64,1)' : 'none',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel via Portal */}
      {open && createPortal(
        <>
          <style>{`
            @keyframes nb-in        { from{opacity:0;transform:translateY(-8px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes nb-shake     { 0%,100%{transform:rotate(0)} 15%{transform:rotate(-14deg)} 35%{transform:rotate(14deg)} 55%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
            @keyframes nb-badge-pop { from{transform:scale(0)} to{transform:scale(1)} }
            @keyframes nb-spin      { to{transform:rotate(360deg)} }
          `}</style>

          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              width: 370,
              maxWidth: 'calc(100vw - 2rem)',
              zIndex: 9999,
              background: 'linear-gradient(160deg, rgba(13,20,36,.99) 0%, rgba(8,28,25,.99) 100%)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 20,
              boxShadow: '0 28px 70px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04)',
              overflow: 'hidden',
              animation: 'nb-in .18s cubic-bezier(.34,1.4,.64,1)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                  {lang === 'vi' ? '🔔 Thông báo' : '🔔 Notifications'}
                </span>
                {unread > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(239,68,68,.18)', color: '#f87171',
                    fontSize: 11, fontWeight: 700,
                    border: '1px solid rgba(239,68,68,.25)',
                  }}>
                    {unread}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {unread > 0 && (
                  <button type="button" onClick={markAll}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: '#34d399', fontWeight: 600,
                      padding: '3px 8px', borderRadius: 8,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {lang === 'vi' ? 'Đọc tất cả' : 'Mark all read'}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button type="button" onClick={() => setShowClearConfirm(true)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: '#f87171', fontWeight: 600,
                      padding: '3px 8px', borderRadius: 8,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {lang === 'vi' ? 'Xoá hết' : 'Clear all'}
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: 'none', background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.55)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                  ✕
                </button>
              </div>
            </div>

            {showClearConfirm && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  background: 'rgba(2,6,23,.72)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 18,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 290,
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,.1)',
                    background: 'linear-gradient(180deg, rgba(15,23,42,.98), rgba(17,24,39,.98))',
                    boxShadow: '0 20px 44px rgba(0,0,0,.45)',
                    padding: 16,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>
                    {lang === 'vi' ? 'Xóa tất cả thông báo?' : 'Clear all notifications?'}
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,.58)' }}>
                    {lang === 'vi'
                      ? 'Hành động này không thể hoàn tác.'
                      : 'This action cannot be undone.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      disabled={clearBusy}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.1)',
                        background: 'rgba(255,255,255,.06)',
                        color: 'rgba(255,255,255,.8)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: clearBusy ? 'default' : 'pointer',
                      }}
                    >
                      {lang === 'vi' ? 'Hủy' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={clearBusy}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(239,68,68,.28)',
                        background: 'rgba(239,68,68,.16)',
                        color: '#f87171',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: clearBusy ? 'default' : 'pointer',
                      }}
                    >
                      {clearBusy
                        ? (lang === 'vi' ? 'Đang xóa...' : 'Clearing...')
                        : (lang === 'vi' ? 'Xóa hết' : 'Clear all')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{
                display: 'flex', gap: 3,
                background: 'rgba(255,255,255,.04)',
                borderRadius: 999, padding: 3,
              }}>
                {[
                  { key: 'all',    label: lang === 'vi' ? 'Tất cả' : 'All' },
                  { key: 'unread', label: lang === 'vi'
                    ? `Chưa đọc${unread > 0 ? ` (${unread})` : ''}`
                    : `Unread${unread > 0 ? ` (${unread})` : ''}`,
                  },
                ].map(t => (
                  <button key={t.key} type="button" onClick={() => setTab(t.key)}
                    style={{
                      flex: 1, padding: '5px 10px', borderRadius: 999,
                      border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, transition: 'all .15s',
                      background: tab === t.key ? 'white' : 'transparent',
                      color:      tab === t.key ? '#0f172a' : 'rgba(255,255,255,.5)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification List */}
            <div style={{ maxHeight: 390, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid rgba(52,211,153,.25)', borderTopColor: '#34d399', animation: 'nb-spin .8s linear infinite' }} />
                  <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
                    {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
                  </p>
                </div>
              ) : shown.length === 0 ? (
                <div style={{ padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    🔔
                  </div>
                  <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
                    {lang === 'vi' ? 'Không có thông báo nào' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                shown.map((notif, idx) => (
                  <div
                    key={notif._id}
                    onClick={() => {
                      if (!notif.isRead) markRead(notif._id);
                      if (notif.link) { setOpen(false); window.location.href = notif.link; }
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 16px',
                      position: 'relative',
                      background: notif.isRead ? 'transparent' : 'rgba(52,211,153,.04)',
                      cursor: (notif.link || !notif.isRead) ? 'pointer' : 'default',
                      transition: 'background .15s',
                      borderBottom: idx < shown.length - 1
                        ? '1px solid rgba(255,255,255,.04)' : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(52,211,153,.04)'}
                  >
                    {/* Unread dot */}
                    {!notif.isRead && (
                      <span style={{
                        position: 'absolute', left: 5, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#34d399',
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: notif.isRead
                        ? 'rgba(255,255,255,.05)' : 'rgba(52,211,153,.14)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16,
                    }}>
                      {TYPE_ICON[notif.type] || '📣'}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12,
                        fontWeight: notif.isRead ? 400 : 600,
                        color: 'rgba(255,255,255,.9)',
                        lineHeight: 1.45, margin: 0,
                      }}>
                        {notif.title}
                      </p>
                      <p style={{
                        fontSize: 11, color: 'rgba(255,255,255,.5)',
                        margin: '3px 0 0', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {notif.message}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,.26)', margin: '4px 0 0' }}>
                        {timeAgo(notif.createdAt, lang)}
                        {notif.actor?.name && (
                          <span style={{ marginLeft: 5, color: 'rgba(167,243,208,.42)' }}>
                            · {notif.actor.name}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Mark read button */}
                    {!notif.isRead && (
                      <button
                        type="button"
                        title={lang === 'vi' ? 'Đánh dấu đã đọc' : 'Mark as read'}
                        onClick={e => { e.stopPropagation(); markRead(notif._id); }}
                        style={{
                          width: 24, height: 24, borderRadius: 8,
                          border: 'none', cursor: 'pointer', flexShrink: 0,
                          background: 'rgba(52,211,153,.14)', color: '#34d399',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,.14)'}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(255,255,255,.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>
                {notifications.length} {lang === 'vi' ? 'thông báo' : 'notification(s)'}
              </span>
              <button type="button" onClick={loadNotifs}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'rgba(52,211,153,.65)', fontWeight: 600,
                  padding: '3px 6px', borderRadius: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#34d399'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(52,211,153,.65)'}>
                ↻ {lang === 'vi' ? 'Làm mới' : 'Refresh'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
