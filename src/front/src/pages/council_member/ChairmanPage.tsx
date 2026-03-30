import React, { useState } from 'react';
import { councilService } from '../../services/api/councilService';

const ChairmanPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scoring');
  const [toast, setToast] = useState('');
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [councilId, setCouncilId] = useState('');
  
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  React.useEffect(() => {
    councilService.getAll().then((list) => {
      if (list.length > 0) setCouncilId(list[0].id);
    }).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-full gap-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      
      {/* Top Header Bar replicated from HTML */}
      <header className="bg-white border border-slate-200 rounded-xl flex items-center justify-between px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Màn hình làm việc Chủ tịch Hội đồng</h2>
        <div className="flex gap-3">
          <button onClick={() => showToast('Đã lưu tạm')} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-all">Lưu tạm</button>
          <button onClick={async () => {
            if (!councilId || !score) return;
            await councilService.submitScore(councilId, Number(score), comments);
            setSubmittedAt(new Date().toISOString());
            showToast('Đã gửi kết quả & kết thúc');
          }} disabled={Boolean(submittedAt)} className="bg-[#1E40AF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-all shadow-sm disabled:opacity-50">
            Gửi kết quả & Kết thúc nghiệm thu
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column (Area A) */}
        <section className="col-span-1 space-y-6">
          {/* Block 1: Thông tin đề tài */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thông tin đề tài</h3>
            <div className="space-y-3">
              <div><p className="text-xs text-slate-500">Mã số</p><p className="font-semibold text-[#1E40AF] text-sm">DT-2024-089</p></div>
              <div><p className="text-xs text-slate-500">Tên đề tài</p><p className="font-medium text-slate-800 leading-snug">Nghiên cứu giải pháp bảo tồn đa dạng sinh học trong bối cảnh biến đổi khí hậu tại khu vực Miền Trung</p></div>
              <div><p className="text-xs text-slate-500">Chủ nhiệm</p><p className="text-slate-800 font-medium">GS.TS. Nguyễn Văn A</p></div>
            </div>
          </div>

          {/* Block 2: Kho tài liệu */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Kho Tài liệu</h3>
            <ul className="space-y-2">
              {['Báo cáo tổng kết.pdf', 'Bài báo khoa học.pdf', 'Sản phẩm phần mềm.zip'].map((doc, idx) => (
                <li key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 group">
                  <span className="text-sm text-slate-700 truncate">{doc}</span>
                  <button onClick={() => showToast(`Đang mở: ${doc}`)} className="text-xs text-[#1E40AF] font-medium underline">
                    {doc.endsWith('.zip') ? 'Tải về' : 'Xem'}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Block 3: Biểu mẫu của tôi */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Biểu mẫu của tôi</h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => showToast('Đang tải Phiếu chấm điểm...')} className="text-left w-full px-4 py-3 bg-white border border-[#1E40AF] text-[#1E40AF] text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">Tải Phiếu chấm điểm Chủ tịch</button>
              <button onClick={() => showToast('Đang tải Mẫu biên bản...')} className="text-left w-full px-4 py-3 bg-white border border-[#1E40AF] text-[#1E40AF] text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">Tải Mẫu biên bản kết luận</button>
            </div>
          </div>
        </section>

        {/* Right Column (Area B) */}
        <section className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-fit overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button onClick={() => setActiveTab('scoring')} className={`px-8 py-4 text-sm font-bold border-b-2 ${activeTab === 'scoring' ? 'text-[#1E40AF] border-[#1E40AF]' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>Chấm điểm & Nhận xét</button>
              <button onClick={() => setActiveTab('conclusion')} className={`px-8 py-4 text-sm font-bold border-b-2 ${activeTab === 'conclusion' ? 'text-[#1E40AF] border-[#1E40AF]' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>Kết luận chính thức</button>
            </div>

            {/* Tab contents */}
            <div className="p-6 space-y-5">
              {activeTab === 'scoring' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-4 gap-6">
                    <div className="col-span-1">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Điểm của Chủ tịch</label>
                      <div className="relative">
                        <input value={score} onChange={(e) => setScore(e.target.value)} disabled={Boolean(submittedAt)} type="number" min="0" max="100" placeholder="0" className="w-full border-slate-200 rounded-lg text-sm focus:ring-[#1E40AF] focus:border-[#1E40AF] pr-10" />
                        <span className="absolute right-3 top-2 text-slate-400 text-sm">/100</span>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nhận xét, đánh giá chi tiết</label>
                      <textarea value={comments} onChange={(e) => setComments(e.target.value)} disabled={Boolean(submittedAt)} rows={6} placeholder="Nhập nhận xét chi tiết của Chủ tịch về đề tài..." className="w-full border-slate-200 rounded-lg text-sm focus:ring-[#1E40AF] focus:border-[#1E40AF]"></textarea>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dành cho Kết luận chính thức (Tổng hợp)</p>
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Điểm mạnh của đề tài</label>
                      <textarea rows={2} placeholder="Nhập những điểm mạnh nổi bật..." className="w-full border-slate-200 rounded-lg text-sm"></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Hạn chế cần chỉnh sửa</label>
                      <textarea rows={2} placeholder="Nhập các hạn chế, lỗi kỹ thuật..." className="w-full border-slate-200 rounded-lg text-sm"></textarea>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Thông tin tham khảo từ Hội đồng</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border border-slate-200"><p className="text-xs text-slate-500">Phản biện 1</p><p className="font-bold text-slate-800">90/100đ</p></div>
                  <div className="bg-white p-3 rounded border border-slate-200"><p className="text-xs text-slate-500">Phản biện 2</p><p className="font-bold text-slate-800">85/100đ</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Bảng tổng hợp điểm toàn hội đồng</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr><th className="px-4 py-3">Thành viên</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3 text-center">Điểm</th><th className="px-4 py-3">Trạng thái</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3">Trần Văn B</td><td className="px-4 py-3 text-slate-500">Phản biện 1</td><td className="px-4 py-3 text-center font-semibold">90</td><td className="px-4 py-3 text-green-600 text-xs font-medium uppercase">Đã hoàn thành</td></tr>
                  <tr><td className="px-4 py-3">Lê Thị C</td><td className="px-4 py-3 text-slate-500">Phản biện 2</td><td className="px-4 py-3 text-center font-semibold">85</td><td className="px-4 py-3 text-green-600 text-xs font-medium uppercase">Đã hoàn thành</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={() => showToast('Mở dialog tải lên biên bản...')} className="w-full bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#1E40AF] hover:bg-blue-50 transition-all">
            <div className="p-3 bg-blue-50 rounded-full mb-3 text-[#1E40AF] text-xl font-bold">+</div>
            <p className="text-sm font-bold text-slate-800">Tải bản scan Biên bản nghiệm thu đã ký</p>
            <p className="text-xs text-slate-500 mt-1">Kéo và thả tệp vào đây hoặc click để chọn (PDF, tối đa 20MB)</p>
          </button>
        </section>
      </div>
    </div>
  );
};

export default ChairmanPage;
