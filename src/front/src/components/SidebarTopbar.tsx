import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../hooks/useAuth';
import { prefetchRouteByPath } from '../utils/routePrefetch';
import { notificationService, type NotificationItem } from '../services/api/notificationService';

interface SidebarItem { label: string; path: string; }

interface SidebarProps {
  items: SidebarItem[];
  roleLabel: string;
  logoLetters?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, roleLabel }) => {
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
          <img src="/LoGoOu.png" alt="Logo Cổng NCKH Trường ĐH Mở TPHCM" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-bold text-primary-dark text-sm">Cổng NCKH</h1>
            <p className="text-xs text-primary-700">Trường ĐH Mở TPHCM</p>
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
  const LAST_SEEN_KEY = 'nckh_notification_last_seen_at';

  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => localStorage.getItem(LAST_SEEN_KEY) || new Date().toISOString());

  const persistLastSeen = (value: string) => {
    setLastSeenAt(value);
    localStorage.setItem(LAST_SEEN_KEY, value);
  };

  const loadUnread = async () => {
    try {
      const res = await notificationService.list(1, 30);
      const newCount = (res.items ?? []).filter((item) => new Date(item.createdAt).getTime() > new Date(lastSeenAt).getTime()).length;
      setUnread(newCount);
    } catch {
      setUnread(0);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationService.list(1, 30);
      const freshItems = (res.items ?? [])
        .filter((item) => new Date(item.createdAt).getTime() > new Date(lastSeenAt).getTime())
        .slice(0, 6);
      setNotifs(freshItems);
      setUnread(freshItems.length);
    } catch {
      setNotifs([]);
    }
  };

  useEffect(() => {
    loadUnread().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!showNotifs) return;
    loadNotifications().catch(() => undefined);
    loadUnread().catch(() => undefined);
  }, [showNotifs, lastSeenAt]);

  useEffect(() => {
    const refresh = () => {
      loadUnread().catch(() => undefined);
      if (showNotifs) {
        loadNotifications().catch(() => undefined);
      }
    };

    const timer = window.setInterval(refresh, 15000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [showNotifs, lastSeenAt]);

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifs((current) => current.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setNotifs((current) => current.filter((n) => n.id !== id));
      setUnread((current) => Math.max(0, current - 1));
    } catch {
      // Ignore dropdown mark-read errors to keep UI responsive
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifs([]);
      setUnread(0);
      persistLastSeen(new Date().toISOString());
    } catch {
      // Ignore dropdown mark-all errors to avoid blocking UX
    }
  };

  const formatRelative = (iso: string) => {
    const created = new Date(iso).getTime();
    const deltaMinutes = Math.max(1, Math.floor((Date.now() - created) / (1000 * 60)));
    if (deltaMinutes < 60) return `${deltaMinutes} phút trước`;
    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return `${deltaHours} giờ trước`;
    const deltaDays = Math.floor(deltaHours / 24);
    return `${deltaDays} ngày trước`;
  };

  const notifTone = (type: NotificationItem['type']) => {
    if (type === 'warning') return 'bg-warning-50 border-warning-200';
    if (type === 'request') return 'bg-info-50 border-info-200';
    return 'bg-gray-50 border-gray-200';
  };

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
            onClick={() => {
              if (showNotifs) {
                persistLastSeen(new Date().toISOString());
                setNotifs([]);
                setUnread(0);
              }
              setShowNotifs(!showNotifs);
            }}
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
              <div className="px-4 py-3 border-b border-primary-100 bg-primary-50 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Thông báo mới</p>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-primary-700 hover:text-primary-900"
                >
                  Đọc hết
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto bg-white">
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">Chưa có thông báo hệ thống.</div>
                ) : (
                  <div className="space-y-2 p-3">
                    {notifs.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => markRead(notif.id)}
                        className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${notifTone(notif.type)} ${notif.isRead ? 'opacity-70' : ''}`}
                      >
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2">{notif.message}</p>
                        <p className="text-[11px] text-gray-600 mt-1">{formatRelative(notif.createdAt)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
