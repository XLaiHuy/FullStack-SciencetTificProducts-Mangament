import React from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/api/projectService';
import { StatusBadge } from '../../components/StatusBadge';
import { reportService } from '../../services/api/reportService';

const STATUS_LABELS: Record<string, string> = {
  dang_thuc_hien: 'Dang thuc hien',
  tre_han: 'Tre han',
  cho_nghiem_thu: 'Cho nghiem thu',
  da_nghiem_thu: 'Da nghiem thu',
  da_thanh_ly: 'Da thanh ly',
  huy_bo: 'Huy bo',
};

const TopicStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [schoolYear, setSchoolYear] = React.useState('');
  const [fieldFilter, setFieldFilter] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof projectService.getAll>>>([]);
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
      setError(typeof e === 'string' ? e : 'Khong the tai danh sach de tai.');
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

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thong ke de tai</h1>
          <p className="text-gray-500 text-sm mt-1">Chi tiet thong ke theo linh vuc, khoa/vien va trang thai</p>
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
              .then(() => showToast('Da xuat bao cao de tai.'))
              .catch(() => setError('Khong the xuat bao cao de tai.'));
          }}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark"
        >
          Xuat bao cao
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex flex-wrap gap-3">
        <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
          <option value="">Tat ca nam hoc</option>
          {filterOptions.schoolYears.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          placeholder="Loc theo linh vuc"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white"
        />
        <input
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          placeholder="Loc theo khoa/vien"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
          <option value="">Tat ca trang thai</option>
          {filterOptions.statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
        <button onClick={() => loadRows().then(() => showToast('Da cap nhat bo loc de tai.')).catch(() => undefined)} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl">
          Loc
        </button>
        <button onClick={() => navigate('/reports/dashboard')} className="px-5 py-2 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50">
          Ve dashboard
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
          <h2 className="font-bold text-gray-800">Danh sach de tai theo bo loc</h2>
          <span className="text-xs text-gray-400">{rows.length} ket qua</span>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-gray-500">Dang tai du lieu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                {['Ma', 'Ten de tai', 'Chu nhiem', 'Linh vuc', 'Ngan sach', 'Trang thai'].map((h) => (
                  <th key={h} className="px-6 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((p) => (
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
              {rows.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-400" colSpan={6}>
                    Chua co du lieu phu hop bo loc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TopicStatisticsPage;
