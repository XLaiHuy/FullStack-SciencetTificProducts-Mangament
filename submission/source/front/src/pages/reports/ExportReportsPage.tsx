import React, { useState } from 'react';
import { reportService } from '../../services/api/reportService';

const STATUS_LABELS: Record<string, string> = {
  dang_thuc_hien: 'Đang thực hiện',
  tre_han: 'Trễ hạn',
  cho_nghiem_thu: 'Chờ nghiệm thu',
  da_nghiem_thu: 'Đã nghiệm thu',
  da_thanh_ly: 'Đã thanh lý',
  huy_bo: 'Hủy bỏ',
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
    { value: 'topic-summary', label: 'Báo cáo tổng hợp đề tài', desc: 'Thống kê đề tài theo bộ lọc học kỳ, lĩnh vực, trạng thái' },
    { value: 'contract-list', label: 'Danh sách hợp đồng', desc: 'Tổng hợp hợp đồng nghiên cứu và trạng thái ký kết' },
    { value: 'budget-report', label: 'Báo cáo ngân sách', desc: 'Tổng hợp ngân sách, tạm ứng và phần còn lại' },
    { value: 'completion-rate', label: 'Tỷ lệ nghiệm thu', desc: 'Thống kê tỷ lệ nghiệm thu theo lĩnh vực' },
    { value: 'overdue-list', label: 'Danh sách đề tài trễ hạn', desc: 'Danh sách cần can thiệp tiến độ' },
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
      showToast(`Đã xuất báo cáo ${format === 'csv' ? 'CSV' : 'Excel'}.`);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể xuất báo cáo.');
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
        <h1 className="text-2xl font-bold text-gray-800">Xuất báo cáo</h1>
        <p className="text-gray-500 text-sm mt-1">Tạo và xuất các báo cáo thống kê theo dữ liệu thực tế</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-7 bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <h2 className="font-bold text-gray-800 mb-4">Chọn loại báo cáo</h2>
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
            <h2 className="font-bold text-gray-800 mb-4">Cấu hình xuất báo cáo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Định dạng</label>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Năm học</label>
                <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tất cả năm học</option>
                  {filterOptions.schoolYears.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lĩnh vực</label>
                <select value={field} onChange={(e) => setField(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tất cả lĩnh vực</option>
                  {filterOptions.fields.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Đơn vị</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tất cả đơn vị</option>
                  {filterOptions.departments.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Trạng thái đề tài</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5">
                  <option value="">Tất cả</option>
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
            <h3 className="font-bold text-lg mb-1">Sẵn sàng xuất</h3>
            <p className="text-blue-100 text-xs mb-4">
              {reportTypes.find((r) => r.value === reportType)?.label} - Định dạng {format.toUpperCase()}
            </p>
            <button
              onClick={() => handleExport().catch(() => undefined)}
              disabled={loading}
              className="w-full py-3 bg-white text-primary text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xuất...' : 'Xuất báo cáo ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReportsPage;
