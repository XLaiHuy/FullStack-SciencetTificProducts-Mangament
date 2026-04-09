import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import type { Project } from '../../types';
import { projectService } from '../../services/api/projectService';
import { accountingService } from '../../services/api/accountingService';

const AccountingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboard, setDashboard] = useState({ totalSettlements: 0, pendingSettlements: 0, confirmedSettlements: 0, totalAmount: 0 });
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    Promise.all([projectService.getAll(), accountingService.getDashboard()])
      .then(([projectList, dashboardStats]) => {
        setProjects(projectList);
        setDashboard(dashboardStats);
      })
      .catch((e) => {
        console.error(e);
      });
  }, []);

  const stats = [
    { label: 'Tổng kinh phí quyết toán', value: `${dashboard.totalAmount.toLocaleString('vi-VN')} VNĐ`, color: 'text-primary', note: 'Dữ liệu realtime từ API', noteColor: 'text-emerald-600' },
    { label: 'Hồ sơ chờ xử lý', value: dashboard.pendingSettlements.toString(), color: 'text-orange-600', note: `Tổng hồ sơ: ${dashboard.totalSettlements}`, noteColor: 'text-gray-400' },
    { label: 'Hoàn tất trong tháng', value: dashboard.confirmedSettlements.toString(), color: 'text-slate-800', note: 'Đã xác nhận kế toán', noteColor: 'text-primary' },
  ];

  const fields = [
    { label: 'Công nghệ thông tin', pct: 75, color: 'bg-blue-600' },
    { label: 'Kỹ thuật & Công nghệ', pct: 45, color: 'bg-blue-400' },
    { label: 'Nông nghiệp & Sinh học', pct: 90, color: 'bg-indigo-500' },
    { label: 'Khoa học Xã hội', pct: 20, color: 'bg-slate-400' },
  ];

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-success-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển Phòng Kế toán</h1>
        <p className="text-gray-600 text-sm mt-2">Tổng quan quản lý tài chính nghiên cứu khoa học</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card">
            <p className="text-xs font-bold text-gray-600 uppercase mb-2">{s.label}</p>
            <p className={`text-3xl font-bold text-gray-900`}>{s.value}</p>
            <p className={`text-xs mt-2 font-semibold ${s.noteColor}`}>{s.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Hồ sơ chờ xử lý</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-600 tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Mã đề tài</th>
                <th className="px-6 py-3">Tên đề tài</th>
                <th className="px-6 py-3">Kinh phí</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.filter(p => p.status === 'cho_nghiem_thu' || p.status === 'dang_thuc_hien').slice(0, 4).map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{p.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-[200px] truncate">{p.title}</td>
                  <td className="px-6 py-4 font-medium text-sm text-gray-700">{(p.budget / 1000000).toFixed(0)}tr</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        navigate('/accounting/document-management');
                        showToast(`Đang mở danh sách chi tiết cho ${p.code}.`);
                      }}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-4 px-6 py-4 border-b border-gray-200">Thống kê ngân sách</h2>
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-600 mb-4">Tỷ lệ giải ngân theo lĩnh vực</p>
            <div className="space-y-4">
              {fields.map(f => (
                <div key={f.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 font-medium">{f.label}</span>
                    <span className="font-bold text-gray-900">{f.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`${f.color} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between text-xs font-semibold text-gray-700">
              <span>Đã giải ngân: 2.1 tỷ</span>
              <span>Dự toán: 5 tỷ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingDashboard;
