import React from 'react';
import { mockProjects } from '../../mock/mockData';

const ProgressStatisticsPage: React.FC = () => {
  const statusGroups = [
    { label: 'Đang thực hiện', count: mockProjects.filter(p => p.status === 'dang_thuc_hien').length, color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Trễ hạn', count: mockProjects.filter(p => p.status === 'tre_han').length, color: 'bg-red-500', textColor: 'text-red-600' },
    { label: 'Chờ nghiệm thu', count: mockProjects.filter(p => p.status === 'cho_nghiem_thu').length, color: 'bg-amber-500', textColor: 'text-amber-600' },
    { label: 'Đã nghiệm thu', count: mockProjects.filter(p => p.status === 'da_nghiem_thu').length, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  ];
  const total = mockProjects.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thống kê Tiến độ</h1>
        <p className="text-gray-500 text-sm mt-1">Theo dõi tiến độ thực hiện các đề tài nghiên cứu</p>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-4 gap-5">
        {statusGroups.map(s => (
          <div key={s.label} className="bg-white p-5 rounded-xl border border-gray-100 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <p className="text-xs font-bold text-gray-400 uppercase">{s.label}</p>
            </div>
            <p className={`text-3xl font-black ${s.textColor}`}>{s.count}</p>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${(s.count / total) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">{((s.count / total) * 100).toFixed(1)}% tổng số</p>
          </div>
        ))}
      </div>

      {/* Timeline progress for active projects */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
        <h2 className="font-bold text-gray-800 mb-6">Tiến độ đề tài đang thực hiện</h2>
        <div className="space-y-6">
          {mockProjects.filter(p => p.status === 'dang_thuc_hien').map(p => {
            const start = new Date(p.startDate).getTime();
            const end = new Date(p.endDate).getTime();
            const now = Date.now();
            const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
            return (
              <div key={p.id}>
                <div className="flex justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded mr-2">{p.code}</span>
                    <span className="text-sm font-medium text-gray-700">{p.title.substring(0, 50)}...</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">{pct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${pct > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>{p.startDate}</span>
                  <span>{p.endDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressStatisticsPage;
