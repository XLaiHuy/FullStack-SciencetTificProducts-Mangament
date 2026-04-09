import React from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../../services/api/reportService';
import { projectService } from '../../services/api/projectService';

const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [stats, setStats] = React.useState<Awaited<ReturnType<typeof reportService.getStats>> | null>(null);
  const [projects, setProjects] = React.useState<Awaited<ReturnType<typeof projectService.getAll>>>([]);
  const [topics, setTopics] = React.useState<Array<{ field: string; count: number }>>([]);
  const [progress, setProgress] = React.useState<Array<{ status: string; count: number }>>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, projectsData, topicData, progressData] = await Promise.all([
        reportService.getStats(),
        projectService.getAll(),
        reportService.getProjectsByField(),
        reportService.getProjectsByStatus(),
      ]);
      setStats(statsData);
      setProjects(projectsData.slice(0, 5));
      setTopics(topicData.slice(0, 6));
      setProgress(progressData);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải dữ liệu báo cáo.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const totalProgress = progress.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan báo cáo và thống kê</h1>
          <p className="text-gray-400 text-sm mt-1">Cập nhật từ dữ liệu hệ thống thời gian thực</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadData().catch(() => undefined)} className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50">
            Tải lại
          </button>
          <button onClick={() => navigate('/reports/export')} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark">
            Xuất báo cáo
          </button>
          <button
            onClick={() => {
              showToast('Đang xuất CSV tổng hợp đề tài...');
              reportService.exportReport('topic-summary', 'csv').catch(() => undefined);
            }}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black"
          >
            Xuất CSV nhanh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
              <p className="text-gray-500 text-sm font-medium">Tổng số đề tài</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalProjects.toLocaleString('vi-VN') ?? 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
              <p className="text-gray-500 text-sm font-medium">Đang thực hiện</p>
              <p className="text-3xl font-bold text-primary mt-2">{stats?.activeProjects.toLocaleString('vi-VN') ?? 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
              <p className="text-gray-500 text-sm font-medium">Đã nghiệm thu</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{stats?.completedProjects.toLocaleString('vi-VN') ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
              <h4 className="font-bold text-gray-800 mb-4">Thống kê theo lĩnh vực</h4>
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div key={topic.field}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{topic.field}</span>
                      <span className="font-semibold text-primary">{topic.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min((topic.count / (topics[0]?.count || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
              <h4 className="font-bold text-gray-800 mb-4">Phân bố trạng thái đề tài</h4>
              <div className="space-y-3">
                {progress.map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{item.status}</span>
                    <span className="text-sm font-bold text-gray-900">
                      {item.count} ({((item.count / totalProgress) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h4 className="font-bold text-gray-800">Danh sách đề tài cập nhật gần đây</h4>
              <button onClick={() => navigate('/reports/topic-statistics')} className="text-primary text-sm font-bold hover:underline">
                Xem tất cả
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Mã đề tài</th>
                  <th className="px-6 py-4">Tên đề tài</th>
                  <th className="px-6 py-4">Chủ nhiệm</th>
                  <th className="px-6 py-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-bold text-primary">{p.code}</td>
                    <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{p.title}</td>
                    <td className="px-6 py-4 text-gray-600">{p.owner}</td>
                    <td className="px-6 py-4 text-gray-600">{p.status}</td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-400" colSpan={4}>
                      Chưa có dữ liệu đề tài.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsDashboard;
