import React from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, type AdminDashboard, type AuditLogItem, type SystemConfigItem } from '../../services/api/adminService';

const ROLE_LABELS: Record<string, string> = {
  research_staff: 'Phong NCKH',
  project_owner: 'Chu nhiem',
  council_member: 'Hoi dong',
  accounting: 'Ke toan',
  archive_staff: 'Luu tru',
  report_viewer: 'Bao cao',
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
      setError(typeof e === 'string' ? e : 'Khong the tai dashboard he thong.');
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
    { label: 'Tong tai khoan', value: dashboard?.totalUsers ?? 0, className: 'text-slate-900' },
    { label: 'Dang hoat dong', value: dashboard?.activeUsers ?? 0, className: 'text-emerald-600' },
    { label: 'Bi khoa', value: dashboard?.lockedUsers ?? 0, className: 'text-rose-600' },
    { label: 'Audit hom nay', value: dashboard?.auditLogsToday ?? 0, className: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quan ly he thong</h1>
          <p className="text-gray-500 mt-1">Tong quan va cau hinh tham so van hanh</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData().catch(() => undefined)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tai lai
          </button>
          <button
            type="button"
            onClick={() => navigate('/superadmin/account-management?action=create')}
            className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-button hover:bg-primary-dark text-sm"
          >
            + Tao tai khoan moi
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Dang tai du lieu...</div>
      ) : (
        <>
          <section>
            <h2 className="font-bold text-lg mb-4">Thong ke tai khoan he thong</h2>
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
                <h3 className="font-bold text-lg">Co cau tai khoan theo vai tro</h3>
                <button
                  type="button"
                  onClick={() => navigate('/superadmin/account-management')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Quan ly tai khoan
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
                <h3 className="font-bold text-lg">Cau hinh he thong</h3>
                <button
                  type="button"
                  onClick={() => navigate('/superadmin/system-config')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Sua cau hinh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Thang diem toi da</p>
                  <p className="font-semibold text-gray-900">{configByKey.get('MAX_SCORE') ?? '100'}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">File toi da (MB)</p>
                  <p className="font-semibold text-gray-900">{configByKey.get('MAX_FILE_SIZE_MB') ?? '20'}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Dinh dang cho phep</p>
                  <p className="font-semibold text-gray-900">{configByKey.get('ALLOWED_FILE_FORMATS') ?? '.pdf,.docx,.xlsx'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Nhat ky he thong gan day</h3>
              <button
                type="button"
                onClick={() => navigate('/superadmin/audit-log')}
                className="text-sm font-bold text-primary hover:underline"
              >
                Xem tat ca
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Thoi gian</th>
                  <th className="px-6 py-3">Nguoi thuc hien</th>
                  <th className="px-6 py-3">Thao tac</th>
                  <th className="px-6 py-3">Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-400 text-sm" colSpan={4}>
                      Chua co du lieu audit log.
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
