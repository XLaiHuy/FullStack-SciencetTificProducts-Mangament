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
          <h2 className="text-xl font-bold text-slate-900">Tổng quan đề tài</h2>
          <p className="text-sm text-slate-500 mt-1">NCKH-2023-0142 — Phân tích ứng dụng AI trong quản lý đô thị thông minh</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">ĐANG THỰC HIỆN</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Notifications */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Thông báo từ Phòng NCKH</h3>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">3 Mới</span>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { title: 'Yêu cầu chỉnh sửa báo cáo giữa kỳ', desc: 'Vui lòng cập nhật phụ lục 4 trong hồ sơ trước ngày 25/10.', time: '2 giờ trước' },
              { title: 'Thông báo giải ngân đợt 2', desc: 'Kinh phí đợt 2 đã được phê duyệt và đang trong quá trình chuyển khoản.', time: 'Hôm qua' },
              { title: 'Nhắc nhở nộp báo cáo tiến độ tháng 10', desc: 'Hạn chót nộp báo cáo là ngày 30/10/2023.', time: '3 ngày trước' },
            ].map((n, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500 mt-1">{n.desc}</p>
                <span className="text-[10px] text-slate-400 mt-2 block">{n.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project card */}
        <div className="bg-primary rounded-xl p-6 text-white shadow-button flex flex-col justify-between">
          <div>
            <p className="text-blue-100/80 text-sm font-medium">Mã đề tài: NCKH-2023-0142</p>
            <h3 className="text-xl font-bold mt-2">Phân tích ứng dụng AI trong quản lý đô thị thông minh</h3>
          </div>
          <div className="mt-6">
            <p className="text-lg font-semibold">Giai đoạn: Đang thu thập dữ liệu</p>
            <p className="mt-3 text-xs opacity-80">Đánh giá tiếp theo: 15/11/2023</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-bold text-lg text-slate-800 mb-8">Lộ trình thực hiện</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="space-y-10 relative">
              {timeline.map((step, i) => (
                <div key={i} className={`flex items-start gap-8 ${step.status === 'upcoming' ? 'opacity-40' : ''}`}>
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white
                    ${step.status === 'done' ? 'bg-primary' : step.status === 'current' ? 'bg-primary/20 border-2 border-primary' : 'bg-slate-200'}`}>
                    <div className={`w-2 h-2 rounded-full ${step.status === 'current' ? 'bg-primary' : 'bg-white'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold leading-none ${step.status === 'current' ? 'text-primary' : 'text-slate-900'}`}>{step.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{step.date} — {step.status === 'done' ? 'Hoàn thành' : step.status === 'current' ? 'Đang thực hiện' : 'Sắp tới'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-bold text-lg text-slate-800 mb-6">Hạn chót sắp tới</h3>
          <div className="space-y-4">
            {[
              { type: 'Hạn báo cáo', title: 'Báo cáo tiến độ Tháng 10', info: 'Còn lại: 5 ngày (30/10)', cls: 'bg-red-50 border-red-100', typeCls: 'text-red-600', action: () => navigate('/project-owner/midterm-report') },
              { type: 'Yêu cầu chỉnh sửa', title: 'Chỉnh sửa phụ lục hồ sơ đợt 2', info: 'Còn lại: 12 ngày (06/11)', cls: 'bg-orange-50 border-orange-100', typeCls: 'text-orange-600', action: () => {} },
              { type: 'Nộp kết quả', title: 'Nộp kết quả khảo sát thực địa', info: 'Còn lại: 25 ngày (19/11)', cls: 'bg-blue-50 border-blue-100', typeCls: 'text-primary', action: () => navigate('/project-owner/research-submission') },
            ].map((d, i) => (
              <div key={i} className={`p-4 rounded-lg border cursor-pointer hover:opacity-90 ${d.cls}`} onClick={d.action}>
                <p className={`text-xs font-bold uppercase tracking-wider ${d.typeCls}`}>{d.type}</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{d.title}</p>
                <p className="text-xs text-slate-500 mt-2">{d.info}</p>
              </div>
            ))}
            <button
              onClick={() => navigate('/project-owner/research-submission')}
              className="w-full py-3 mt-4 text-sm font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-lg transition-colors"
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
