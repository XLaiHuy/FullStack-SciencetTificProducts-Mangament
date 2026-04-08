import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../hooks/useAuth';

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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-50" style={{ boxShadow: '4px 0px 24px 0px rgba(0,0,0,0.02)' }}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-[10px] font-black">
          {logoLetters}
        </div>
        <h2 className="font-bold text-slate-800 text-base">He thong NCKH</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-4 space-y-1">
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-button'
                  : 'text-slate-500 hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-300'}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-800 truncate">{user?.name || 'Nguoi dung'}</p>
            <p className="text-[11px] text-slate-500 font-medium truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full py-1.5 text-xs font-bold text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
        >
          Dang xuat
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

export const Topbar: React.FC<TopbarProps> = ({ searchPlaceholder = 'Tim kiem...' }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = 0;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">?</span>
          <input
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-primary transition-colors bg-gray-50 border border-gray-200 rounded-xl uppercase"
          >
            Thong bao
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white">
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thong bao moi</p>
              </div>
              <div className="px-4 py-6 text-center text-xs text-gray-500 bg-white">
                Chua co thong bao he thong.
              </div>
              <div className="p-3 border-t border-gray-100 bg-gray-50/30 text-center">
                <button className="text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-not-allowed" disabled>
                  Chua co du lieu thong bao
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
