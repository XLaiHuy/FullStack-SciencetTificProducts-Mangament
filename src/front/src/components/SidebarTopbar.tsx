import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../hooks/useAuth';
import { prefetchRouteByPath } from '../utils/routePrefetch';

interface SidebarItem { label: string; path: string; }

interface SidebarProps {
  items: SidebarItem[];
  roleLabel: string;
  logoLetters?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, roleLabel, logoLetters = 'NCKH' }) => {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'NV';

  return (
    <aside className="w-72 bg-gradient-to-b from-primary-50 via-white to-info-50/40 border-r border-primary-100 flex flex-col fixed h-full z-50 shadow-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-white text-sm font-black shadow-lg">
            {logoLetters}
          </div>
          <div>
            <h1 className="font-bold text-primary-dark text-sm">NCKH 2026</h1>
            <p className="text-xs text-primary-700">Cổng NCKH</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onMouseEnter={() => prefetchRouteByPath(item.path)}
            onFocus={() => prefetchRouteByPath(item.path)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-primary text-white shadow-md'
                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary-dark'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-primary-100 bg-white/95">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-50 cursor-pointer transition-colors">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-dark truncate">{user?.name || 'Người dùng'}</p>
            <p className="text-xs text-primary-700 truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full py-2 text-xs font-bold text-primary-dark border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};

// ============================================================
// TOPBAR
// ============================================================
interface TopbarProps {
  searchPlaceholder?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ searchPlaceholder = 'Tìm kiếm...' }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = 0;

  return (
    <header className="h-16 bg-white/95 border-b border-primary-100 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-primary-400 text-lg">🔍</span>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-primary-100 rounded-lg text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary transition-all"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-8">
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative px-4 py-2 text-xs font-bold text-primary-700 hover:text-primary-dark transition-colors bg-primary-50 border border-primary-100 rounded-lg uppercase tracking-wider"
          >
            🔔 Thông báo
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-error-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-primary-100 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-primary-100 bg-primary-50">
                <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Thông báo mới</p>
              </div>
              <div className="px-4 py-8 text-center text-sm text-gray-500 bg-white">
                Chưa có thông báo hệ thống.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
