import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import { saveAuth, getRoleDashboard } from '../../hooks/useAuth';
import { demoCredentials } from '../../mock/mockData';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token, councilRole } = await authService.login(email, password);
      saveAuth(user, token);
      navigate(getRoleDashboard(user.role, councilRole));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ width: `${(i + 1) * 80}px`, height: `${(i + 1) * 80}px`, top: `${i * 15}%`, left: `${i * 10 - 10}%`, opacity: 0.3 }} />
          ))}
        </div>
        <div className="relative z-10 text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <img src="/logo.png" alt="Logo trường" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Hệ thống Quản lý<br />Nghiên cứu Khoa học</h1>
          <p className="text-blue-100 text-lg font-medium">Trường Đại học Mở TP. Hồ Chí Minh</p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[['1,248', 'Đề tài'], ['412', 'Đang thực hiện'], ['786', 'Đã nghiệm thu']].map(([num, label]) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="text-2xl font-black">{num}</div>
                <div className="text-blue-100 text-xs font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <header className="text-center mb-10">
            <img
              src="/logo.png"
              alt="Logo trường"
              className="h-16 mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Đăng nhập hệ thống</h1>
            <p className="text-gray-500 font-medium">Hệ thống Quản lý Nghiên cứu Khoa học</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="username">
                Email / Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Nhập email hoặc mã số của bạn"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showPwd ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm font-medium text-blue-600 hover:underline">Quên mật khẩu?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-button transition-all transform active:scale-[0.98] uppercase tracking-wide disabled:opacity-50"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">
              Tài khoản demo — click để điền
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {demoCredentials.map(cred => (
                <button
                  key={cred.email}
                  onClick={() => fillDemo(cred.email)}
                  className="text-left px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-primary hover:bg-primary-light transition-all"
                >
                  <p className="text-[11px] font-bold text-primary truncate">{cred.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{cred.email}</p>
                </button>
              ))}
            </div>
          </div>

          <footer className="mt-8 text-center">
            <a href="#" className="text-sm text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-2 group">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors" />
              Hướng dẫn đăng nhập dành cho Thành viên Hội đồng
            </a>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">© 2024 Khoa học & Công nghệ. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
