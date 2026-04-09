import React from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/api/projectService';
import { StatusBadge } from '../../components/StatusBadge';
import { reportService } from '../../services/api/reportService';

const PAGE_SIZE = 40;

const STATUS_LABELS: Record<string, string> = {
  dang_thuc_hien: 'Đang thực hiện',
  tre_han: 'Trễ hạn',
  cho_nghiem_thu: 'Chờ nghiệm thu',
  da_nghiem_thu: 'Đã nghiệm thu',
  da_thanh_ly: 'Đã thanh lý',
  huy_bo: 'Hủy bỏ',
};

const TopicStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [schoolYear, setSchoolYear] = React.useState('');
  const [fieldFilter, setFieldFilter] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof projectService.getAll>>>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [filterOptions, setFilterOptions] = React.useState<{
    schoolYears: string[];
    statuses: string[];
  }>({ schoolYears: [], statuses: [] });

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadRows = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await projectService.getAll();
      const filtered = all.filter((p) => {
        if (schoolYear) {
          const year = schoolYear.split('-')[0];
          if (!p.code.includes(year)) return false;
        }
        if (fieldFilter.trim() && !p.field.toLowerCase().includes(fieldFilter.trim().toLowerCase())) return false;
        if (departmentFilter.trim() && !p.department.toLowerCase().includes(departmentFilter.trim().toLowerCase())) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        return true;
      });
      setRows(filtered);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải danh sách đề tài.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear, fieldFilter, departmentFilter, statusFilter]);

  React.useEffect(() => {
    loadRows().catch(() => undefined);
  }, [loadRows]);

  React.useEffect(() => {
    reportService
      .getFilterOptions()
      .then((options) => {
        setFilterOptions({
          schoolYears: options.schoolYears,
          statuses: options.statuses,
        });
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    setPage(1);
  }, [schoolYear, fieldFilter, departmentFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = React.useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage],
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thống kê đề tài</h1>
          <p className="text-gray-500 text-sm mt-1">Chi tiết thống kê theo lĩnh vực, khoa/viện và trạng thái</p>
        </div>
        <button
          onClick={() => {
            reportService
              .exportReport('topic-summary', 'excel', {
                schoolYear: schoolYear || undefined,
                field: fieldFilter || undefined,
                department: departmentFilter || undefined,
                status: statusFilter || undefined,
              })
              .then(() => showToast('Đã xuất báo cáo đề tài.'))
              .catch(() => setError('Không thể xuất báo cáo đề tài.'));
          }}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark"
        >
          Xuất báo cáo
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex flex-wrap gap-3">
        <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
          <option value="">Tất cả năm học</option>
          {filterOptions.schoolYears.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          placeholder="Lọc theo lĩnh vực"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white"
        />
        <input
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          placeholder="Lọc theo khoa/viện"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
          <option value="">Tất cả trạng thái</option>
          {filterOptions.statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
        <button onClick={() => loadRows().then(() => showToast('Đã cập nhật bộ lọc đề tài.')).catch(() => undefined)} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl">
          Lọc
        </button>
        <button onClick={() => navigate('/reports/dashboard')} className="px-5 py-2 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50">
          Về dashboard
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
          <h2 className="font-bold text-gray-800">Danh sách đề tài theo bộ lọc</h2>
          <span className="text-xs text-gray-400">{rows.length} kết quả{rows.length > 0 ? ` • Trang ${safePage}/${totalPages}` : ''}</span>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                {['Mã', 'Tên đề tài', 'Chủ nhiệm', 'Lĩnh vực', 'Ngân sách', 'Trạng thái'].map((h) => (
                  <th key={h} className="px-6 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedRows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-primary">{p.code}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{p.title}</td>
                  <td className="px-6 py-4 text-gray-500">{p.owner}</td>
                  <td className="px-6 py-4 text-gray-500">{p.field}</td>
                  <td className="px-6 py-4 text-gray-600">{(p.budget / 1_000_000).toFixed(0)}tr VND</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
              {pagedRows.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-400" colSpan={6}>
                    Chưa có dữ liệu phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Trang trước
          </button>
          <span className="text-xs font-semibold text-gray-600 px-3">{safePage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage === totalPages}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
};

export default TopicStatisticsPage;
