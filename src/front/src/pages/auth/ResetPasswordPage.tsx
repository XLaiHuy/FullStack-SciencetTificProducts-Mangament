import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import AuthShell from './AuthShell';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      setSuccess('Dat lai mat khau thanh cong. Ban co the dang nhap lai.');
      window.setTimeout(() => navigate('/login'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dat lai mat khau that bai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Dat lai mat khau" subtitle="Nhap token va mat khau moi">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="reset-token">Token</label>
          <input
            id="reset-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="reset-new-password">Mat khau moi</label>
          <input
            id="reset-new-password"
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-button transition-all uppercase tracking-wide disabled:opacity-50"
        >
          {loading ? 'Dang cap nhat...' : 'Dat lai mat khau'}
        </button>
        <button type="button" className="w-full text-sm text-gray-500 hover:text-primary" onClick={() => navigate('/login')}>
          Quay lai dang nhap
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
