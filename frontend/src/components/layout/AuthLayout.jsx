// frontend/src/components/layout/AuthLayout.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export default function AuthLayout({ children }) {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="min-h-screen flex" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12"
        style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          {/* Logo + language switch */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="10" rx="2" fill="white" fillOpacity="0.9"/>
                  <rect x="14" y="3" width="7" height="6" rx="2" fill="white" fillOpacity="0.6"/>
                  <rect x="14" y="13" width="7" height="8" rx="2" fill="white" fillOpacity="0.9"/>
                  <rect x="3" y="17" width="7" height="4" rx="2" fill="white" fillOpacity="0.6"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {t('appName')}
              </span>
            </div>
            <div className="inline-flex rounded-full bg-white/5 border border-white/15 text-[10px] font-semibold overflow-hidden">
              <button
                type="button"
                className={`px-2 py-1 ${
                  language === 'vi'
                    ? 'bg-white text-slate-900'
                    : 'text-emerald-50/80 hover:bg-white/10'
                }`}
                onClick={() => setLanguage('vi')}
              >
                VI
              </button>
              <button
                type="button"
                className={`px-2 py-1 ${
                  language === 'en'
                    ? 'bg-white text-slate-900'
                    : 'text-emerald-50/80 hover:bg-white/10'
                }`}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Quản lý công việc<br/>
              <span style={{ background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                thông minh hơn.
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Tổ chức dự án, cộng tác nhóm và theo dõi tiến độ — tất cả trong một nơi.
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 space-y-4">
            {[
              { icon: '⚡', text: 'Kéo thả thẻ trực quan theo Kanban' },
              { icon: '🔴', text: 'Cập nhật thời gian thực qua Socket.io' },
              { icon: '👥', text: 'Cộng tác nhóm không giới hạn' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {f.icon}
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini board preview */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Dự án của bạn
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['Cần làm', 'Đang làm', 'Hoàn thành'].map((col, i) => (
              <div key={col} className="rounded-xl p-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full"
                    style={{ background: ['#f87171','#fb923c','#4ade80'][i] }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{col}</span>
                </div>
                {[1, 2].map((n) => (
                  <div key={n} className="h-5 rounded mb-1"
                    style={{ background: 'rgba(255,255,255,0.08)', width: n === 1 ? '80%' : '60%' }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="10" rx="2" fill="white"/>
                <rect x="14" y="3" width="7" height="6" rx="2" fill="white" fillOpacity="0.7"/>
                <rect x="14" y="13" width="7" height="8" rx="2" fill="white"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-white">{t('appName')}</span>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
          }}>
            {children}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} TaskFlow · Trello-like Task Management
          </p>
        </div>
      </div>
    </div>
  );
}