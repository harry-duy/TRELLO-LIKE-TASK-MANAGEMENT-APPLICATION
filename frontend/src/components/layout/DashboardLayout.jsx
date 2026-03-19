import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useTranslation } from '../../hooks/useTranslation';
import AIAssistantWidget from '@components/ai/AIAssistantWidget';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col board-surface text-slate-100">
      {/* Top app bar giống thiết kế TaskFlow */}
      <header className="bg-slate-900/60 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo + workspace switch */}
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-xl font-semibold text-emerald-100 tracking-tight"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-400/90 text-slate-950 shadow">
                  ⚡
                </span>
                <span>{t('appName')}</span>
              </Link>
              <button className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-emerald-50 hover:bg-white/10">
                {t('organizationLabel')}
                <span className="text-white/60">▾</span>
              </button>
            </div>

            {/* Center: tabs + search */}
            <div className="flex-1 flex items-center gap-4 max-w-2xl">
              <nav className="hidden md:flex items-center gap-1 text-[11px] font-medium bg-white/5 rounded-full px-1 py-1">
                <button className="px-3 py-1 rounded-full bg-white text-slate-900 shadow-sm">
                  {t('workspaces')}
                </button>
                <button className="px-3 py-1 rounded-full text-emerald-50/85 hover:bg-white/10">
                  {t('recent')}
                </button>
                <button className="px-3 py-1 rounded-full text-emerald-50/85 hover:bg-white/10">
                  {t('starred')}
                </button>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-3 py-1 rounded-full text-emerald-50/85 hover:bg-white/10"
                  >
                    {t('admin')}
                  </Link>
                )}
              </nav>
              <div className="flex-1 hidden sm:flex items-center">
                <div className="w-full rounded-full bg-slate-900/40 border border-white/15 px-3 py-1.5 text-xs flex items-center gap-2 text-emerald-50/80">
                  <span className="text-white/40">🔍</span>
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    className="bg-transparent border-none outline-none text-emerald-50 placeholder:text-emerald-100/60 text-xs w-full"
                  />
                </div>
              </div>
            </div>

            {/* Right: language switch, actions, avatar */}
            <div className="flex items-center gap-3">
              {/* Language toggle */}
              <div className="inline-flex rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold overflow-hidden">
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

              <button className="hidden md:inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium hover:bg-white/20">
                {t('aiAssist')}
              </button>
              <button className="inline-flex items-center gap-1 rounded-full bg-white text-slate-900 px-3 py-1 text-[11px] font-semibold shadow">
                + {t('new')}
              </button>

              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-400/90 text-slate-900 text-[11px] font-semibold"
                  title={t('logout')}
                >
                  {(user.name || user.email || '?')
                    .toString()
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <AIAssistantWidget />
    </div>
  );
}
