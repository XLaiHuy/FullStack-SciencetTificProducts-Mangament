import React from 'react';
import { useNavigate } from 'react-router-dom';
import { councilService } from '../../services/api/councilService';
import { StatusBadge } from '../../components/StatusBadge';

const CouncilMemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [councils, setCouncils] = React.useState<Awaited<ReturnType<typeof councilService.getAll>>>([]);

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await councilService.getMine();
        setCouncils(rows);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Khong the tai danh sach hoi dong.');
      } finally {
        setLoading(false);
      }
    };
    run().catch(() => undefined);
  }, []);

  const stats = {
    total: councils.length,
    pending: councils.filter((c) => c.status === 'cho_danh_gia').length,
    inProgress: councils.filter((c) => c.status === 'dang_danh_gia').length,
    completed: councils.filter((c) => c.status === 'da_hoan_thanh').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard hoi dong nghiem thu</h1>
        <p className="text-gray-500 text-sm mt-1">Danh sach de tai duoc phan cong danh gia</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          ['Hoi dong duoc giao', stats.total, 'text-primary'],
          ['Cho danh gia', stats.pending, 'text-amber-600'],
          ['Dang danh gia', stats.inProgress, 'text-sky-600'],
          ['Da hoan thanh', stats.completed, 'text-emerald-600'],
        ].map(([label, val, cls]) => (
          <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
            <p className={`text-3xl font-bold ${cls}`}>{String(val)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Hoi dong duoc phan cong</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Dang tai du lieu...</div>
        ) : councils.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Ban chua duoc phan cong hoi dong nao.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {councils.map((council) => (
              <div key={council.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{council.decisionCode}</span>
                    <h3 className="font-bold text-gray-900 mt-2">{council.projectTitle}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Ma de tai: {council.projectCode} • Thanh vien: {council.members.length}
                    </p>
                  </div>
                  <StatusBadge status={council.status} />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => navigate('/council-member/member')} className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl shadow-card hover:bg-primary-dark">
                    Khong gian uy vien
                  </button>
                  <button onClick={() => navigate('/council-member/reviewer')} className="px-4 py-2 text-xs font-bold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
                    Khong gian phan bien
                  </button>
                  <button onClick={() => navigate('/council-member/secretary')} className="px-4 py-2 text-xs font-bold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
                    Khong gian thu ky
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouncilMemberDashboard;
