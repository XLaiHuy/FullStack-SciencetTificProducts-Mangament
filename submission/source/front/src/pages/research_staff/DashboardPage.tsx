import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import type { Project } from '../../types';
import { projectService } from '../../services/api/projectService';
import { reportService } from '../../services/api/reportService';
import { notificationService, type NotificationItem } from '../../services/api/notificationService';

const ProjectStatusDonut = lazy(() => import('../../components/charts/ProjectStatusDonut'));

const scheduleIdle = (work: () => void) => {
  const w = window as Window & { requestIdleCallback?: (callback: () => void) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(work);
    return;
  }
  window.setTimeout(work, 220);
};

const ResearchStaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, contractsTotal: 0, overdueProjects: 0, completedProjects: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [allowChartRender, setAllowChartRender] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [projectsData, statsData] = await Promise.all([
          projectService.getAll(),
          reportService.getStats(),
        ]);
        setProjects(projectsData);
        setStats({
          totalProjects: statsData.totalProjects,
          activeProjects: statsData.activeProjects,
          contractsTotal: statsData.contractsTotal,
          overdueProjects: statsData.overdueProjects,
          completedProjects: statsData.completedProjects,
        });
      } catch (e) {
        console.error(e);
        setError(typeof e === 'string' ? e : 'Không thể tải dữ liệu dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    scheduleIdle(() => setAllowChartRender(true));
  }, []);

  useEffect(() => {
    notificationService
      .list(1, 4)
      .then((res) => setNotifications(res.items))
      .catch(() => setNotifications([]));
  }, []);

  const formatNotifTime = (iso: string) => {
    const created = new Date(iso).getTime();
    const deltaMinutes = Math.max(1, Math.floor((Date.now() - created) / (1000 * 60)));
    if (deltaMinutes < 60) return `${deltaMinutes} phút trước`;
    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return `${deltaHours} giờ trước`;
    return `${Math.floor(deltaHours / 24)} ngày trước`;
  };

  const notifClass = (type: NotificationItem['type']) => {
    if (type === 'warning') return 'bg-warning-50 border-warning-200';
    if (type === 'request') return 'bg-info-50 border-info-200';
    return 'bg-gray-50 border-gray-200';
  };

  const pendingCouncil = React.useMemo(() => projects.filter((p) => p.status === 'cho_nghiem_thu'), [projects]);
  const overdue = React.useMemo(() => projects.filter((p) => p.status === 'tre_han'), [projects]);
  
  const activeCount = stats.activeProjects;
  const overdueCount = stats.overdueProjects;
  const completedCount = stats.completedProjects;
  const pendingCount = pendingCouncil.length;
  const otherCount = Math.max(0, projects.length - (activeCount + overdueCount + completedCount + pendingCount));

  const statusData = React.useMemo(() => {
    const statusDataRaw = [
      { label: 'Đang thực hiện', count: activeCount, color: '#3b82f6' },
      { label: 'Chờ nghiệm thu', count: pendingCount, color: '#f59e0b' },
      { label: 'Trễ hạn', count: overdueCount, color: '#ef4444' },
      { label: 'Đã nghiệm thu', count: completedCount, color: '#22c55e' },
      { label: 'Khác (Hủy/Chờ duyệt)', count: otherCount, color: '#94a3b8' },
    ].filter((s) => s.count > 0);

    const totalForRatio = Math.max(projects.length, 1);
    return statusDataRaw.map((s) => ({
      ...s,
      value: Math.round((s.count / totalForRatio) * 100),
    }));
  }, [activeCount, pendingCount, overdueCount, completedCount, otherCount, projects.length]);

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-success-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-gray-600 mt-2">Hệ thống Quản lý Nghiên cứu Khoa học — Năm học 2023-2024</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/research-staff/project-management')}
          className="btn-primary"
        >
          + Tạo đề tài mới
        </button>
        <button
          type="button"
          onClick={() => navigate('/research-staff/contract-management')}
          className="btn-secondary"
        >
          Quản lý hợp đồng
        </button>
      </div>
      {error && (
        <div className="card border-error-200 bg-error-50">
          <div className="text-sm font-semibold text-error-700 p-6">
            {error}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đề tài', value: stats.totalProjects.toLocaleString(), badge: 'badge-neutral' },
          { label: 'Đang thực hiện', value: stats.activeProjects.toString(), badge: 'badge-info' },
          { label: 'Chờ nghiệm thu', value: pendingCouncil.length.toString(), badge: 'badge-warning' },
          { label: 'Trễ hạn', value: overdue.length.toString(), badge: 'badge-error' },
        ].map((s, i) => (
          <div key={i} className="card">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-4xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Status chart */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-6 px-6 py-4 border-b border-gray-200">Trạng thái Đề tài</h2>
            <div className="flex flex-col items-center px-6 pb-6">
              {statusData.length > 0 ? (
                <>
                  <div className="w-full max-w-[200px]">
                    {allowChartRender ? (
                      <Suspense fallback={<div className="skeleton-line h-[200px] w-full" />}>
                        <ProjectStatusDonut data={statusData} />
                      </Suspense>
                    ) : (
                      <div className="skeleton-line h-[200px] w-full" />
                    )}
                  </div>
                  <div className="space-y-2 w-full mt-6">
                    {statusData.map(s => (
                      <div key={s.label} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                          <span className="text-sm font-semibold text-gray-700">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">{s.count}</span>
                          <span className="text-sm font-bold w-10 text-right" style={{ color: s.color }}>{s.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state-panel w-full text-center">
                  <p className="text-2xl mb-2" aria-hidden="true">◌</p>
                  <p className="text-sm font-semibold text-gray-800">Chưa có dữ liệu trạng thái</p>
                  <p className="text-xs text-gray-600 mt-1">Tạo đề tài đầu tiên để hệ thống bắt đầu thống kê biểu đồ.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/research-staff/project-management')}
                    className="btn-secondary text-xs mt-4"
                  >
                    Tạo đề tài mới
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 px-6 py-4 border-b border-gray-200">Thông báo mới</h2>
            <div className="space-y-3 px-6 pb-6">
              {notifications.length === 0 && (
                <div className="empty-state-panel text-center">
                  <p className="text-sm font-semibold text-gray-800">Chưa có thông báo mới</p>
                  <p className="text-xs text-gray-600 mt-1">Thông báo hệ thống sẽ xuất hiện tại đây.</p>
                </div>
              )}
              {notifications.map((notif) => (
                <div key={notif.id} className={`p-4 rounded-lg border ${notifClass(notif.type)}`}>
                  <p className="text-sm font-semibold text-gray-900">{notif.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatNotifTime(notif.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue warning */}
          {overdue.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-6 px-6 py-4 border-b border-gray-200">Đề tài sắp trễ hạn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
                {overdue.slice(0, 2).map(p => (
                  <div key={p.id} className="p-4 rounded-lg border-2 border-error-300 bg-error-50 relative">
                    <span className="text-[10px] font-bold uppercase text-white bg-error-600 px-2 py-1 rounded inline-block">Cảnh báo</span>
                    <h3 className="text-sm font-bold text-error-900 mt-3">{p.title}</h3>
                    <p className="text-xs text-error-700 mt-1 font-semibold">Mã: {p.code}</p>
                    <button
                      onClick={() => showToast(`Đã gửi nhắc nhở tiến độ cho đề tài ${p.code}.`)}
                      className="mt-3 text-xs font-semibold text-error-700 hover:text-error-900 transition-colors"
                    >
                      → Gửi nhắc nhở
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overdue.length === 0 && (
            <div className="card border-success-200 bg-gradient-to-r from-success-50 to-white">
              <div className="px-6 py-4 border-b border-success-100">
                <h2 className="text-lg font-bold text-success-700">Tiến độ ổn định</h2>
              </div>
              <div className="px-6 py-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Hiện chưa có đề tài trễ hạn.</p>
                  <p className="text-xs text-gray-600 mt-1">Tiếp tục theo dõi định kỳ để giữ tiến độ toàn hệ thống.</p>
                </div>
                <span className="badge-success">Đúng hạn</span>
              </div>
            </div>
          )}

          {/* Pending council table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Danh sách Chờ nghiệm thu</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase font-bold text-gray-600">
                  <th className="px-6 py-3 text-left">Mã</th>
                  <th className="px-6 py-3 text-left">Tên đề tài</th>
                  <th className="px-6 py-3 text-left">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingCouncil.map(p => (
                  <tr key={p.id} className="text-sm hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{p.code}</td>
                    <td className="px-6 py-4 text-gray-700">{p.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate('/research-staff/council-creation')}
                        className="btn-secondary text-xs"
                      >
                        Thành lập HĐ
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingCouncil.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8">
                      <div className="empty-state-panel text-center">
                        <p className="text-sm font-semibold text-gray-800">Không có đề tài chờ nghiệm thu</p>
                        <p className="text-xs text-gray-600 mt-1">Danh sách sẽ tự động hiển thị khi đề tài chuyển trạng thái.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {loading && <p className="text-xs text-gray-500 text-center py-4">Đang đồng bộ dữ liệu từ hệ thống...</p>}
    </div>
  );
};

export default ResearchStaffDashboard;
