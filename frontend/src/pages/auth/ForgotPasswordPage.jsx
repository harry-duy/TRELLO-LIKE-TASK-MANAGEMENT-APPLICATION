import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '@services/authService';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }
    setIsLoading(true);
    setSent(false);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
      toast.success('Kiểm tra email để đặt lại mật khẩu');
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Quên mật khẩu</h1>
      {sent ? (
        <p className="text-gray-600 text-sm mb-4">
          Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn (trong môi trường dev có thể trả về token trực tiếp).
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-gray-600">
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </>
  );
}
