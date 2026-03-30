import React from 'react';

const AcceptanceMinutesPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Biên bản Nghiệm thu</h1>
      <p className="text-slate-500 text-sm mt-1">Xem biên bản nghiệm thu và kết quả đánh giá từ Hội đồng</p>
    </div>
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Biên bản Nghiệm thu — QĐ/2023/156</h2>
          <p className="text-sm text-slate-500">Ngày họp: 15/11/2023 | Địa điểm: Phòng họp A — Tầng 3</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold uppercase">Chờ đánh giá</span>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[['Đề tài', 'Phân tích ứng dụng AI trong quản lý đô thị thông minh'], ['Chủ nhiệm', 'PGS.TS. Trần Văn B'], ['Hội đồng', 'QĐ/2023/156'], ['Kết quả dự kiến', 'Chờ họp nghiệm thu']].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">{k}</p>
            <p className="text-sm font-semibold text-slate-800">{v}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Thành phần Hội đồng</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Họ tên', 'Chức danh', 'Vai trò', 'Điểm'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              ['GS.TS. Hoàng Văn E', 'Đại học Quốc gia HN', 'Chủ tịch', '—'],
              ['PGS.TS. Lê Quang C', 'ĐH Bách Khoa', 'Phản biện 1', '—'],
              ['TS. Phạm Minh D', 'Viện CNTT', 'Ủy viên', '—'],
            ].map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
        <button className="px-5 py-2 text-sm font-semibold text-primary border border-primary rounded-xl hover:bg-blue-50">Tải xuống PDF</button>
      </div>
    </div>
  </div>
);

export default AcceptanceMinutesPage;
