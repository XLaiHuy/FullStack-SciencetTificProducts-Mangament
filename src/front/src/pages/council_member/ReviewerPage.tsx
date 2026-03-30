import React, { useState } from 'react';
import { councilService } from '../../services/api/councilService';

const ReviewerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('review');
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
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar (Area A) */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Thông tin Đề tài</h2>
            <div className="space-y-4">
              <div><label className="block text-xs text-slate-400 mb-1">Mã số đề tài</label><p className="text-sm font-semibold text-slate-800">DT-2023-HB-042</p></div>
              <div><label className="block text-xs text-slate-400 mb-1">Tên đề tài</label><p className="text-sm font-medium text-slate-800 leading-relaxed">Nghiên cứu ứng dụng trí tuệ nhân tạo trong tối ưu hóa mạng lưới cung ứng logistic tại khu vực kinh tế trọng điểm phía Nam.</p></div>
              <div><label className="block text-xs text-slate-400 mb-1">Chủ nhiệm đề tài</label><p className="text-sm font-medium text-slate-800">TS. Trần Thị B</p></div>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Kho Tài liệu</h2>
            <ul className="space-y-3">
              {['Báo cáo tổng kết.pdf', 'Bài báo khoa học.pdf', 'Phụ lục thống kê.xlsx'].map((doc, idx) => (
                <li key={idx}>
                  <button onClick={() => showToast(`Tải xuống: ${doc}`)} className="w-full group flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left">
                    <span className="text-sm text-slate-600 truncate mr-2">{doc}</span>
                    <span className="text-[10px] font-bold text-[#2563eb] border border-[#bfdbfe] px-1.5 py-0.5 rounded bg-[#eff6ff]">Tải xuống</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Biểu mẫu của tôi</h2>
            <button onClick={() => showToast('Đang tải Phiếu nhận xét...')} className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors text-center">Tải Phiếu nhận xét Phản biện</button>
            <p className="mt-3 text-[11px] text-slate-400 italic leading-snug">Ghi chú: Quý Thầy/Cô có thể tải mẫu để tham khảo trước khi nhập dữ liệu trực tiếp vào hệ thống.</p>
          </section>
        </aside>

        {/* Main Workspace (Area B) */}
        <article className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-800">Không gian làm việc Phản biện</h1>
            <span className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              Đã lưu bản nháp: 14:30 Hôm nay
            </span>
          </div>

          <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab('review')} className={`px-6 py-3 text-sm font-semibold -mb-[1px] ${activeTab === 'review' ? 'text-[#2563eb] border-b-2 border-[#2563eb]' : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'}`}>Phiếu đánh giá</button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 text-sm font-semibold -mb-[1px] ${activeTab === 'history' ? 'text-[#2563eb] border-b-2 border-[#2563eb]' : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'}`}>Lịch sử chỉnh sửa</button>
          </div>

          <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {activeTab === 'review' ? (
              <div className="p-6 space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Soạn nhận xét phản biện</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#2563eb] focus-within:border-transparent transition-all">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex gap-4">
                      <div className="flex gap-1">
                        <button type="button" className="px-2 py-1 text-xs font-bold hover:bg-white rounded border border-transparent hover:border-slate-200">B</button>
                        <button type="button" className="px-2 py-1 text-xs italic hover:bg-white rounded border border-transparent hover:border-slate-200">I</button>
                        <button type="button" className="px-2 py-1 text-xs underline hover:bg-white rounded border border-transparent hover:border-slate-200">U</button>
                      </div>
                    </div>
                    <textarea value={comments} onChange={(e) => setComments(e.target.value)} className="w-full min-h-[400px] p-4 text-sm leading-relaxed border-none focus:ring-0 resize-none" placeholder="Nhập nội dung nhận xét chi tiết về các khía cạnh: Tính cấp thiết, Mục tiêu, Phương pháp nghiên cứu, Kết quả dự kiến..."></textarea>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end p-6 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Chấm điểm chuyên môn</label>
                    <p className="text-xs text-slate-500 mb-4">Thang điểm từ 0 đến 100 theo quy định của Hội đồng.</p>
                    <input disabled={Boolean(submittedAt)} value={score} onChange={(e) => setScore(e.target.value)} type="number" min="0" max="100" step="0.1" placeholder="00.0" className="w-32 text-4xl font-bold text-[#2563eb] bg-white border-slate-200 rounded-lg p-4 focus:ring-[#2563eb] focus:border-[#2563eb]" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className="bg-[#2563eb] h-2.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-[11px] text-slate-500 text-right uppercase font-bold tracking-wider">Hoàn thành: 85% nội dung bắt buộc</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-slate-500">
                Chưa có lịch sử chỉnh sửa nào được lưu lại.
              </div>
            )}

            <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-end gap-4">
              <button onClick={() => showToast('Đã lưu nháp')} className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">Lưu nháp</button>
              <button
                disabled={Boolean(submittedAt)}
                onClick={async () => {
                  if (!councilId || !score) return;
                  await councilService.submitReview(councilId, Number(score), comments);
                  const t = new Date().toISOString();
                  setSubmittedAt(t);
                  showToast('Đã gửi phiếu điểm & nhận xét');
                }}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-[#2563eb] border border-[#1d4ed8] rounded-md hover:bg-[#1d4ed8] transition-colors shadow-md disabled:opacity-50"
              >Gửi phiếu điểm & Nhận xét</button>
              <button disabled={Boolean(submittedAt)} onClick={() => showToast('Bản cuối đã xác nhận')} className="px-8 py-2.5 text-sm font-semibold text-white bg-[#2563eb] border border-[#1d4ed8] rounded-md hover:bg-[#1d4ed8] transition-colors shadow-md ml-4 disabled:opacity-50">Xác nhận bản cuối</button>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};

export default ReviewerPage;
