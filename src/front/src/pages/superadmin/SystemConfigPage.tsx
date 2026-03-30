import React, { useState } from 'react';

const SystemConfigPage: React.FC = () => {
  const [maxScore, setMaxScore] = useState(100);
  const [maxFileSize, setMaxFileSize] = useState(20);
  const [allowedFormats, setAllowedFormats] = useState('.pdf, .docx, .xlsx');
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cấu hình Hệ thống</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý các tham số vận hành của hệ thống NCKH</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* General settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <h2 className="font-bold text-lg text-gray-900 mb-6">Tham số chung</h2>
          <form className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Thang điểm tối đa</label>
              <input type="number" value={maxScore} onChange={e => setMaxScore(+e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Dung lượng file tối đa (MB)</label>
              <input type="number" value={maxFileSize} onChange={e => setMaxFileSize(+e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Định dạng file cho phép</label>
              <input type="text" value={allowedFormats} onChange={e => setAllowedFormats(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
              <p className="text-xs text-gray-400 mt-1">Phân cách bằng dấu phẩy. VD: .pdf, .docx</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Số ngày nhắc trước hạn nộp báo cáo</label>
              <input type="number" defaultValue="7" className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button type="button" onClick={() => showToast('Cấu hình đã được lưu thành công!')} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black">Lưu cấu hình</button>
            </div>
          </form>
        </div>

        {/* Email / Notification settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <h2 className="font-bold text-lg text-gray-900 mb-6">Cài đặt Thông báo Email</h2>
          <div className="space-y-4">
            {[
              ['Nhắc nhở nộp báo cáo tiến độ', true],
              ['Thông báo gia hạn đề tài', true],
              ['Thông báo nghiệm thu', true],
              ['Thông báo quyết toán', false],
            ].map(([label, checked]) => (
              <div key={label as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <label className="text-sm font-semibold text-gray-700">{label as string}</label>
                <input type="checkbox" defaultChecked={checked as boolean} className="w-5 h-5 accent-primary rounded" />
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">SMTP Server</label>
              <input type="text" defaultValue="smtp.university.edu.vn" className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Email gửi đi</label>
              <input type="email" defaultValue="nckh@university.edu.vn" className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary" />
            </div>
            <button type="button" onClick={() => showToast('Đã kiểm tra kết nối email thành công!')} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Kiểm tra kết nối</button>
          </div>
        </div>
      </div>

      {/* Storage */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
        <h2 className="font-bold text-lg text-gray-900 mb-6">Dung lượng Lưu trữ</h2>
        <div className="mb-4">
          <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
            <span>Đã sử dụng</span>
            <span>45GB / 100GB (45%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: '45%' }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-center">
            <p className="text-xs font-bold text-gray-500 mb-1">Hồ sơ hợp đồng</p>
            <p className="text-lg font-black text-primary">18.2 GB</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-center">
            <p className="text-xs font-bold text-gray-500 mb-1">Báo cáo nghiên cứu</p>
            <p className="text-lg font-black text-purple-600">22.4 GB</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-xs font-bold text-gray-500 mb-1">Biểu mẫu & tài liệu</p>
            <p className="text-lg font-black text-gray-600">4.4 GB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigPage;
