import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import { saveAuth, getRoleDashboard } from '../../hooks/useAuth';
import { demoCredentials } from '../../mock/mockData';

type AuthMode = 'login' | 'forgot' | 'reset' | 'must_change';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetToken, setResetToken] = useState('');
  const [mustChangeCurrentPassword, setMustChangeCurrentPassword] = useState('');
  const [mustChangeNewPassword, setMustChangeNewPassword] = useState('');
  const [postChangeRedirect, setPostChangeRedirect] = useState('');

  useEffect(() => {
    const tokenFromQuery = searchParams.get('reset_token');
    if (tokenFromQuery) {
      setMode('reset');
      setResetToken(tokenFromQuery);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { user, token, councilRole } = await authService.login(email, password);
      saveAuth(user, token);

      if (user.mustChangePassword) {
        setMustChangeCurrentPassword(password);
        setMustChangeNewPassword('');
        setPostChangeRedirect(getRoleDashboard(user.role, councilRole));
        setMode('must_change');
        return;
      }

      navigate(getRoleDashboard(user.role, councilRole));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dang nhap that bai');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess('Neu email hop le, he thong da gui huong dan dat lai mat khau.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Khong gui duoc yeu cau quen mat khau');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authService.resetPassword(resetToken, password);
      setSuccess('Dat lai mat khau thanh cong. Vui long dang nhap lai.');
      setMode('login');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dat lai mat khau that bai');
    } finally {
      setLoading(false);
    }
  };

  const handleMustChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authService.changePassword(mustChangeCurrentPassword, mustChangeNewPassword);
      setSuccess('Doi mat khau thanh cong.');
      navigate(postChangeRedirect || '/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Doi mat khau that bai');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setError('');
    setSuccess('');
    setMode('login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: `${(i + 1) * 80}px`, height: `${(i + 1) * 80}px`, top: `${i * 15}%`, left: `${i * 10 - 10}%`, opacity: 0.3 }}
            />
          ))}
        </div>
        <div className="relative z-10 text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <img src="/logo.png" alt="Logo truong" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">He thong Quan ly<br />Nghien cuu Khoa hoc</h1>
          <p className="text-blue-100 text-lg font-medium">Truong Dai hoc Mo TP.HCM</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <header className="text-center mb-10">
            <img src="/logo.png" alt="Logo truong" className="h-16 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">
              {mode === 'forgot' ? 'Quen mat khau' : mode === 'reset' ? 'Dat lai mat khau' : mode === 'must_change' ? 'Doi mat khau lan dau' : 'Dang nhap he thong'}
            </h1>
            <p className="text-gray-500 font-medium">He thong Quan ly Nghien cuu Khoa hoc</p>
          </header>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium">{success}</div>}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="username">Email</label>
                <input
                  id="username"
                  type="text"
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
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    {showPwd ? 'An' : 'Hien'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-sm font-medium text-blue-600 hover:underline" onClick={() => setMode('forgot')}>
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

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhap email da dang ky"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-button transition-all uppercase tracking-wide disabled:opacity-50"
              >
                {loading ? 'Dang gui...' : 'Gui yeu cau'}
              </button>
              <button type="button" className="w-full text-sm text-gray-500 hover:text-primary" onClick={() => setMode('login')}>
                Quay lai dang nhap
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="reset-token">Reset token</label>
                <input
                  id="reset-token"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="reset-password">Mat khau moi</label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
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
              <button type="button" className="w-full text-sm text-gray-500 hover:text-primary" onClick={() => setMode('login')}>
                Quay lai dang nhap
              </button>
            </form>
          )}

          {mode === 'must_change' && (
            <form onSubmit={handleMustChange} className="space-y-5">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                Tai khoan tam thoi can doi mat khau truoc khi su dung he thong.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="must-current">Mat khau hien tai</label>
                <input
                  id="must-current"
                  type="password"
                  value={mustChangeCurrentPassword}
                  onChange={(e) => setMustChangeCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="must-new">Mat khau moi</label>
                <input
                  id="must-new"
                  type="password"
                  value={mustChangeNewPassword}
                  onChange={(e) => setMustChangeNewPassword(e.target.value)}
                  minLength={6}
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
