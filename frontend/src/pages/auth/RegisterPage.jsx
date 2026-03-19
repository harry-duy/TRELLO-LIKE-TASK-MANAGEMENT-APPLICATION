import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from '@hooks/useTranslation';

const BACKEND_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

export default function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error(t('registerRequiredFields'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('passwordMinLength'));
      return;
    }

    setIsLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      toast.success(t('registerSuccess'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.message || t('registerError'));
    } finally {
      setIsLoading(false);
    }
  };

  const getFocusStyle = (field) => ({
    borderColor: focused === field ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.12)',
    boxShadow: focused === field ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
  });

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'white' }}>
        {t('registerTitle')} 🚀
      </h1>
      <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {t('registerSubtitle')}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => {
            window.location.href = `${BACKEND_URL}/api/auth/google`;
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = `${BACKEND_URL}/api/auth/facebook`;
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid #1877F2',
            background: '#1877F2',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.793-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {t('registerWithEmail')}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          {
            label: t('fullNameLabel'),
            value: name,
            onChange: setName,
            field: 'name',
            type: 'text',
            placeholder: t('fullNamePlaceholder'),
          },
          {
            label: 'Email',
            value: email,
            onChange: setEmail,
            field: 'email',
            type: 'email',
            placeholder: 'you@example.com',
          },
          {
            label: t('passwordLabel'),
            value: password,
            onChange: setPassword,
            field: 'password',
            type: 'password',
            placeholder: t('passwordMinPlaceholder'),
          },
          {
            label: t('confirmPasswordLabel'),
            value: confirmPassword,
            onChange: setConfirmPassword,
            field: 'confirm',
            type: 'password',
            placeholder: '••••••••',
          },
        ].map(({ label, value, onChange, field, type, placeholder }) => (
          <div key={field}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '5px',
              }}
            >
              {label}
            </label>
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(field)}
              onBlur={() => setFocused('')}
              placeholder={placeholder}
              disabled={isLoading}
              style={{ ...inputStyle, ...getFocusStyle(field) }}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '11px',
            marginTop: '4px',
            borderRadius: '10px',
            border: 'none',
            background: isLoading
              ? 'rgba(139,92,246,0.5)'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
          }}
        >
          {isLoading ? t('registering') : t('createAccountButton')}
        </button>
      </form>

      <p className="text-center mt-4" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
        {t('haveAccount')}{' '}
        <Link to="/login" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none' }}>
          {t('loginButton')}
        </Link>
      </p>
    </div>
  );
}
