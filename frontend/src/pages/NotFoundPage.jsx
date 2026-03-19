import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export default function NotFoundPage() {
  const { language, setLanguage } = useTranslation();

  const title = language === 'vi' ? 'Trang không tồn tại' : 'Page not found';
  const backText = language === 'vi' ? 'Về Dashboard' : 'Back to dashboard';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 relative">
      <div className="absolute top-4 right-4 inline-flex rounded-full bg-slate-900/80 text-white text-xs overflow-hidden shadow">
        <button
          type="button"
          className={`px-2 py-1 ${language === 'vi' ? 'bg-white text-slate-900' : 'text-slate-100/80'}`}
          onClick={() => setLanguage('vi')}
        >
          VI
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${language === 'en' ? 'bg-white text-slate-900' : 'text-slate-100/80'}`}
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
      </div>

      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-600 mt-2">{title}</p>
      <Link to="/dashboard" className="mt-6 btn btn-primary">
        {backText}
      </Link>
    </div>
  );
}
