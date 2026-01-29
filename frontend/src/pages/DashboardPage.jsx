import { Link } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-6">
        Xin chào, <strong>{user?.name || user?.email || 'User'}</strong>. Chọn workspace hoặc tạo mới để bắt đầu.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/workspace/new"
          className="card card-hover flex items-center justify-center min-h-[120px] border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-500 hover:text-primary-600"
        >
          + Tạo workspace mới
        </Link>
      </div>
    </div>
  );
}
