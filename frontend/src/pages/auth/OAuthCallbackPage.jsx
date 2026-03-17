// frontend/src/pages/auth/OAuthCallbackPage.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import authService from '@services/authService';
import toast from 'react-hot-toast';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAccessToken } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      toast.error('Đăng nhập thất bại. Vui lòng thử lại.');
      navigate('/login');
      return;
    }

    setAccessToken(token);
    authService.getMe()
      .then((user) => {
        useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        toast.success('Đăng nhập thành công!');
        navigate('/dashboard');
      })
      .catch(() => {
        toast.error('Không thể lấy thông tin người dùng.');
        navigate('/login');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Đang xử lý đăng nhập...
        </p>
      </div>
    </div>
  );
}