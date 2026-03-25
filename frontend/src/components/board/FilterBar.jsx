import { useEffect, useState } from 'react';
import { LABEL_COLORS } from '@components/board/LabelManager';
import apiClient from '@config/api';

const L = {
  vi: {
    title: 'Lọc thẻ',
    keyword: 'Tìm theo tên...',
    labels: 'Nhãn',
    assignees: 'Thành viên được giao',
    allAssignees: 'Tất cả thành viên',
    dueDate: 'Hạn chót',
    allDue: 'Tất cả',
    overdue: 'Quá hạn',
    dueSoon: 'Sắp hạn (≤ 2 ngày)',
    noDue: 'Không có hạn',
    hasDue: 'Có hạn chót',
    completed: 'Đã hoàn thành',
    clearAll: 'Xoá bộ lọc',
    close: 'Đóng',
    active: (n) => `${n} bộ lọc đang bật`,
    loading: 'Đang tải...',
  },
  en: {
    title: 'Filter cards',
    keyword: 'Search by title...',
    labels: 'Labels',
    assignees: 'Assignees',
    allAssignees: 'All members',
    dueDate: 'Due date',
    allDue: 'All',
    overdue: 'Overdue',
    dueSoon: 'Due soon (≤ 2 days)',
    noDue: 'No due date',
    hasDue: 'Has due date',
    completed: 'Completed',
    clearAll: 'Clear filters',
    close: 'Close',
    active: (n) => `${n} filter${n !== 1 ? 's' : ''} active`,
    loading: 'Loading...',
  },
};

const EMPTY = { keyword: '', labels: [], dueStatus: '', assignees: [] };

export function countActiveFilters(f) {
  let n = 0;
  if (f.keyword?.trim())  n++;
  if (f.labels?.length)   n++;
  if (f.dueStatus)        n++;
  if (f.assignees?.length) n++;
  return n;
}

export function applyFilters(lists = [], filter = EMPTY) {
  if (countActiveFilters(filter) === 0) return lists;
  const kw  = filter.keyword?.trim().toLowerCase();
  const now = new Date();

  return lists.map((list) => ({
    ...list,
    cards: (list.cards || []).filter((card) => {
      // keyword
      if (kw && !card.title?.toLowerCase().includes(kw)) return false;

      // labels
      if (filter.labels?.length) {
        const cardLabelColors = (card.labels || []).map((label) => label.split(':')[0]);
        if (!filter.labels.some((sel) => cardLabelColors.includes(sel))) return false;
      }

      // assignees
      if (filter.assignees?.length) {
        const cardAssigneeIds = (card.assignees || []).map((a) => (a._id || a).toString());
        if (!filter.assignees.some((id) => cardAssigneeIds.includes(id))) return false;
      }

      // due date
      if (filter.dueStatus) {
        const due     = card.dueDate ? new Date(card.dueDate) : null;
        const diffDays = due ? (due - now) / (1000 * 60 * 60 * 24) : null;
        if (filter.dueStatus === 'overdue'  && !(due && due < now && !card.isCompleted)) return false;
        if (filter.dueStatus === 'due-soon' && !(due && diffDays >= 0 && diffDays <= 2 && !card.isCompleted)) return false;
        if (filter.dueStatus === 'no-due'   && due)  return false;
        if (filter.dueStatus === 'has-due'  && !due) return false;
        if (filter.dueStatus === 'completed' && !card.isCompleted) return false;
      }

      return true;
    }),
  }));
}

