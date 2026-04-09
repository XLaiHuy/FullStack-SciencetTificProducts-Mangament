import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import AuthShell from './AuthShell';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess('Nếu email hợp lệ, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email để nhận hướng dẫn đặt lại mật khẩu">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email đã đăng ký"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-button transition-all uppercase tracking-wide disabled:opacity-50"
        >
          {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
        <button type="button" className="w-full text-sm text-gray-500 hover:text-primary" onClick={() => navigate('/login')}>
          Quay lại đăng nhập
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
