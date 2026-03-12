import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import authService from '@services/authService';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Link đặt lại mật khẩu không hợp lệ');
      return;
    }

    if (!password || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ mật khẩu');
      return;
    }

    if (password.length < 8) {
      toast.error('Mật khẩu tối thiểu 8 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      toast.success('Đặt lại mật khẩu thành công');
      navigate('/login');
    } catch (err) {
      toast.error(err?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Đặt lại mật khẩu</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="Tối thiểu 8 ký tự"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Xác nhận mật khẩu mới
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
          {isLoading ? 'Đang cập nhật...' : 'Xác nhận'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </>
  );
}
