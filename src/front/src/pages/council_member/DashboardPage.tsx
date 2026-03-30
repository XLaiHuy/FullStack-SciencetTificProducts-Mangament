import React, { useEffect } from 'react';
import { mockProjects } from '../../mock/mockData';
import { StatusBadge } from '../../components/StatusBadge';

const CouncilMemberDashboard: React.FC = () => {
  useEffect(() => {}, []);

  const myProjects = mockProjects.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard — Hội đồng Nghiệm thu</h1>
        <p className="text-gray-500 text-sm mt-1">Danh sách đề tài được phân công đánh giá</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[['Đề tài được giao', myProjects.length, 'text-primary'], ['Chờ đánh giá', '2', 'text-amber-600'], ['Đã hoàn thành', '1', 'text-emerald-600']].map(([label, val, cls]) => (
          <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
            <p className={`text-3xl font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Đề tài được phân công đánh giá</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {myProjects.map(p => (
            <div key={p.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{p.code}</span>
                  <h3 className="font-bold text-gray-900 mt-2">{p.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">Chủ nhiệm: {p.owner} • Thời gian: {p.durationMonths} tháng</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl shadow-card hover:bg-primary-dark">Xem hồ sơ</button>
                <button className="px-4 py-2 text-xs font-bold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Nhận xét phản biện</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CouncilMemberDashboard;
