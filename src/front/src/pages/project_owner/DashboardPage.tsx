import React, { useEffect, useMemo, useState } from 'react';
import { projectService } from '../../services/api/projectService';
import type { Project } from '../../types';

const ProjectOwnerDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await projectService.getMine();
        setProjects(rows);
      } catch (err) {
        console.error(err);
        setError('Không thể tải dữ liệu đề tài từ hệ thống.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const latestProject = projects[0] ?? null;

  const counts = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'dang_thuc_hien' || p.status === 'tre_han').length;
    const waiting = projects.filter((p) => p.status === 'cho_nghiem_thu').length;
    const done = projects.filter((p) => p.status === 'da_nghiem_thu' || p.status === 'da_thanh_ly').length;
    return { total, active, waiting, done };
  }, [projects]);

  const statusLabel = (status: Project['status']) => {
    if (status === 'dang_thuc_hien') return 'Đang thực hiện';
    if (status === 'tre_han') return 'Trễ hạn';
    if (status === 'cho_nghiem_thu') return 'Chờ nghiệm thu';
    if (status === 'da_nghiem_thu') return 'Đã nghiệm thu';
    if (status === 'da_thanh_ly') return 'Đã thanh lý';
    return 'Hủy bỏ';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tổng quan đề tài</h2>
        <p className="text-sm text-gray-600 mt-2">Toàn bộ dữ liệu được lấy theo tài khoản chủ nhiệm đang đăng nhập.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-bold">Tổng đề tài</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{counts.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-bold">Đang thực hiện</p>
          <p className="text-2xl font-bold text-primary mt-2">{counts.active}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-bold">Chờ nghiệm thu</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{counts.waiting}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-bold">Đã hoàn tất</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{counts.done}</p>
        </div>
      </div>

      {loading && <div className="card p-6 text-sm text-gray-600">Đang tải dữ liệu đề tài...</div>}
      {!loading && error && <div className="card p-6 text-sm text-red-600">{error}</div>}

      {!loading && !error && !projects.length && (
        <div className="card p-6">
          <div className="empty-state-panel text-center">
            <span className="empty-state-icon">i</span>
            <p className="text-sm font-semibold text-gray-800">Tài khoản này chưa được gán đề tài nào</p>
            <p className="text-xs text-gray-600 mt-1">Khi phòng NCKH phân công đề tài, dữ liệu sẽ hiển thị tại đây.</p>
          </div>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-900">Danh sách đề tài của tôi</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {projects.map((p) => (
                <div key={p.id} className="p-4">
                  <p className="text-sm font-semibold text-gray-900">{p.code} - {p.title}</p>
                  <p className="text-xs text-gray-600 mt-1">Khoa: {p.department} | Lĩnh vực: {p.field}</p>
                  <p className="text-xs text-gray-600 mt-1">{p.startDate} - {p.endDate} | {statusLabel(p.status)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200 p-6">
            <p className="text-sm font-medium text-primary-700">Đề tài gần nhất</p>
            <h3 className="text-xl font-bold mt-2 text-gray-900">{latestProject?.title}</h3>
            <p className="text-sm text-gray-700 mt-2">Mã đề tài: {latestProject?.code}</p>
            <p className="text-sm text-gray-700 mt-1">Trạng thái: {latestProject ? statusLabel(latestProject.status) : 'N/A'}</p>
            <p className="text-sm text-gray-700 mt-1">Kinh phí: {Number(latestProject?.budget ?? 0).toLocaleString('vi-VN')} VNĐ</p>
          </div>
        </div>
      )}
      </div>
  );
};

export default ProjectOwnerDashboard;
