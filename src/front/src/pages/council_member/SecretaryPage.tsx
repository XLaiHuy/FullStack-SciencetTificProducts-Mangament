import React, { useState } from 'react';
import { councilService } from '../../services/api/councilService';

const SecretaryPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [councilId, setCouncilId] = useState('');
  const [scoreRows, setScoreRows] = useState<Array<{ name: string; role: string; score?: number }>>([]);
  
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  React.useEffect(() => {
    councilService.getAll().then(async (list) => {
      if (list.length === 0) return;
      setCouncilId(list[0].id);
      const summary = await councilService.getScoreSummary(list[0].id);
      const reviews = summary?.items ?? [];
      setScoreRows(reviews.map((r: any) => ({
        name: r.memberName ?? 'Thành viên',
        role: r.role ?? 'Thành viên',
        score: typeof r.score === 'number' ? r.score : undefined,
      })));
    }).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Thông tin Đề tài</h2>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-400">Mã đề tài</p><p className="text-sm font-semibold">DT-2024-012</p></div>
              <div><p className="text-xs text-gray-400">Tên đề tài</p><p className="text-sm font-medium leading-relaxed">Nghiên cứu giải pháp bảo tồn đa dạng sinh học trong bối cảnh biến đổi khí hậu tại khu vực miền Trung</p></div>
              <div><p className="text-xs text-gray-400">Chủ nhiệm</p><p className="text-sm font-semibold">GS.TS. Nguyễn Văn A</p></div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Kho Tài liệu</h2>
            <ul className="space-y-2">
              {['Báo cáo tổng kết.pdf', 'Bài báo khoa học.pdf', 'Sản phẩm phần mềm.zip'].map((doc, idx) => (
                <li key={idx}>
                  <button onClick={() => showToast(`Đang tải/xem: ${doc}`)} className="flex items-center text-sm text-blue-600 hover:underline py-1">{doc}</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Biểu mẫu của tôi</h2>
            <button onClick={() => showToast('Tải Phiếu tổng hợp điểm...')} className="w-full bg-[#EFF6FF] text-[#1E40AF] border border-blue-200 font-medium py-3 px-4 rounded-md text-sm hover:bg-blue-100 transition-colors">
              Tải Phiếu tổng hợp điểm & Biên bản
            </button>
          </section>
        </aside>

        <div className="lg:col-span-8 space-y-6">
          <header className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Bảng điều khiển Thư ký Hội đồng</h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý phiên họp nghiệm thu và tổng hợp dữ liệu đánh giá.</p>
          </header>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Bảng Tổng hợp Real-time</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Đang cập nhật</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Thành viên</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Vai trò</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-center">Điểm số</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-right">Thao tác dữ liệu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(scoreRows.length ? scoreRows : [{ name: 'Chưa có dữ liệu', role: '-', score: undefined }]).map((row, idx) => (
                  <tr key={`${row.name}-${idx}`}>
                    <td className="px-6 py-4 text-sm font-medium">{row.name}</td><td className="px-6 py-4 text-sm text-gray-600">{row.role}</td><td className="px-6 py-4 text-sm font-bold text-center">{row.score ?? '...'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => showToast('Xác nhận điểm Chủ tịch')} className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">Xác nhận hợp lệ</button>
                      <button onClick={() => showToast('Yêu cầu Chủ tịch nhập lại')} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">Yêu cầu nhập lại</button>
                    </td>
                  </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4 text-sm font-bold text-[#1E40AF]" colSpan={2}>Điểm trung bình cộng</td>
                    <td className="px-6 py-4 text-lg font-bold text-[#1E40AF] text-center">{scoreRows.length ? (scoreRows.filter(r => typeof r.score === 'number').reduce((a, r) => a + (r.score as number), 0) / Math.max(scoreRows.filter(r => typeof r.score === 'number').length, 1)).toFixed(1) : '0.0'}</td>
                    <td className="px-6 py-4 text-sm italic text-[#1E40AF] text-right">Tự động tính toán</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Ghi chú kết luận & Yêu cầu chỉnh sửa</h3>
            <textarea className="w-full border-gray-300 rounded-lg focus:ring-[#1E40AF] focus:border-[#1E40AF] text-sm p-4 h-48" placeholder="Nhập các nội dung thảo luận và yêu cầu từ hội đồng tại đây..."></textarea>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-800 mb-2">Quản lý sau nghiệm thu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => showToast('Mở dialog tải lên biên bản...')} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-[#1E40AF] cursor-pointer transition-colors bg-gray-50">
                <div className="mb-3 text-gray-400 text-3xl font-bold">+</div>
                <p className="text-sm font-medium text-gray-700">Tải lên Biên bản nghiệm thu chính thức</p>
                <p className="text-xs text-gray-400 mt-1">Định dạng hỗ trợ: PDF (Max 10MB)</p>
              </button>
              
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Cấp quyền xem biên bản cho Chủ nhiệm</span>
                  <button 
                    type="button" 
                    onClick={() => setPermissionGranted(!permissionGranted)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2 ${permissionGranted ? 'bg-[#1E40AF]' : 'bg-gray-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${permissionGranted ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>
                <button onClick={async () => {
                  if (!councilId) return;
                  await councilService.approveRevision(councilId);
                  showToast('Đã xác nhận hoàn thành chỉnh sửa');
                }} className="w-full bg-[#1E40AF] text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                  Xác nhận hoàn thành chỉnh sửa
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SecretaryPage;
