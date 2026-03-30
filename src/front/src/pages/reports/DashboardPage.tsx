import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [year, setYear] = useState('2023-2024');
  const [level, setLevel] = useState('');

  const summaryCards = [
    { label: 'Tổng số đề tài', value: '1,248', trend: '+12% so với năm trước', trendClass: 'text-emerald-600' },
    { label: 'Đang thực hiện', value: '412', trend: '32.5% tổng số đề tài', trendClass: 'text-gray-400' },
    { label: 'Đã nghiệm thu', value: '786', trend: 'Giai đoạn 2020-2024', trendClass: 'text-gray-400' },
  ];

  const departmentData = [
    { label: 'Công nghệ Thông tin', value: 185, pct: 85 },
    { label: 'Kinh tế & Quản trị', value: 142, pct: 65 },
    { label: 'Kỹ thuật Ô tô', value: 98, pct: 45 },
    { label: 'Điện - Điện tử', value: 76, pct: 35 },
    { label: 'Ngoại ngữ', value: 54, pct: 25 },
  ];

  const recentTopics = [
    { code: 'DT-2024-012', title: 'Nghiên cứu ứng dụng AI trong quản lý rủi ro tín dụng', owner: 'Nguyễn Văn A', status: 'Đang thực hiện', statusClass: 'bg-blue-100 text-blue-700' },
    { code: 'DT-2023-556', title: 'Phát triển vật liệu nano bền vững từ phế thải nông nghiệp', owner: 'Trần Thị B', status: 'Đã nghiệm thu', statusClass: 'bg-green-100 text-green-700' },
    { code: 'DT-2024-001', title: 'Giải pháp nâng cao năng suất lao động cho doanh nghiệp vừa và nhỏ', owner: 'Lê Hoàng C', status: 'Chờ thẩm định', statusClass: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="space-y-8">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan Báo cáo & Thống kê</h1>
          <p className="text-gray-400 text-sm mt-1">Cập nhật lúc: 14:30 - 24/05/2024</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary focus:border-primary bg-white"
          >
            <option>2023-2024</option>
            <option>2022-2023</option>
            <option>2021-2022</option>
          </select>
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary focus:border-primary bg-white"
          >
            <option value="">Chọn Cấp quản lý</option>
            <option>Cấp Trường</option>
            <option>Cấp Bộ</option>
            <option>Cấp Tỉnh</option>
          </select>
          <button
            onClick={() => navigate('/reports/export')}
            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark flex items-center gap-2"
          >
            📄 Xuất PDF
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-6">
        {summaryCards.map(s => (
          <div key={s.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
            <p className="text-gray-500 text-sm font-medium">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className={`text-xs mt-2 font-semibold ${s.trendClass}`}>{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Acceptance rate donut mock */}
        <div className="col-span-5 bg-white p-6 rounded-xl border border-gray-100 shadow-card">
          <h4 className="font-bold text-gray-800 mb-6">Tỷ lệ nghiệm thu đề tài</h4>
          <div className="relative h-48 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-[18px] border-slate-100 relative flex items-center justify-center">
              <div className="absolute inset-[-18px] rounded-full border-[18px] border-emerald-500 opacity-80" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 50%)' }} />
              <div className="absolute inset-[-18px] rounded-full border-[18px] border-red-500 opacity-80" style={{ clipPath: 'polygon(50% 50%, 0 50%, 0 20%)' }} />
              <div className="text-center z-10">
                <span className="block text-2xl font-black text-gray-800">85%</span>
                <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Hoàn thành</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[['Đạt (720)', 'bg-emerald-500'], ['K.Đạt (42)', 'bg-gray-300'], ['Đã hủy (24)', 'bg-red-500']].map(([label, bg]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${bg}`} />
                <span className="text-xs text-gray-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department bar chart mock */}
        <div className="col-span-7 bg-white p-6 rounded-xl border border-gray-100 shadow-card">
          <h4 className="font-bold text-gray-800 mb-6">Thống kê theo Khoa/Viện (Top 5)</h4>
          <div className="space-y-5">
            {departmentData.map(d => (
              <div key={d.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{d.label}</span>
                  <span className="font-bold text-primary">{d.value} đề tài</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-700" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent topics table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-bold text-gray-800">Danh sách đề tài mới cập nhật</h4>
          <button onClick={() => navigate('/reports/topic-statistics')} className="text-primary text-sm font-bold hover:underline">Xem tất cả</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <tr>
              {['Mã Đề Tài', 'Tên Đề Tài', 'Chủ Nhiệm', 'Trạng Thái'].map(h => (
                <th key={h} className="px-6 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentTopics.map((t, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-primary">{t.code}</td>
                <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{t.title}</td>
                <td className="px-6 py-4 text-gray-600">{t.owner}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${t.statusClass}`}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsDashboard;
