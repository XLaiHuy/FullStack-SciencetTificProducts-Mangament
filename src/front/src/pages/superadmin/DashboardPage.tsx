import React, { useState } from 'react';
import { mockAuditLogs } from '../../mock/mockData';

const SuperAdminDashboard: React.FC = () => {
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const accountKPIs = [
    { label: 'Tổng Giảng viên', value: '1,200', color: 'text-gray-900' },
    { label: 'Tổng Sinh viên', value: '5,000', color: 'text-gray-900' },
    { label: 'Đang online', value: '45', color: 'text-emerald-600', badge: true },
    { label: 'Bị khóa', value: '12', color: 'text-red-500' },
  ];

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quản lý Hệ thống</h1>
          <p className="text-gray-500 mt-1">Tổng quan và cấu hình tham số vận hành</p>
        </div>
        <button onClick={() => showToast('Da mo form tao tai khoan moi.')} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-button hover:bg-primary-dark text-sm">
          + Tạo tài khoản mới
        </button>
      </div>

      {/* Account KPIs */}
      <section>
        <h2 className="font-bold text-lg mb-4">Thống kê Tài khoản hệ thống</h2>
        <div className="grid grid-cols-4 gap-5">
          {accountKPIs.map(k => (
            <div key={k.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-card">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                {k.badge && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Config + Audit */}
      <div className="grid grid-cols-2 gap-8">
        {/* System config form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="font-bold text-lg">Cấu hình tham số</h3>
            <div className="w-48">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1">
                <span>Dung lượng lưu trữ</span>
                <span>45%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '45%' }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-right">45GB / 100GB</p>
            </div>
          </div>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thang điểm tối đa</label>
                <input type="number" defaultValue="100" className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Dung lượng file tối đa (MB)</label>
                <input type="number" defaultValue="20" className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Định dạng file cho phép</label>
              <input type="text" defaultValue=".pdf, .docx, .xlsx" className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => showToast('Đã lưu cấu hình hệ thống thành công!')}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black"
              >
                Lưu cấu hình
              </button>
            </div>
          </form>
        </div>

        {/* Audit log */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-lg">Nhật ký hệ thống (Audit Log)</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                {['Thời gian', 'Người thực hiện', 'Thao tác'].map(h => <th key={h} className="px-6 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockAuditLogs.slice(0, 5).map(log => (
                <tr key={log.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-6 py-3 text-gray-400">{log.timestamp}</td>
                  <td className="px-6 py-3 font-medium">{log.user}</td>
                  <td className={`px-6 py-3 ${log.action.includes('Khóa') ? 'text-red-500' : ''}`}>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">Danh mục Năm học</h3>
            <button onClick={() => showToast('Da mo form them nam hoc moi.')} className="text-primary text-sm font-bold">Thêm mới</button>
          </div>
          <div className="space-y-3">
            {[['Năm học 2023-2024', 'Hiện tại', 'bg-green-100 text-green-700'], ['Năm học 2022-2023', 'Lưu trữ', 'bg-gray-100 text-gray-500']].map(([label, status, cls]) => (
              <div key={label} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="font-semibold text-sm">{label}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${cls}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">Lĩnh vực nghiên cứu</h3>
            <button onClick={() => showToast('Da mo form them linh vuc nghien cuu.')} className="text-primary text-sm font-bold">Thêm mới</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Khoa học Tự nhiên', 'Khoa học Xã hội', 'Kỹ thuật & Công nghệ', 'Y Dược', 'Nông nghiệp', 'Kinh tế'].map(f => (
              <span key={f} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
