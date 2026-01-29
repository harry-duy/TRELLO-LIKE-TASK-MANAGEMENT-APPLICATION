import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-600 mt-2">Trang không tồn tại</p>
      <Link
        to="/dashboard"
        className="mt-6 btn btn-primary"
      >
        Về Dashboard
      </Link>
    </div>
  );
}