export default function FilterBar({ lang = 'vi', filter, onChange, onClose, workspaceId }) {
  const l       = L[lang] || L.vi;
  const active  = countActiveFilters(filter);
  const [members, setMembers] = useState([]);

  // Tải danh sách thành viên workspace để hiện filter assignee
  useEffect(() => {
    if (!workspaceId) return;
    apiClient.get(`/workspaces/${workspaceId}`)
      .then((res) => {
        const ws = res?.data ?? res;
        const ownerId   = ws.owner?._id || ws.owner;
        const ownerUser = ws.owner;
        const others    = (ws.members || [])
          .filter((m) => (m.user?._id || m.user)?.toString() !== ownerId?.toString())
          .map((m) => m.user)
          .filter(Boolean);
        const merged = [ownerUser, ...others].filter(Boolean);
        const seen   = new Set();
        setMembers(
          merged.filter((u) => {
            const id = (u?._id || u)?.toString();
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
        );
      })
      .catch(() => setMembers([]));
  }, [workspaceId]);

  const toggleLabel    = (colorId) => onChange({ ...filter, labels:    toggle(filter.labels || [],    colorId) });
  const toggleAssignee = (userId)  => onChange({ ...filter, assignees: toggle(filter.assignees || [], userId)  });

  const toggle = (arr, val) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const dueOptions = [
    { value: '',          label: l.allDue },
    { value: 'overdue',   label: l.overdue },
    { value: 'due-soon',  label: l.dueSoon },
    { value: 'has-due',   label: l.hasDue },
    { value: 'no-due',    label: l.noDue },
    { value: 'completed', label: l.completed },
  ];

  return (
    <div
      style={{
        width: 340,
        maxWidth: 'min(340px, calc(100vw - 32px))',
        maxHeight: 'min(520px, calc(100vh - 140px))',
        overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(13,20,36,.98), rgba(10,16,30,.98))',
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,.42)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{l.title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
            {active > 0 ? l.active(active) : l.clearAll}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY)}
              style={{ fontSize: 11, color: '#67e8f9', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
            >
              {l.clearAll}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '999px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Keyword */}
      <div style={{ marginBottom: 14 }}>
        <input
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)',
            color: 'white', fontSize: 13, outline: 'none',
          }}
          placeholder={l.keyword}
          value={filter.keyword || ''}
          onChange={(e) => onChange({ ...filter, keyword: e.target.value })}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(103,232,249,.45)'; }}
          onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; }}
        />
      </div>

      {/* Labels */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.56)', margin: '0 0 8px' }}>
          {l.labels}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LABEL_COLORS.map((color) => {
            const selected = (filter.labels || []).includes(color.id);
            return (
              <button
                key={color.id}
                type="button"
                title={color.name}
                onClick={() => toggleLabel(color.id)}
                style={{
                  minHeight: 28, padding: '0 12px', borderRadius: 999, background: color.hex,
                  border: selected ? '2px solid rgba(255,255,255,.95)' : '2px solid transparent',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'white',
                  transform: selected ? 'translateY(-1px)' : 'translateY(0)',
                }}
              >
                {selected ? '✓ ' : ''}{color.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignees */}
      {members.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.56)', margin: '0 0 8px' }}>
            {l.assignees}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.map((m) => {
              const uid      = (m?._id || m)?.toString();
              const name     = m?.name || 'User';
              const avatar   = m?.avatar;
              const selected = (filter.assignees || []).includes(uid);
              return (
                <button
                  key={uid}
                  type="button"
                  title={name}
                  onClick={() => toggleAssignee(uid)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                    borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selected ? 'rgba(52,211,153,.6)' : 'rgba(255,255,255,.12)',
                    background:  selected ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.05)',
                    color:       selected ? '#6ee7b7' : 'rgba(255,255,255,.75)',
                  }}
                >
                  {avatar ? (
                    <img src={avatar} alt={name} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: `hsl(${name.charCodeAt(0) * 17 % 360},60%,42%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {name[0].toUpperCase()}
                    </div>
                  )}
                  {name.split(' ').slice(-1)[0]}
                  {selected && <span style={{ marginLeft: 2 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Due date */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.56)', margin: '0 0 8px' }}>
          {l.dueDate}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dueOptions.map(({ value, label }) => {
            const selected = (filter.dueStatus || '') === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...filter, dueStatus: value })}
                style={{
                  padding: '9px 10px', borderRadius: 10, border: '1px solid transparent',
                  textAlign: 'left',
                  background: selected ? 'rgba(34,197,94,.14)' : 'rgba(255,255,255,.02)',
                  color:      selected ? '#86efac' : 'rgba(255,255,255,.72)',
                  cursor: 'pointer', fontSize: 12, fontWeight: selected ? 600 : 500,
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
