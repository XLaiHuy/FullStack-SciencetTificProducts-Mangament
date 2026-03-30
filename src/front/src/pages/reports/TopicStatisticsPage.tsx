import React from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProjects } from '../../mock/mockData';
import { StatusBadge } from '../../components/StatusBadge';

const TopicStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thống kê Đề tài</h1>
          <p className="text-gray-500 text-sm mt-1">Chi tiết thống kê theo lĩnh vực, khoa/viện và trạng thái</p>
        </div>
        <button onClick={() => navigate('/reports/export')} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark">Xuất báo cáo</button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex gap-3">
        {['Năm học', 'Lĩnh vực', 'Khoa/Viện', 'Trạng thái'].map(f => (
          <select key={f} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
            <option>Tất cả {f}</option>
          </select>
        ))}
        <button className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl">Lọc</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
          <h2 className="font-bold text-gray-800">Danh sách đề tài theo bộ lọc</h2>
          <span className="text-xs text-gray-400">{mockProjects.length} kết quả</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <tr>
              {['Mã', 'Tên đề tài', 'Chủ nhiệm', 'Lĩnh vực', 'Ngân sách', 'Trạng thái'].map(h => (
                <th key={h} className="px-6 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockProjects.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-primary">{p.code}</td>
                <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{p.title}</td>
                <td className="px-6 py-4 text-gray-500">{p.owner}</td>
                <td className="px-6 py-4 text-gray-500">{p.field}</td>
                <td className="px-6 py-4 text-gray-600">{(p.budget / 1000000).toFixed(0)}tr VNĐ</td>
                <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopicStatisticsPage;
