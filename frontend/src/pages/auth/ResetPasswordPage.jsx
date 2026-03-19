import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import authService from '@services/authService';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error(t('invalidResetLink'));
      return;
    }

    if (!password || !confirmPassword) {
      toast.error(t('passwordRequired'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      toast.success(t('resetPasswordSuccess'));
      navigate('/login');
    } catch (err) {
      toast.error(err?.message || t('resetPasswordError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('resetPasswordTitle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('newPasswordLabel')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder={t('passwordMinPlaceholder')}
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            {t('confirmNewPasswordLabel')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
          {isLoading ? t('resettingPassword') : t('resetPasswordButton')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          {t('authBackToLogin')}
        </Link>
      </p>
    </>
  );
}
