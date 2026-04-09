import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProjectOwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const timeline = [
    { label: 'Khởi tạo đề tài', date: '12/01/2023', status: 'done' },
    { label: 'Tổng quan tài liệu & Khung nghiên cứu', date: '05/03/2023', status: 'done' },
    { label: 'Thu thập & Phân tích dữ liệu', date: '20/08/2023', status: 'current' },
    { label: 'Nghiệm thu cuối kỳ & Giao nộp kết quả', date: '15/12/2023', status: 'upcoming' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Tổng quan đề tài</h2>
          <p className="text-sm text-gray-600 mt-2">NCKH-2023-0142 — Phân tích ứng dụng AI trong quản lý đô thị thông minh</p>
        </div>
        <span className="badge badge-success">ĐANG THỰC HIỆN</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-900">Thông báo từ Phòng NCKH</h3>
            <span className="badge badge-info text-xs">3 Mới</span>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { title: 'Yêu cầu chỉnh sửa báo cáo giữa kỳ', desc: 'Vui lòng cập nhật phụ lục 4 trong hồ sơ trước ngày 25/10.', time: '2 giờ trước' },
              { title: 'Thông báo giải ngân đợt 2', desc: 'Kinh phí đợt 2 đã được phê duyệt và đang trong quá trình chuyển khoản.', time: 'Hôm qua' },
              { title: 'Nhắc nhở nộp báo cáo tiến độ tháng 10', desc: 'Hạn chót nộp báo cáo là ngày 30/10/2023.', time: '3 ngày trước' },
            ].map((n, i) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-600 mt-1">{n.desc}</p>
                <span className="text-xs text-gray-500 mt-2 block">{n.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project card */}
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="p-6 text-gray-900">
            <p className="text-sm font-medium text-primary-700">Mã đề tài: NCKH-2023-0142</p>
            <h3 className="text-xl font-bold mt-3">Phân tích ứng dụng AI trong quản lý đô thị thông minh</h3>
            <div className="mt-8">
              <p className="text-lg font-semibold text-gray-900">Giai đoạn: Đang thu thập dữ liệu</p>
              <p className="mt-3 text-xs text-gray-700">Đánh giá tiếp theo: 15/11/2023</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 card">
          <h3 className="font-bold text-lg text-gray-900 mb-6 px-6 py-4 border-b border-gray-200">Lộ trình thực hiện</h3>
          <div className="px-6 pb-6">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />
              <div className="space-y-8 relative">
                {timeline.map((step, i) => (
                  <div key={i} className={`flex items-start gap-6 ${step.status === 'upcoming' ? 'opacity-50' : ''}`}>
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0
                      ${step.status === 'done' ? 'bg-success-500' : step.status === 'current' ? 'bg-primary-50 border-2 border-primary-500' : 'bg-gray-300'}`}>
                      <div className={`w-2 h-2 rounded-full ${step.status === 'current' ? 'bg-primary-500' : 'bg-white'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold leading-none ${step.status === 'current' ? 'text-primary-600' : 'text-gray-900'}`}>{step.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{step.date} — {step.status === 'done' ? 'Hoàn thành' : step.status === 'current' ? 'Đang thực hiện' : 'Sắp tới'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Deadlines */}
        <div className="card">
          <h3 className="font-bold text-lg text-gray-900 mb-4 px-6 py-4 border-b border-gray-200">Hạn chót sắp tới</h3>
          <div className="space-y-3 px-6 pb-6">
            {[
              { type: 'Hạn báo cáo', title: 'Báo cáo tiến độ Tháng 10', info: 'Còn lại: 5 ngày (30/10)', badge: 'badge-error', action: () => {} },
              { type: 'Yêu cầu chỉnh sửa', title: 'Chỉnh sửa phụ lục hồ sơ đợt 2', info: 'Còn lại: 12 ngày (06/11)', badge: 'badge-warning', action: () => {} },
              { type: 'Nộp kết quả', title: 'Nộp kết quả khảo sát thực địa', info: 'Còn lại: 25 ngày (19/11)', badge: 'badge-info', action: () => {} },
            ].map((d, i) => (
              <div key={i} className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${d.badge === 'badge-error' ? 'bg-error-50 border-error-200' : d.badge === 'badge-warning' ? 'bg-warning-50 border-warning-200' : 'bg-info-50 border-info-200'}`} onClick={d.action}>
                <p className={`text-xs font-bold uppercase tracking-wider ${d.badge === 'badge-error' ? 'text-error-700' : d.badge === 'badge-warning' ? 'text-warning-700' : 'text-info-700'}`}>{d.type}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{d.title}</p>
                <p className="text-xs text-gray-600 mt-1">{d.info}</p>
              </div>
            ))}
            <button
              onClick={() => {}}
              className="w-full py-2 mt-2 text-sm font-semibold text-primary-600 bg-primary-50 border border-primary-200 hover:bg-primary-100 rounded-lg transition-colors"
            >
              Xem toàn bộ lịch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOwnerDashboard;
