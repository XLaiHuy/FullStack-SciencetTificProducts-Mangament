import React, { useState } from 'react';
import { mockAuditLogs } from '../../mock/mockData';

const AuditLogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [toast, setToast] = useState('');
  const [selectedLogId, setSelectedLogId] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const formattedDate = dateFilter ? dateFilter.split('-').reverse().join('/') : '';

  const filtered = mockAuditLogs.filter(log => {
    if (
      !log.user.toLowerCase().includes(search.toLowerCase()) &&
      !log.action.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (moduleFilter && log.module !== moduleFilter) return false;
    if (formattedDate && !log.timestamp.includes(formattedDate)) return false;
    return true;
  });

  const selectedLog = filtered.find((log) => log.id === selectedLogId);

  const handleExportCsv = () => {
    const header = ['Thoi gian', 'Nguoi thuc hien', 'Mo-dun', 'Thao tac'];
    const rows = filtered.map((log) => [log.timestamp, log.user, log.module, log.action]);
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Da xuat CSV nhat ky he thong.');
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nhật ký hệ thống (Audit Log)</h1>
        <p className="text-gray-500 text-sm mt-1">Theo dõi toàn bộ hoạt động của người dùng trong hệ thống</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          type="text"
          placeholder="Tìm theo người thực hiện, thao tác..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
        />
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
          <option value="">Tất cả mô-đun</option>
          <option value="Auth">Auth</option>
          <option value="Account Management">Account Management</option>
          <option value="Contract Management">Contract Management</option>
          <option value="Accounting">Accounting</option>
        </select>
        <input value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} type="date" className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600" />
        <button onClick={() => showToast(`Da ap dung bo loc: ${filtered.length} ket qua.`)} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark">Lọc</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Nhật ký hoạt động ({filtered.length} mục)</h2>
          <button onClick={handleExportCsv} className="text-xs font-bold text-primary hover:underline">Xuất CSV</button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Thời gian', 'Người thực hiện', 'Mô-đun', 'Thao tác', 'Chi tiết'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-400 text-xs font-mono">{log.timestamp}</td>
                <td className="px-6 py-4 font-semibold text-gray-800">{log.user}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{log.module}</span>
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${log.action.includes('Khóa') ? 'text-red-500' : 'text-gray-700'}`}>{log.action}</td>
                <td className="px-6 py-4">
                  <button onClick={() => setSelectedLogId(log.id)} className="text-[11px] font-bold text-primary hover:underline">Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-800">Chi tiết bản ghi #{selectedLog.id}</h3>
            <button onClick={() => setSelectedLogId('')} className="text-xs font-bold text-blue-600 hover:underline">Đóng</button>
          </div>
          <p className="text-xs text-blue-700 mt-2">Thời gian: {selectedLog.timestamp}</p>
          <p className="text-xs text-blue-700">Người thực hiện: {selectedLog.user}</p>
          <p className="text-xs text-blue-700">Mô-đun: {selectedLog.module}</p>
          <p className="text-xs text-blue-700">Thao tác: {selectedLog.action}</p>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
