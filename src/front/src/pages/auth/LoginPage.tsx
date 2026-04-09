import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import { saveAuth, getRoleDashboard } from '../../hooks/useAuth';
import { prefetchRoleModules } from '../../utils/rolePrefetch';
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
      prefetchRoleModules(user.role, councilRole ?? user.councilRole ?? null);

      if (user.mustChangePassword) {
        setMustChangeMode(true);
        setMustCurrentPassword(password);
        setPostChangeRedirect(getRoleDashboard(user.role, councilRole));
      } else {
        navigate(getRoleDashboard(user.role, councilRole));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
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
      setSuccess('Đổi mật khẩu thành công. Đang chuyển hướng...');
      navigate(postChangeRedirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={mustChangeMode ? 'Đổi mật khẩu lần đầu' : 'Đăng nhập hệ thống'} subtitle="Hệ thống Quản lý Nghiên cứu Khoa học">
      {error && <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl text-sm text-error-700 font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-xl text-sm text-success-700 font-medium">{success}</div>}

      {!mustChangeMode && (
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="username">Email</label>
            <input
              id="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              required
              className="form-input py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="password">Mật khẩu</label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input py-3"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors">
                {showPwd ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-sm font-semibold text-primary hover:text-primary-dark hover:underline" onClick={() => navigate('/forgot-password')}>
              Quên mật khẩu?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary hover:brightness-95 text-white font-bold py-3.5 rounded-xl shadow-button transition-all transform active:scale-[0.98] uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      )}

      {mustChangeMode && (
        <form onSubmit={handleMustChangePassword} className="space-y-5">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
            Tài khoản tạm thời cần đổi mật khẩu trước khi sử dụng hệ thống.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="must-current">Mật khẩu hiện tại</label>
            <input
              id="must-current"
              type="password"
              value={mustCurrentPassword}
              onChange={(e) => setMustCurrentPassword(e.target.value)}
              required
              className="form-input py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="must-new">Mật khẩu mới</label>
            <input
              id="must-new"
              type="password"
              minLength={6}
              value={mustNewPassword}
              onChange={(e) => setMustNewPassword(e.target.value)}
              required
              className="form-input py-3"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary hover:brightness-95 text-white font-bold py-3.5 rounded-xl shadow-button transition-all uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>
      )}

      <div className="mt-8 p-4 bg-white rounded-2xl border border-primary-100 shadow-card">
        <p className="text-[11px] font-bold text-primary-700 uppercase tracking-wider mb-3 text-center">Tài khoản demo</p>
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {demoCredentials.map((cred) => (
            <button
              key={cred.email}
              type="button"
              onClick={() => fillDemo(cred.email)}
              className="text-left px-3 py-2 bg-white border border-primary-100 rounded-xl hover:border-primary hover:bg-primary-light transition-all"
            >
              <p className="text-[11px] font-bold text-primary-dark truncate">{cred.label}</p>
              <p className="text-[10px] text-gray-500 truncate">{cred.email}</p>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
