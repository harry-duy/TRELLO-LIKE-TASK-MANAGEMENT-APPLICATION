// frontend/src/components/board/FilterBar.jsx
// ✅ Filter cards by label, due date, keyword — trả về filterState cho BoardCanvas

import { useState } from 'react';
import { LABEL_COLORS } from '@components/board/LabelManager';

/* ─── i18n ─── */
const L = {
  vi: {
    title:       'Lọc thẻ',
    keyword:     'Tìm theo tên...',
    labels:      'Nhãn',
    dueDate:     'Hạn chót',
    allDue:      'Tất cả',
    overdue:     '⚠ Quá hạn',
    dueSoon:     '⏰ Sắp hạn (≤2 ngày)',
    noDue:       'Không có hạn',
    hasDue:      'Có hạn chót',
    completed:   '✓ Đã hoàn thành',
    clearAll:    'Xoá bộ lọc',
    close:       'Đóng',
    active:      n => `${n} bộ lọc đang bật`,
  },
  en: {
    title:       'Filter cards',
    keyword:     'Search by title...',
    labels:      'Labels',
    dueDate:     'Due date',
    allDue:      'All',
    overdue:     '⚠ Overdue',
    dueSoon:     '⏰ Due soon (≤2 days)',
    noDue:       'No due date',
    hasDue:      'Has due date',
    completed:   '✓ Completed',
    clearAll:    'Clear filters',
    close:       'Close',
    active:      n => `${n} filter${n !== 1 ? 's' : ''} active`,
  },
};

const EMPTY = { keyword: '', labels: [], dueStatus: '' };

export function countActiveFilters(f) {
  let n = 0;
  if (f.keyword?.trim()) n++;
  if (f.labels?.length) n++;
  if (f.dueStatus) n++;
  return n;
}

/* ─── Apply filter to lists ─── */
export function applyFilters(lists = [], filter = EMPTY) {
  if (countActiveFilters(filter) === 0) return lists;
  const kw  = filter.keyword?.trim().toLowerCase();
  const now = new Date();

  return lists.map(list => ({
    ...list,
    cards: (list.cards || []).filter(card => {
      // keyword
      if (kw && !card.title?.toLowerCase().includes(kw)) return false;

      // labels
      if (filter.labels?.length) {
        const cardLabelColors = (card.labels || []).map(l => l.split(':')[0]);
        if (!filter.labels.some(f => cardLabelColors.includes(f))) return false;
      }

      // due status
      if (filter.dueStatus) {
        const due = card.dueDate ? new Date(card.dueDate) : null;
        const diffDays = due ? (due - now) / (1000 * 60 * 60 * 24) : null;

        if (filter.dueStatus === 'overdue'    && !(due && due < now && !card.isCompleted)) return false;
        if (filter.dueStatus === 'due-soon'   && !(due && diffDays >= 0 && diffDays <= 2 && !card.isCompleted)) return false;
        if (filter.dueStatus === 'no-due'     && due) return false;
        if (filter.dueStatus === 'has-due'    && !due) return false;
        if (filter.dueStatus === 'completed'  && !card.isCompleted) return false;
      }

      return true;
    }),
  }));
}

/* ─── MAIN COMPONENT ─── */
export default function FilterBar({ lang = 'vi', filter, onChange, onClose }) {
  const l = L[lang] || L.vi;
  const active = countActiveFilters(filter);

  const toggleLabel = (colorId) => {
    const cur = filter.labels || [];
    const next = cur.includes(colorId) ? cur.filter(c => c !== colorId) : [...cur, colorId];
    onChange({ ...filter, labels: next });
  };

  return (
    <div style={{
      background: 'rgba(13,20,36,.98)', border: '1px solid rgba(255,255,255,.12)',
      borderRadius: 14, padding: 14, minWidth: 280,
      boxShadow: '0 20px 50px rgba(0,0,0,.5)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{l.title}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {active > 0 && (
            <button type="button" onClick={() => onChange(EMPTY)}
              style={{ fontSize: 11, color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {l.clearAll}
            </button>
          )}
          <button type="button" onClick={onClose}
            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
            ✕
          </button>
        </div>
      </div>

      {/* Active filter count */}
      {active > 0 && (
        <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)', color: '#34d399', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
          {l.active(active)}
        </div>
      )}

      {/* Keyword */}
      <div style={{ marginBottom: 14 }}>
        <input
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: 'white', fontSize: 13, outline: 'none' }}
          placeholder={l.keyword}
          value={filter.keyword || ''}
          onChange={e => onChange({ ...filter, keyword: e.target.value })}
          onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.1)'}
        />
      </div>

      {/* Labels */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 8 }}>{l.labels}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {LABEL_COLORS.map(c => {
            const active = (filter.labels || []).includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggleLabel(c.id)}
                title={c.name}
                style={{
                  height: 24, minWidth: 40, borderRadius: 999, padding: '0 10px',
                  background: c.hex, border: active ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'white',
                  transform: active ? 'scale(1.08)' : 'scale(1)', transition: 'all .15s',
                }}>
                {active ? '✓' : ''} {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Due date */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 8 }}>{l.dueDate}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { v: '',           label: l.allDue },
            { v: 'overdue',    label: l.overdue },
            { v: 'due-soon',   label: l.dueSoon },
            { v: 'has-due',    label: l.hasDue },
            { v: 'no-due',     label: l.noDue },
            { v: 'completed',  label: l.completed },
          ].map(({ v, label }) => {
            const sel = (filter.dueStatus || '') === v;
            return (
              <button key={v} type="button" onClick={() => onChange({ ...filter, dueStatus: v })}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
                  background: sel ? 'rgba(52,211,153,.15)' : 'none',
                  color: sel ? '#34d399' : 'rgba(255,255,255,.7)',
                  cursor: 'pointer', fontSize: 12, fontWeight: sel ? 600 : 400,
                  transition: 'all .12s',
                }}
                onMouseEnter={e => !sel && (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                onMouseLeave={e => !sel && (e.currentTarget.style.background = 'none')}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}