import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../hooks/useAuth';
import { councilService } from '../../services/api/councilService';
import { StatusBadge } from '../../components/StatusBadge';

const CouncilMemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
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
        setError(typeof e === 'string' ? e : 'Không thể tải danh sách hội đồng.');
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard hội đồng nghiệm thu</h1>
        <p className="text-gray-600 text-sm mt-2">Danh sách đề tài được phân công đánh giá</p>
      </div>

      {error && (
        <div className="card border-error-200 bg-error-50">
          <div className="px-6 py-4 text-sm font-semibold text-error-700">
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Hội đồng được giao', stats.total, 'badge-primary'],
          ['Chờ đánh giá', stats.pending, 'badge-warning'],
          ['Đang đánh giá', stats.inProgress, 'badge-info'],
          ['Đã hoàn thành', stats.completed, 'badge-success'],
        ].map(([label, val, badge]) => (
          <div key={label as string} className="card">
            <p className="text-xs font-bold text-gray-600 uppercase mb-2">{label}</p>
            <p className="text-4xl font-bold text-gray-900">{String(val)}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Hội đồng được phân công</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Đang tải dữ liệu...</div>
        ) : councils.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">Bạn chưa được phân công hội đồng nào.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {councils.map((council) => {
              const myMember = council.members.find(m => m.userId === currentUser?.id);
              const myRole = myMember?.role;
              return (
              <div key={council.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-1 rounded">{council.decisionCode}</span>
                    <h3 className="font-bold text-gray-900 mt-2">{council.projectTitle}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Mã đề tài: {council.projectCode} • Thành viên: {council.members.length}
                    </p>
                  </div>
                  <StatusBadge status={council.status} />
                </div>
                <div className="flex gap-3 mt-4">
                  {myRole === 'chu_tich' && (
                    <button onClick={() => navigate('/council-member/chairman')} className="btn-primary text-xs">
                      Không gian chủ tịch
                    </button>
                  )}
                  {(myRole === 'phan_bien_1' || myRole === 'phan_bien_2') && (
                    <button onClick={() => navigate('/council-member/reviewer')} className="btn-secondary text-xs">
                      Không gian phản biện
                    </button>
                  )}
                  {myRole === 'thu_ky' && (
                    <button onClick={() => navigate('/council-member/secretary')} className="btn-secondary text-xs">
                      Không gian thư ký
                    </button>
                  )}
                  {myRole === 'uy_vien' && (
                    <button onClick={() => navigate('/council-member/member')} className="btn-primary text-xs">
                      Không gian ủy viên
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouncilMemberDashboard;
