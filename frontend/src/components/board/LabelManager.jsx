// frontend/src/components/board/LabelManager.jsx
// ✅ Tạo/sửa/gán label có màu cho card

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ─── 10 màu preset ─── */
export const LABEL_COLORS = [
  { id: 'green',    hex: '#22c55e', name: 'Xanh lá' },
  { id: 'yellow',   hex: '#eab308', name: 'Vàng' },
  { id: 'orange',   hex: '#f97316', name: 'Cam' },
  { id: 'red',      hex: '#ef4444', name: 'Đỏ' },
  { id: 'pink',     hex: '#ec4899', name: 'Hồng' },
  { id: 'purple',   hex: '#a855f7', name: 'Tím' },
  { id: 'blue',     hex: '#3b82f6', name: 'Xanh dương' },
  { id: 'sky',      hex: '#06b6d4', name: 'Xanh nhạt' },
  { id: 'lime',     hex: '#84cc16', name: 'Xanh neon' },
  { id: 'gray',     hex: '#6b7280', name: 'Xám' },
];

/* ─── Parse label string: "red:Ưu tiên cao" hoặc "red" ─── */
export function parseLabel(raw = '') {
  const [colorId, ...rest] = raw.split(':');
  const color = LABEL_COLORS.find(c => c.id === colorId) || LABEL_COLORS[0];
  return { colorId: color.id, hex: color.hex, text: rest.join(':') || '' };
}

export function makeLabelString(colorId, text = '') {
  return text.trim() ? `${colorId}:${text.trim()}` : colorId;
}

/* ─── Label chip (dùng trong CardItem + CardModal) ─── */
export function LabelChip({ raw, size = 'md', onClick }) {
  const { hex, text } = parseLabel(raw);
  const h = size === 'sm' ? '6px' : '8px';
  const minW = size === 'sm' ? '32px' : '40px';
  return (
    <div
      onClick={onClick}
      title={text || raw}
      style={{
        display: 'inline-flex', alignItems: 'center',
        height: h, minWidth: minW, borderRadius: 99,
        background: hex, cursor: onClick ? 'pointer' : 'default',
        padding: text && size !== 'sm' ? '0 8px' : 0,
        transition: 'filter .15s',
        fontSize: 10, fontWeight: 700, color: 'white',
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.filter = '')}
    >
      {size !== 'sm' && text}
    </div>
  );
}

