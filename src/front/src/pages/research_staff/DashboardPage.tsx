import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import type { Project } from '../../types';
import { projectService } from '../../services/api/projectService';
import { reportService } from '../../services/api/reportService';

const ResearchStaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, contractsTotal: 0, overdueProjects: 0, completedProjects: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [projectsData, statsData] = await Promise.all([
          projectService.getAll(),
          reportService.getStats(),
        ]);
        setProjects(projectsData);
        setStats({
          totalProjects: statsData.totalProjects,
          activeProjects: statsData.activeProjects,
          contractsTotal: statsData.contractsTotal,
          overdueProjects: statsData.overdueProjects,
          completedProjects: statsData.completedProjects,
        });
      } catch (e) {
        console.error(e);
        setError(typeof e === 'string' ? e : 'Không thể tải dữ liệu dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const pendingCouncil = projects.filter(p => p.status === 'cho_nghiem_thu');
  const overdue = projects.filter(p => p.status === 'tre_han');
  const totalForRatio = Math.max(projects.length, 1);
  const statusData = [
    { label: 'Đang thực hiện', value: Math.round((stats.activeProjects / totalForRatio) * 100), color: '#3b82f6' },
    { label: 'Trễ hạn', value: Math.round((stats.overdueProjects / totalForRatio) * 100), color: '#ef4444' },
    { label: 'Đã nghiệm thu', value: Math.round((stats.completedProjects / totalForRatio) * 100), color: '#22c55e' },
  ];

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-slate-500 mt-1">Hệ thống Quản lý Nghiên cứu Khoa học — Năm học 2023-2024</p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Tổng đề tài', value: stats.totalProjects.toLocaleString(), color: 'blue' },
          { label: 'Đang thực hiện', value: stats.activeProjects.toString(), color: 'blue' },
          { label: 'Chờ nghiệm thu', value: pendingCouncil.length.toString(), color: 'amber' },
          { label: 'Trễ hạn', value: overdue.length.toString(), color: 'red' },
        ].map((s, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-card ${i > 0 ? `border-l-4 border-l-${s.color}-500` : ''}`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${i === 0 ? 'text-gray-900' : i === 1 ? 'text-primary' : i === 2 ? 'text-amber-500' : 'text-red-600'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left column */}
        <div className="col-span-4 space-y-6">
          {/* Status chart */}
          <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Trạng thái Đề tài</h2>
            <div className="space-y-3">
              {statusData.map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-semibold">{s.label}</span>
                  </div>
                  <span className="text-xs font-bold">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Thông báo mới</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <p className="text-sm font-bold text-slate-800">Báo cáo quý II đã nộp</p>
                <p className="text-[11px] text-slate-500 mt-1">10 phút trước</p>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                <p className="text-sm font-bold text-slate-800">Nhắc nhở hạn quyết toán</p>
                <p className="text-[11px] text-slate-500 mt-1">1 giờ trước</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-8 space-y-6">
          {/* Overdue warning */}
          {overdue.length > 0 && (
            <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Đề tài sắp trễ hạn</h2>
              <div className="grid grid-cols-2 gap-6">
                {overdue.slice(0, 2).map(p => (
                  <div key={p.id} className="p-6 rounded-3xl border-2 border-red-500 bg-red-50 relative">
                    <span className="text-[10px] font-black uppercase text-white bg-red-600 px-3 py-1 rounded-lg">CẢnh BÁO KHẨN CẤP</span>
                    <h3 className="text-sm font-extrabold text-red-900 mt-4">{p.title}</h3>
                    <p className="text-xs text-red-700 mt-1 font-bold">Mã: {p.code}</p>
                    <button
                      onClick={() => showToast(`Da gui nhac nho tien do cho de tai ${p.code}.`)}
                      className="absolute bottom-4 right-6 text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Gửi nhắc nhở
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending council table */}
          <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Danh sách Chờ nghiệm thu</h2>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase font-bold text-slate-400">
                  <th className="px-8 py-4 text-left">Mã</th>
                  <th className="px-8 py-4 text-left">Tên đề tài</th>
                  <th className="px-8 py-4 text-left">Trạng thái</th>
                  <th className="px-8 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingCouncil.map(p => (
                  <tr key={p.id} className="text-sm hover:bg-slate-50">
                    <td className="px-8 py-5 font-bold text-primary">{p.code}</td>
                    <td className="px-8 py-5 font-medium text-slate-700">{p.title}</td>
                    <td className="px-8 py-5"><StatusBadge status={p.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => navigate('/research-staff/council-creation')}
                        className="text-xs font-bold text-primary border border-primary bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        Thành lập HĐ
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingCouncil.length === 0 && (
                  <tr><td colSpan={4} className="px-8 py-8 text-center text-sm text-slate-400">Không có đề tài chờ nghiệm thu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {loading && <p className="text-xs text-slate-400">Đang đồng bộ dữ liệu từ hệ thống...</p>}
    </div>
  );
};

export default ResearchStaffDashboard;
