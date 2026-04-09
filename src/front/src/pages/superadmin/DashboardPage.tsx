import React from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, type AdminDashboard, type AuditLogItem, type SystemConfigItem } from '../../services/api/adminService';

const ROLE_LABELS: Record<string, string> = {
  research_staff: 'Phong NCKH',
  project_owner: 'Chủ nhiệm',
  council_member: 'Hội đồng',
  accounting: 'Kế toán',
  archive_staff: 'Lưu trữ',
  report_viewer: 'Báo cáo',
  superadmin: 'Superadmin',
};

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dashboard, setDashboard] = React.useState<AdminDashboard | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>([]);
  const [configs, setConfigs] = React.useState<SystemConfigItem[]>([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, auditData, configData] = await Promise.all([
        adminService.getDashboard(),
        adminService.getAuditLogs({ limit: 5, page: 1 }),
        adminService.getConfig(),
      ]);
      setDashboard(dashboardData);
      setAuditLogs(auditData.items);
      setConfigs(configData);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải dashboard hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const configByKey = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of configs) map.set(item.key, item.value);
    return map;
  }, [configs]);

  const kpis = [
    { label: 'Tổng tài khoản', value: dashboard?.totalUsers ?? 0, className: 'text-slate-900' },
    { label: 'Đang hoạt động', value: dashboard?.activeUsers ?? 0, className: 'text-emerald-600' },
    { label: 'Bị khóa', value: dashboard?.lockedUsers ?? 0, className: 'text-rose-600' },
    { label: 'Audit hôm nay', value: dashboard?.auditLogsToday ?? 0, className: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quản lý hệ thống</h1>
          <p className="text-gray-500 mt-1">Tổng quan và cấu hình tham số vận hành</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData().catch(() => undefined)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tải lại
          </button>
          <button
            type="button"
            onClick={() => navigate('/superadmin/account-management?action=create')}
            className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-button hover:bg-primary-dark text-sm"
          >
            + Tạo tài khoản mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
          <section>
            <h2 className="font-bold text-lg mb-4">Thống kê tài khoản hệ thống</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-card">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.className}`}>{kpi.value.toLocaleString('vi-VN')}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Cơ cấu tài khoản theo vai trò</h3>
                <button
                  type="button"
                  onClick={() => navigate('/superadmin/account-management')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Quản lý tài khoản
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(dashboard?.roleCounts ?? {}).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-700">{ROLE_LABELS[role] ?? role}</span>
                    <span className="text-sm font-bold text-gray-900">{count.toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Cấu hình hệ thống</h3>
                <button
                  type="button"
                  onClick={() => navigate('/superadmin/system-config')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Sửa cấu hình
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Thang điểm tối đa</p>
                  <p className="font-semibold text-gray-900">{configByKey.get('MAX_SCORE') ?? '100'}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">File tối đa (MB)</p>
                  <p className="font-semibold text-gray-900">{configByKey.get('MAX_FILE_SIZE_MB') ?? '20'}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Định dạng cho phép</p>
                  <p className="font-semibold text-gray-900">{configByKey.get('ALLOWED_FILE_FORMATS') ?? '.pdf,.docx,.xlsx'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Nhật ký hệ thống gần đây</h3>
              <button
                type="button"
                onClick={() => navigate('/superadmin/audit-log')}
                className="text-sm font-bold text-primary hover:underline"
              >
                Xem tất cả
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Thời gian</th>
                  <th className="px-6 py-3">Người thực hiện</th>
                  <th className="px-6 py-3">Thao tác</th>
                  <th className="px-6 py-3">Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-400 text-sm" colSpan={4}>
                      Chưa có dữ liệu audit log.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-3 text-gray-500">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                      <td className="px-6 py-3 font-medium text-gray-800">{log.userName}</td>
                      <td className="px-6 py-3 text-gray-700">{log.action}</td>
                      <td className="px-6 py-3 text-gray-500">{log.module}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
