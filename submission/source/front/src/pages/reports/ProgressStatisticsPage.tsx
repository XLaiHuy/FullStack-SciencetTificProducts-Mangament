import React from 'react';
import { projectService } from '../../services/api/projectService';

const STATUS_META: Record<string, { label: string; color: string; textColor: string }> = {
  dang_thuc_hien: { label: 'Đang thực hiện', color: 'bg-blue-500', textColor: 'text-blue-600' },
  tre_han: { label: 'Trễ hạn', color: 'bg-red-500', textColor: 'text-red-600' },
  cho_nghiem_thu: { label: 'Chờ nghiệm thu', color: 'bg-amber-500', textColor: 'text-amber-600' },
  da_nghiem_thu: { label: 'Đã nghiệm thu', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  da_thanh_ly: { label: 'Đã thanh lý', color: 'bg-indigo-500', textColor: 'text-indigo-600' },
  huy_bo: { label: 'Hủy bỏ', color: 'bg-slate-500', textColor: 'text-slate-600' },
};

const ProgressStatisticsPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [projects, setProjects] = React.useState<Awaited<ReturnType<typeof projectService.getAll>>>([]);

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await projectService.getAll();
        setProjects(rows);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Không thể tải thống kê tiến độ.');
      } finally {
        setLoading(false);
      }
    };
    run().catch(() => undefined);
  }, []);

  const groups = React.useMemo(() => {
    const total = projects.length || 1;
    return Object.keys(STATUS_META).map((key) => {
      const count = projects.filter((p) => p.status === key).length;
      return { key, ...STATUS_META[key], count, pct: (count / total) * 100 };
    });
  }, [projects]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thống kê tiến độ</h1>
        <p className="text-gray-500 text-sm mt-1">Theo dõi tiến độ thực hiện các đề tài nghiên cứu</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        {groups.map((s) => (
          <div key={s.key} className="bg-white p-5 rounded-xl border border-gray-100 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <p className="text-xs font-bold text-gray-400 uppercase">{s.label}</p>
            </div>
            <p className={`text-3xl font-black ${s.textColor}`}>{s.count}</p>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${s.pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">{s.pct.toFixed(1)}% tổng số</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
        <h2 className="font-bold text-gray-800 mb-6">Tiến độ đề tài đang thực hiện</h2>
        {loading ? (
          <div className="text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="space-y-6">
            {projects
              .filter((p) => p.status === 'dang_thuc_hien')
              .map((p) => {
                const start = new Date(p.startDate).getTime();
                const end = new Date(p.endDate).getTime();
                const now = Date.now();
                const pct = Number.isFinite((now - start) / (end - start))
                  ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
                  : 0;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded mr-2">{p.code}</span>
                        <span className="text-sm font-medium text-gray-700">{p.title}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-500">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${pct > 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{p.startDate}</span>
                      <span>{p.endDate}</span>
                    </div>
                  </div>
                );
              })}
            {projects.filter((p) => p.status === 'dang_thuc_hien').length === 0 && (
              <p className="text-sm text-gray-400">Không có đề tài đang thực hiện.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressStatisticsPage;
