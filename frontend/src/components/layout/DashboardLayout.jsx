import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col board-surface text-slate-100">
      <header className="bg-slate-900/40 border-b border-white/10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link
              to="/dashboard"
              className="text-xl font-semibold text-emerald-200"
            >
              Trello Clone
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-emerald-50/80 hover:text-white font-medium"
              >
                Dashboard
              </Link>
              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-emerald-50/70">
                    {user.name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                  >
                    Dang xuat
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