/* ─── Popover chỉnh 1 label ─── */
function LabelEditor({ label, onSave, onDelete, onClose }) {
  const [colorId, setColorId] = useState(label?.colorId || 'green');
  const [text, setText] = useState(label?.text || '');

  return (
    <div style={{ padding: 16, minWidth: 260 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 10 }}>
        {label ? 'Sửa nhãn' : 'Tạo nhãn mới'}
      </p>

      {/* Preview */}
      <div style={{ height: 32, borderRadius: 8, background: LABEL_COLORS.find(c => c.id === colorId)?.hex, marginBottom: 12, transition: 'background .2s', display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{text || 'Preview'}</span>
      </div>

      {/* Text */}
      <input
        className="pfd-inp"
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: 'white', fontSize: 13, outline: 'none' }}
        placeholder="Tên nhãn (tùy chọn)"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSave(makeLabelString(colorId, text))}
      />

      {/* Colors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 14 }}>
        {LABEL_COLORS.map(c => (
          <button key={c.id} type="button" onClick={() => setColorId(c.id)}
            title={c.name}
            style={{
              height: 28, borderRadius: 6, background: c.hex, border: colorId === c.id ? '3px solid white' : '3px solid transparent',
              cursor: 'pointer', transition: 'transform .1s', transform: colorId === c.id ? 'scale(1.08)' : 'scale(1)',
            }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onSave(makeLabelString(colorId, text))}
          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          {label ? 'Lưu' : 'Tạo'}
        </button>
        {label && (
          <button type="button" onClick={onDelete}
            style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,.2)', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
            Xóa
          </button>
        )}
        <button type="button" onClick={onClose}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', fontSize: 13 }}>
          Huỷ
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN: LabelManager popover ─── */
// Props:
//   labels: string[]          — labels hiện tại của card
//   onUpdate(newLabels): void — callback khi thay đổi
//   trigger: ReactNode        — button để mở
export default function LabelManager({ labels = [], onUpdate, trigger }) {
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(null); // null | { idx, colorId, text }
  const [creating, setCreating] = useState(false);
  const ref    = useRef(null);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const openPopover = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 290) });
    }
    setOpen(v => !v);
    setEditing(null); setCreating(false);
  };

  const toggleLabel = (raw) => {
    const exists = labels.includes(raw);
    const newLabels = exists ? labels.filter(l => l !== raw) : [...labels, raw];
    onUpdate(newLabels);
  };

  const saveEdit = (newRaw) => {
    if (editing !== null) {
      const next = [...labels];
      next[editing.idx] = newRaw;
      onUpdate(next);
    }
    setEditing(null); setCreating(false);
  };

  const deleteLabel = (idx) => {
    onUpdate(labels.filter((_, i) => i !== idx));
    setEditing(null);
  };

  const addNew = (raw) => {
    onUpdate([...labels, raw]);
    setCreating(false);
  };

  /* Tất cả label preset + label custom đã tạo */
  const allPresets = LABEL_COLORS.map(c => c.id);

  return (
    <>
      <span ref={btnRef} onClick={openPopover} style={{ cursor: 'pointer', display: 'inline-flex' }}>
        {trigger}
      </span>

      {open && createPortal(
        <div ref={ref} style={{
          position: 'fixed', top: pos.top, left: pos.left,
          zIndex: 9999, minWidth: 260,
          background: 'linear-gradient(160deg,rgba(13,20,36,.99),rgba(8,28,25,.99))',
          border: '1px solid rgba(255,255,255,.12)', borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
          animation: 'lm-in .15s ease-out',
          overflow: 'hidden',
        }}>
          <style>{`@keyframes lm-in{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>

          {creating ? (
            <LabelEditor onSave={addNew} onClose={() => setCreating(false)} />
          ) : editing !== null ? (
            <LabelEditor
              label={editing}
              onSave={saveEdit}
              onDelete={() => deleteLabel(editing.idx)}
              onClose={() => setEditing(null)}
            />
          ) : (
            <div style={{ padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(167,243,208,.5)', marginBottom: 10 }}>
                NHÃN
              </p>

              {/* Existing labels on card */}
              {labels.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {labels.map((raw, idx) => {
                    const { hex, text, colorId } = parseLabel(raw);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ flex: 1, height: 32, borderRadius: 8, background: hex, display: 'flex', alignItems: 'center', paddingLeft: 12, cursor: 'pointer' }}
                          onClick={() => toggleLabel(raw)}>
                          <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{text || colorId}</span>
                        </div>
                        <button type="button"
                          onClick={() => setEditing({ idx, colorId, text })}
                          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 13 }}>
                          ✎
                        </button>
                      </div>
                    );
                  })}
                  <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,.08)' }} />
                </div>
              )}

              {/* Preset colors to quick-add */}
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginBottom: 6 }}>Thêm nhanh</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginBottom: 10 }}>
                {LABEL_COLORS.map(c => {
                  const raw = c.id;
                  const active = labels.some(l => parseLabel(l).colorId === c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => {
                      if (active) onUpdate(labels.filter(l => parseLabel(l).colorId !== c.id));
                      else onUpdate([...labels, raw]);
                    }}
                      title={c.name}
                      style={{
                        height: 26, borderRadius: 6, background: c.hex,
                        border: active ? '2px solid white' : '2px solid transparent',
                        cursor: 'pointer', position: 'relative',
                      }}>
                      {active && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={() => setCreating(true)}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed rgba(255,255,255,.2)', background: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 13 }}>
                + Tạo nhãn tùy chỉnh
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}