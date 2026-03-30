import React, { useState } from 'react';

const ExportReportsPage: React.FC = () => {
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [reportType, setReportType] = useState('topic-summary');
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const reportTypes = [
    { value: 'topic-summary', label: 'Báo cáo Tổng hợp Đề tài', desc: 'Thống kê đầy đủ tất cả đề tài theo năm học' },
    { value: 'contract-list', label: 'Danh sách Hợp đồng', desc: 'Toàn bộ hợp đồng với trạng thái và kinh phí' },
    { value: 'budget-report', label: 'Báo cáo Ngân sách', desc: 'Phân tích chi tiết giải ngân và quyết toán' },
    { value: 'completion-rate', label: 'Tỷ lệ Nghiệm thu', desc: 'Báo cáo hiệu quả nghiệm thu theo lĩnh vực' },
    { value: 'overdue-list', label: 'Danh sách Đề tài trễ hạn', desc: 'Theo dõi các đề tài cần can thiệp' },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Xuất Báo cáo</h1>
        <p className="text-gray-500 text-sm mt-1">Tạo và xuất các báo cáo thống kê theo định dạng mong muốn</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Report type selector */}
        <div className="col-span-7 bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <h2 className="font-bold text-gray-800 mb-4">Chọn loại báo cáo</h2>
          <div className="space-y-3">
            {reportTypes.map(rt => (
              <label key={rt.value} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${reportType === rt.value ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <input
                  type="radio"
                  name="reportType"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={e => setReportType(e.target.value)}
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

        {/* Export config */}
        <div className="col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
            <h2 className="font-bold text-gray-800 mb-4">Cấu hình xuất báo cáo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Định dạng</label>
                <div className="flex gap-3">
                  {(['pdf', 'excel'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${format === f ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {f === 'pdf' ? '📄 PDF' : '📊 Excel'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Năm học</label>
                <select className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary">
                  <option>2023-2024</option>
                  <option>2022-2023</option>
                  <option>2021-2022</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cấp quản lý</label>
                <select className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary">
                  <option>Tất cả cấp</option>
                  <option>Cấp Trường</option>
                  <option>Cấp Bộ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview + Export */}
          <div className="bg-primary rounded-xl p-6 text-white shadow-button">
            <h3 className="font-bold text-lg mb-1">Sẵn sàng xuất</h3>
            <p className="text-blue-100 text-xs mb-4">
              {reportTypes.find(r => r.value === reportType)?.label} — Định dạng {format.toUpperCase()}
            </p>
            <button
              onClick={() => showToast(`Đang tạo báo cáo ${format.toUpperCase()}... Tệp sẽ được tải xuống ngay.`)}
              className="w-full py-3 bg-white text-primary text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors"
            >
              Xuất báo cáo ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReportsPage;
