import { Link } from 'react-router-dom';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-6">
          <span className="text-2xl font-bold text-blue-600">Trello Clone</span>
        </Link>
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          © {new Date().getFullYear()} Trello-like Task Management
        </p>
      </div>
    </div>
  );
}
