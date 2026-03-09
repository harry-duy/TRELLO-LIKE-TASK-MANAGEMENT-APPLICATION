// frontend/src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import toast from 'react-hot-toast';

const BACKEND_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

// Reusable input style
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      toast.success('Đăng nhập thành công');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'white' }}>
        Chào mừng trở lại 👋
      </h1>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Đăng nhập để tiếp tục với TaskFlow
      </p>

      {oauthError && (
        <div className="mb-4 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          Đăng nhập mạng xã hội thất bại. Vui lòng thử lại.
        </div>
      )}

      {/* OAuth Buttons — ĐẶT TRÊN CÙNG nổi bật hơn */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Google */}
        <button
          type="button"
          onClick={() => { window.location.href = `${BACKEND_URL}/api/auth/google`; }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            color: 'white', fontSize: '14px', fontWeight: '500',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={() => { window.location.href = `${BACKEND_URL}/api/auth/facebook`; }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '10px',
            border: '1px solid #1877F2',
            background: '#1877F2',
            color: 'white', fontSize: '14px', fontWeight: '500',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#166FE5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1877F2'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.793-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Facebook
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-5" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
          hoặc đăng nhập bằng email
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoading}
            style={{
              ...inputStyle,
              borderColor: focused === 'email' ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.12)',
              boxShadow: focused === 'email' ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.6)' }}>
              Mật khẩu
            </label>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none' }}>
              Quên mật khẩu?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused('')}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            style={{
              ...inputStyle,
              borderColor: focused === 'password' ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.12)',
              boxShadow: focused === 'password' ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%', padding: '11px',
            borderRadius: '10px', border: 'none',
            background: isLoading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white', fontSize: '14px', fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
            boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
          }}
        >
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="text-center mt-5" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
        Chưa có tài khoản?{' '}
        <Link to="/register" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none' }}>
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  );
}