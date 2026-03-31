import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import { saveAuth, getRoleDashboard } from '../../hooks/useAuth';
import { demoCredentials } from '../../mock/mockData';
import AuthShell from './AuthShell';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [mustChangeMode, setMustChangeMode] = useState(false);
  const [mustCurrentPassword, setMustCurrentPassword] = useState('');
  const [mustNewPassword, setMustNewPassword] = useState('');
  const [postChangeRedirect, setPostChangeRedirect] = useState('/login');

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setError('');
    setSuccess('');
    setMustChangeMode(false);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { user, token, councilRole } = await authService.login(email, password);
      saveAuth(user, token);

      if (user.mustChangePassword) {
        setMustChangeMode(true);
        setMustCurrentPassword(password);
        setPostChangeRedirect(getRoleDashboard(user.role, councilRole));
      } else {
        navigate(getRoleDashboard(user.role, councilRole));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dang nhap that bai');
    } finally {
      setLoading(false);
    }
  };

  const handleMustChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authService.changePassword(mustCurrentPassword, mustNewPassword);
      setSuccess('Doi mat khau thanh cong. Dang chuyen huong...');
      navigate(postChangeRedirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Doi mat khau that bai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={mustChangeMode ? 'Doi mat khau lan dau' : 'Dang nhap he thong'} subtitle="He thong Quan ly Nghien cuu Khoa hoc">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium">{success}</div>}

      {!mustChangeMode && (
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="username">Email</label>
            <input
              id="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhap email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="password">Mat khau</label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-sm"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                {showPwd ? 'An' : 'Hien'}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-sm font-medium text-blue-600 hover:underline" onClick={() => navigate('/forgot-password')}>
              Quen mat khau?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-button transition-all transform active:scale-[0.98] uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? 'Dang dang nhap...' : 'Dang nhap'}
          </button>
        </form>
      )}

      {mustChangeMode && (
        <form onSubmit={handleMustChangePassword} className="space-y-5">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
            Tai khoan tam thoi can doi mat khau truoc khi su dung he thong.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="must-current">Mat khau hien tai</label>
            <input
              id="must-current"
              type="password"
              value={mustCurrentPassword}
              onChange={(e) => setMustCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="must-new">Mat khau moi</label>
            <input
              id="must-new"
              type="password"
              minLength={6}
              value={mustNewPassword}
              onChange={(e) => setMustNewPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-button transition-all uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? 'Dang cap nhat...' : 'Doi mat khau'}
          </button>
        </form>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Tai khoan demo</p>
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {demoCredentials.map((cred) => (
            <button
              key={cred.email}
              type="button"
              onClick={() => fillDemo(cred.email)}
              className="text-left px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-primary hover:bg-primary-light transition-all"
            >
              <p className="text-[11px] font-bold text-primary truncate">{cred.label}</p>
              <p className="text-[10px] text-gray-400 truncate">{cred.email}</p>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
