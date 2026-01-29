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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">
              Trello Clone
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </Link>
              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {user.name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                  >
                    Đăng xuất
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
