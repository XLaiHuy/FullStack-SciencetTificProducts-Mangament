import React, { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { archiveService } from '../../services/api/archiveService';

const DocumentManagementPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [rows, setRows] = React.useState<Array<{ id: string; code: string; title: string; status: string }>>([]);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  React.useEffect(() => {
    archiveService.getAll().then((data) => setRows(data.map((x) => ({ id: x.id, code: x.code, title: x.title, status: x.status })))).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Hồ sơ</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý và theo dõi toàn bộ hồ sơ tài chính nghiên cứu</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex items-center justify-between gap-4">
        <div className="flex gap-3 flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hồ sơ, tên đề tài..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
          />
          <select className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary text-gray-600">
            <option>Tất cả trạng thái</option>
            <option>Chờ bổ sung</option>
            <option>Hợp lệ</option>
            <option>Đã xác nhận</option>
          </select>
          <select className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary text-gray-600">
            <option>Tất cả năm học</option>
            <option>2023-2024</option>
            <option>2022-2023</option>
          </select>
        </div>
        <button className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark">
          Tìm kiếm
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Danh sách hồ sơ tài chính</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors">
              Xuất Excel
            </button>
            <button className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors">
              In báo cáo
            </button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Mã hồ sơ', 'Nội dung', 'Số tiền', 'Trạng thái', 'Thao tác'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-primary">{s.code}</td>
                <td className="px-6 py-4 font-medium text-gray-700 max-w-xs truncate">{s.title}</td>
                <td className="px-6 py-4 font-semibold text-gray-800">-</td>
                <td className="px-6 py-4"><StatusBadge status={s.status as any} /></td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button className="text-[11px] font-bold text-primary hover:underline">Chi tiết</button>
                    <button
                      onClick={async () => {
                        await archiveService.download(s.id);
                        showToast(`Đã tải tài liệu ${s.code}`);
                      }}
                      className="text-[11px] font-bold text-gray-400 hover:text-primary transition-colors"
                    >
                      Tải tài liệu
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Hiển thị 1-{rows.length} / {rows.length} hồ sơ</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Trước</button>
            <button className="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold">1</button>
            <button className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Sau</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagementPage;
