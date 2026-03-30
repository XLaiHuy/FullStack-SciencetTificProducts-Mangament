import React, { useState } from 'react';
import { mockAuditLogs } from '../../mock/mockData';

const AuditLogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const filtered = mockAuditLogs.filter(log =>
    log.user.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
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
        <select className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
          <option>Tất cả mô-đun</option>
          <option>Auth</option>
          <option>Account Management</option>
          <option>Contract Management</option>
          <option>Accounting</option>
        </select>
        <input type="date" className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600" />
        <button className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark">Lọc</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Nhật ký hoạt động ({filtered.length} mục)</h2>
          <button className="text-xs font-bold text-primary hover:underline">Xuất CSV</button>
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
                  <button className="text-[11px] font-bold text-primary hover:underline">Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;
