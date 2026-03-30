import React from 'react';

const ContractViewPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Xem Hợp đồng</h1>
      <p className="text-slate-500 text-sm mt-1">Hợp đồng nghiên cứu khoa học của bạn</p>
    </div>
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">HĐ/2024/001</h2>
          <p className="text-sm text-slate-500">Ký ngày: 20/01/2024</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase">Đã ký</span>
      </div>
      <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
        <div className="bg-white border border-gray-200 p-10 min-h-96 text-[11px] leading-relaxed shadow-sm max-w-2xl mx-auto">
          <div className="text-center mb-6 font-bold space-y-1">
            <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="border-b border-gray-900 w-32 mx-auto pb-1">Độc lập - Tự do - Hạnh phúc</p>
          </div>
          <div className="text-center mb-6 space-y-1">
            <p className="font-bold text-xs uppercase">HỢP ĐỒNG NGHIÊN CỨU KHOA HỌC</p>
            <p className="italic text-gray-500">Số: HĐ/2024/001</p>
          </div>
          <div className="space-y-4">
            <div><p className="font-bold uppercase mb-1">BÊN A: Trường Đại học Mở TP. Hồ Chí Minh</p></div>
            <div>
              <p className="font-bold uppercase mb-1">BÊN B: PGS.TS. Trần Văn B</p>
              <p><span className="inline-block w-24">Tên đề tài:</span> <span className="font-bold text-primary">Phân tích ứng dụng AI trong quản lý đô thị thông minh</span></p>
              <p><span className="inline-block w-24">Kinh phí:</span> <span className="font-bold">500.000.000 VNĐ</span></p>
            </div>
            <div className="pt-4 border-t border-gray-100 text-gray-500 italic">[Nội dung điều khoản pháp lý...]</div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="px-5 py-2 text-sm font-semibold text-primary bg-white border border-primary rounded-lg hover:bg-blue-50">Tải xuống PDF</button>
      </div>
    </div>
  </div>
);

export default ContractViewPage;
