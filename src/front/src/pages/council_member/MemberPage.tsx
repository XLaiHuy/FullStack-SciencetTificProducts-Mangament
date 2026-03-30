import React, { useState } from 'react';

const MemberPage: React.FC = () => {
  const [toast, setToast] = useState('');
  
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      
      {/* Top Header Equivalent */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-slate-800">Chi tiết Hội đồng & Thẩm định</h2>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold uppercase">Trạng thái: Đang thực hiện</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column */}
        <section className="w-full lg:w-80 space-y-8 flex-shrink-0">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Thông tin đề tài</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="text-base font-bold text-[#1e40af] leading-tight mb-3">Nghiên cứu ứng dụng AI trong chẩn đoán sớm hình ảnh y khoa tại Việt Nam</h4>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="w-20 text-slate-500 shrink-0">Mã số:</span><span className="font-medium">DT-2024-089</span></div>
                <div className="flex"><span className="w-20 text-slate-500 shrink-0">Chủ nhiệm:</span><span className="font-medium">GS.TS. Nguyễn Văn A</span></div>
                <div className="flex"><span className="w-20 text-slate-500 shrink-0">Thời hạn:</span><span className="font-medium text-orange-600">31/12/2024</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Kho tài liệu đề tài</h3>
            <div className="space-y-3">
              {['Báo cáo tổng kết.pdf', 'Bài báo khoa.pdf', 'Phụ lục thống kê.xlsx'].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                  <span className="text-sm font-medium truncate pr-2 w-3/4">{doc}</span>
                  <button onClick={() => showToast(`Tải xuống: ${doc}`)} className="text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded uppercase font-bold hover:bg-black transition-colors shrink-0">Tải về</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Mẫu văn bản của tôi</h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => showToast('Đang tải Hành chính...')} className="flex items-center justify-start p-3 bg-[#eff6ff] text-[#1e40af] border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium text-left">
                <span className="mr-3 text-lg font-bold">[DOC]</span> Mẫu biên bản hành chính
              </button>
              <button onClick={() => showToast('Đang tải Giấy mời...')} className="flex items-center justify-start p-3 bg-[#eff6ff] text-[#1e40af] border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium text-left">
                <span className="mr-3 text-lg font-bold">[DOC]</span> Giấy mời họp hội đồng
              </button>
            </div>
          </div>
        </section>

        {/* Right Column Workspace */}
        <section className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-xl font-bold text-slate-800">Giao diện Hành chính</h3>
            <p className="text-sm text-slate-500 mt-1">Quản lý hồ sơ cuộc họp và thủ tục hội đồng thẩm định.</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Tải lên hồ sơ phiên họp (Giấy mời, Biên bản, Ảnh chụp)</label>
            <button onClick={() => showToast('Mở hộp thoại tải tệp...')} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#1e40af] hover:bg-slate-50 transition-all bg-white">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 font-bold text-2xl">+</div>
              <p className="text-sm font-medium text-slate-600">Kéo thả tệp tin vào đây hoặc <span className="text-[#1e40af] underline">chọn từ máy tính</span></p>
              <p className="text-xs text-slate-400 mt-2 italic">Hỗ trợ: PDF, JPG, PNG, DOCX (Tối đa 20MB)</p>
            </button>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Đề xuất & Quản lý lịch họp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="w-12 h-12 bg-[#eff6ff] text-[#1e40af] rounded flex flex-col items-center justify-center shrink-0 mr-4">
                    <span className="text-[10px] font-bold">TH 4</span><span className="text-lg font-bold">12</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">14:00 - 16:30</p>
                    <p className="text-xs text-slate-500">Phòng họp A102 - Tầng 1</p>
                  </div>
                  <button onClick={() => showToast('Đã chọn lịch họp')} className="px-3 py-1 bg-[#1e40af] text-white text-[10px] font-bold rounded uppercase hover:bg-blue-800">Chọn</button>
                </div>
                <div className="flex items-center p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded flex flex-col items-center justify-center shrink-0 mr-4">
                    <span className="text-[10px] font-bold">TH 6</span><span className="text-lg font-bold">14</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">08:30 - 11:00</p>
                    <p className="text-xs text-slate-500">Phòng họp Trực tuyến (Zoom)</p>
                  </div>
                  <button onClick={() => showToast('Đã chọn lịch họp')} className="px-3 py-1 border border-slate-300 text-slate-600 text-[10px] font-bold rounded uppercase hover:bg-slate-50">Chọn</button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center flex flex-col items-center justify-center text-slate-400">
                Lịch biểu tương tác
                <br />
                (Tham chiếu theo thiết kế)
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end space-x-4">
            <button onClick={() => showToast('Đã lưu nháp')} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">Lưu nháp</button>
            <button onClick={() => showToast('Đã Hoàn tất & Gửi hội đồng')} className="px-6 py-2 bg-[#1e40af] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-shadow shadow-md">Hoàn tất & Gửi hội đồng</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MemberPage;
