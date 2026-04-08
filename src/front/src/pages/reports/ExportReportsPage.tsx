import React, { useState } from 'react';
import { reportService } from '../../services/api/reportService';

const STATUS_LABELS: Record<string, string> = {
  dang_thuc_hien: 'Dang thuc hien',
  tre_han: 'Tre han',
  cho_nghiem_thu: 'Cho nghiem thu',
  da_nghiem_thu: 'Da nghiem thu',
  da_thanh_ly: 'Da thanh ly',
  huy_bo: 'Huy bo',
};

const ExportReportsPage: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'excel'>('excel');
  const [reportType, setReportType] = useState('topic-summary');
  const [schoolYear, setSchoolYear] = useState('');
  const [field, setField] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [filterOptions, setFilterOptions] = useState<{
    schoolYears: string[];
    fields: string[];
    departments: string[];
    statuses: string[];
  }>({ schoolYears: [], fields: [], departments: [], statuses: [] });

  React.useEffect(() => {
    reportService
      .getFilterOptions()
      .then((options) => setFilterOptions(options))
      .catch(() => undefined);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const reportTypes = [
    { value: 'topic-summary', label: 'Bao cao tong hop de tai', desc: 'Thong ke de tai theo bo loc hoc ky, linh vuc, trang thai' },
    { value: 'contract-list', label: 'Danh sach hop dong', desc: 'Tong hop hop dong nghien cuu va trang thai ky ket' },
    { value: 'budget-report', label: 'Bao cao ngan sach', desc: 'Tong hop ngan sach, tam ung va phan con lai' },
    { value: 'completion-rate', label: 'Ty le nghiem thu', desc: 'Thong ke ty le nghiem thu theo linh vuc' },
    { value: 'overdue-list', label: 'Danh sach de tai tre han', desc: 'Danh sach can can thiep tien do' },
  ];

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      await reportService.exportReport(reportType, format, {
        schoolYear: schoolYear || undefined,
        field: field || undefined,
        department: department || undefined,
        status: status || undefined,
      });
      showToast(`Da xuat bao cao ${format === 'csv' ? 'CSV' : 'Excel'}.`);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the xuat bao cao.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Xuat bao cao</h1>
        <p className="text-gray-500 text-sm mt-1">Tao va xuat cac bao cao thong ke theo du lieu thuc te</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-7 bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <h2 className="font-bold text-gray-800 mb-4">Chon loai bao cao</h2>
          <div className="space-y-3">
            {reportTypes.map((rt) => (
              <label key={rt.value} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${reportType === rt.value ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <input
                  type="radio"
                  name="reportType"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={(e) => setReportType(e.target.value)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">{rt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
            <h2 className="font-bold text-gray-800 mb-4">Cau hinh xuat bao cao</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dinh dang</label>
                <div className="flex gap-3">
                  {(['excel', 'csv'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${format === f ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {f === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nam hoc</label>
                <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tat ca nam hoc</option>
                  {filterOptions.schoolYears.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Linh vuc</label>
                <select value={field} onChange={(e) => setField(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tat ca linh vuc</option>
                  {filterOptions.fields.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Don vi</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tat ca don vi</option>
                  {filterOptions.departments.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Trang thai de tai</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tat ca</option>
                  {filterOptions.statuses.map((option) => (
                    <option key={option} value={option}>
                      {STATUS_LABELS[option] ?? option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-primary rounded-xl p-6 text-white shadow-button">
            <h3 className="font-bold text-lg mb-1">San sang xuat</h3>
            <p className="text-blue-100 text-xs mb-4">
              {reportTypes.find((r) => r.value === reportType)?.label} - Dinh dang {format.toUpperCase()}
            </p>
            <button
              onClick={() => handleExport().catch(() => undefined)}
              disabled={loading}
              className="w-full py-3 bg-white text-primary text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Dang xuat...' : 'Xuat bao cao ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReportsPage;
