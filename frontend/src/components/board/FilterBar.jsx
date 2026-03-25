import { LABEL_COLORS } from '@components/board/LabelManager';

const L = {
  vi: {
    title: 'Lọc thẻ',
    keyword: 'Tìm theo tên...',
    labels: 'Nhãn',
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
  },
  en: {
    title: 'Filter cards',
    keyword: 'Search by title...',
    labels: 'Labels',
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

export function applyFilters(lists = [], filter = EMPTY) {
  if (countActiveFilters(filter) === 0) return lists;

  const kw = filter.keyword?.trim().toLowerCase();
  const now = new Date();

  return lists.map((list) => ({
    ...list,
    cards: (list.cards || []).filter((card) => {
      if (kw && !card.title?.toLowerCase().includes(kw)) return false;

      if (filter.labels?.length) {
        const cardLabelColors = (card.labels || []).map((label) => label.split(':')[0]);
        if (!filter.labels.some((selected) => cardLabelColors.includes(selected))) return false;
      }

      if (filter.dueStatus) {
        const due = card.dueDate ? new Date(card.dueDate) : null;
        const diffDays = due ? (due - now) / (1000 * 60 * 60 * 24) : null;

        if (filter.dueStatus === 'overdue' && !(due && due < now && !card.isCompleted)) return false;
        if (filter.dueStatus === 'due-soon' && !(due && diffDays >= 0 && diffDays <= 2 && !card.isCompleted)) return false;
        if (filter.dueStatus === 'no-due' && due) return false;
        if (filter.dueStatus === 'has-due' && !due) return false;
        if (filter.dueStatus === 'completed' && !card.isCompleted) return false;
      }

      return true;
    }),
  }));
}

export default function FilterBar({ lang = 'vi', filter, onChange, onClose }) {
  const l = L[lang] || L.vi;
  const active = countActiveFilters(filter);

  const toggleLabel = (colorId) => {
    const current = filter.labels || [];
    const next = current.includes(colorId)
      ? current.filter((item) => item !== colorId)
      : [...current, colorId];

    onChange({ ...filter, labels: next });
  };

  const dueOptions = [
    { value: '', label: l.allDue },
    { value: 'overdue', label: l.overdue },
    { value: 'due-soon', label: l.dueSoon },
    { value: 'has-due', label: l.hasDue },
    { value: 'no-due', label: l.noDue },
    { value: 'completed', label: l.completed },
  ];

  return (
    <div
      style={{
        width: 320,
        maxWidth: 'min(320px, calc(100vw - 32px))',
        maxHeight: 'min(440px, calc(100vh - 140px))',
        overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(13,20,36,.98), rgba(10,16,30,.98))',
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,.42)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{l.title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
            {active > 0 ? l.active(active) : l.clearAll}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {active > 0 ? (
            <button
              type="button"
              onClick={() => onChange(EMPTY)}
              style={{
                fontSize: 11,
                color: '#67e8f9',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 600,
              }}
            >
              {l.clearAll}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label={l.close}
            style={{
              width: 28,
              height: 28,
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.08)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.06)',
            color: 'white',
            fontSize: 13,
            outline: 'none',
          }}
          placeholder={l.keyword}
          value={filter.keyword || ''}
          onChange={(e) => onChange({ ...filter, keyword: e.target.value })}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(103,232,249,.45)';
            e.target.style.background = 'rgba(255,255,255,.08)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,.1)';
            e.target.style.background = 'rgba(255,255,255,.06)';
          }}
        />
      </div>

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
                  minHeight: 28,
                  padding: '0 12px',
                  borderRadius: 999,
                  background: color.hex,
                  border: selected ? '2px solid rgba(255,255,255,.95)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'white',
                  transform: selected ? 'translateY(-1px)' : 'translateY(0)',
                  boxShadow: selected ? '0 10px 20px rgba(0,0,0,.2)' : 'none',
                }}
              >
                {selected ? '✓ ' : ''}
                {color.name}
              </button>
            );
          })}
        </div>
      </div>

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
                  padding: '9px 10px',
                  borderRadius: 10,
                  border: '1px solid transparent',
                  textAlign: 'left',
                  background: selected ? 'rgba(34,197,94,.14)' : 'rgba(255,255,255,.02)',
                  color: selected ? '#86efac' : 'rgba(255,255,255,.72)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: selected ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,.06)';
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,.02)';
                }}
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
