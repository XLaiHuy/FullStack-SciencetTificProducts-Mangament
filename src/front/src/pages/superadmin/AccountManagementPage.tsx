import React, { useState } from 'react';
import { mockUsers } from '../../mock/mockData';

const roleLabels: Record<string, string> = {
  research_staff: 'Phòng NCKH',
  project_owner: 'Chủ nhiệm',
  council_member: 'Hội đồng',
  accounting: 'Kế toán',
  archive_staff: 'Lưu trữ',
  report_viewer: 'Báo cáo',
  superadmin: 'Superadmin',
};

const AccountManagementPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filtered = mockUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài khoản</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý toàn bộ người dùng trong hệ thống</p>
        </div>
        <button
          onClick={() => showToast('Mở form tạo tài khoản mới...')}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark"
        >
          + Tạo tài khoản mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          type="text"
          placeholder="Tìm kiếm theo tên, email..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
        />
        <select className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
          <option>Tất cả vai trò</option>
          {Object.values(roleLabels).map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Danh sách tài khoản ({filtered.length})</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Họ tên', 'Email', 'Vai trò', 'Phòng/Ban', 'Thao tác'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-gray-500">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20 uppercase">
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{u.department || '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button onClick={() => showToast(`Đã cập nhật tài khoản ${u.name}`)} className="text-[11px] font-bold text-primary hover:underline">Sửa</button>
                    <button onClick={() => showToast(`Đã đặt lại mật khẩu cho ${u.name}`)} className="text-[11px] font-bold text-gray-400 hover:text-primary">Đặt lại MK</button>
                    <button onClick={() => showToast(`Đã khóa tài khoản ${u.name}`)} className="text-[11px] font-bold text-red-400 hover:text-red-600">Khóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountManagementPage;
