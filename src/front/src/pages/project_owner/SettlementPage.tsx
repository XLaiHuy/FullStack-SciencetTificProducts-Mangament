import React, { useState } from 'react';

const SettlementPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quyết toán đề tài</h1>
        <p className="text-slate-500 text-sm mt-1">Nộp hồ sơ quyết toán kinh phí nghiên cứu</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[['Tổng kinh phí', '500.000.000 VNĐ', 'text-slate-800'], ['Đã tạm ứng', '200.000.000 VNĐ', 'text-primary'], ['Còn lại quyết toán', '300.000.000 VNĐ', 'text-amber-600']].map(([label, val, cls]) => (
          <div key={label} className="bg-white border rounded-xl p-5 shadow-card">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">{label}</p>
            <p className={`text-xl font-black ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Nộp hồ sơ quyết toán</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung quyết toán</label>
            <textarea className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary" rows={4} placeholder="Mô tả chi tiết nội dung chi tiêu..." />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Số tiền quyết toán (VNĐ)</label>
              <input type="number" className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary py-2.5" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Khoản chi</label>
              <select className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary py-2.5">
                <option>Thiết bị nghiên cứu</option>
                <option>Vật tư thí nghiệm</option>
                <option>Công tác phí</option>
                <option>Hội thảo, hội nghị</option>
                <option>Thù lao thực hiện</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tải lên chứng từ (hóa đơn, biên lai...)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:border-primary hover:bg-blue-50 transition-all cursor-pointer">
              <p className="text-sm font-bold text-slate-700">Kéo thả hoặc <span className="text-primary">chọn file</span></p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, JPG (Max 20MB)</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button className="px-6 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50">Lưu nháp</button>
            <button
              onClick={() => showToast('Đã nộp hồ sơ quyết toán thành công! Phòng NCKH sẽ xem xét trong 5-7 ngày.')}
              className="px-8 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark"
            >NỘP HỒ SƠ QUYẾT TOÁN</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementPage;
