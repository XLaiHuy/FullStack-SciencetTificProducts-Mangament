import React from 'react';
import { adminService, type AuditLogItem } from '../../services/api/adminService';

const AuditLogPage: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [moduleFilter, setModuleFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [selectedLogId, setSelectedLogId] = React.useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadLogs = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getAuditLogs({
        user: search || undefined,
        module: moduleFilter || undefined,
        limit: 200,
        page: 1,
      });
      setLogs(res.items);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai audit log.');
    } finally {
      setLoading(false);
    }
  }, [search, moduleFilter]);

  React.useEffect(() => {
    loadLogs().catch(() => undefined);
  }, [loadLogs]);

  const selectedLog = logs.find((log) => log.id === selectedLogId);
  const modules = React.useMemo(() => Array.from(new Set(logs.map((log) => log.module))).filter(Boolean), [logs]);

  const handleExportCsv = () => {
    if (logs.length === 0) {
      showToast('Khong co du lieu de xuat CSV.');
      return;
    }
    const header = ['Thoi gian', 'Nguoi thuc hien', 'Module', 'Thao tac', 'Chi tiet'];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toLocaleString('vi-VN'),
      log.userName,
      log.module,
      log.action,
      log.details ?? '',
    ]);
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Da xuat CSV audit log.');
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nhat ky he thong (Audit Log)</h1>
        <p className="text-gray-500 text-sm mt-1">Theo doi toan bo hoat dong cua nguoi dung trong he thong</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="text"
          placeholder="Tim theo nguoi thuc hien..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
        />
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
        >
          <option value="">Tat ca module</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
        <button onClick={() => loadLogs().catch(() => undefined)} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark">
          Loc
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Nhat ky hoat dong ({logs.length} muc)</h2>
          <button onClick={handleExportCsv} className="text-xs font-bold text-primary hover:underline">
            Xuat CSV
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-gray-500">Dang tai du lieu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Thoi gian', 'Nguoi thuc hien', 'Module', 'Thao tac', 'Chi tiet'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-400 text-xs font-mono">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{log.userName}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{log.module}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{log.action}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedLogId(log.id)} className="text-[11px] font-bold text-primary hover:underline">
                      Chi tiet
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-400" colSpan={5}>
                    Chua co ban ghi phu hop bo loc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedLog && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-800">Chi tiet ban ghi #{selectedLog.id}</h3>
            <button onClick={() => setSelectedLogId('')} className="text-xs font-bold text-blue-600 hover:underline">
              Dong
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">Thoi gian: {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}</p>
          <p className="text-xs text-blue-700">Nguoi thuc hien: {selectedLog.userName}</p>
          <p className="text-xs text-blue-700">Module: {selectedLog.module}</p>
          <p className="text-xs text-blue-700">Thao tac: {selectedLog.action}</p>
          {selectedLog.details && <p className="text-xs text-blue-700">Chi tiet: {selectedLog.details}</p>}
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
