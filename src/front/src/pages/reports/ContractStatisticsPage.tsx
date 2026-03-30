import React from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { mockContracts } from '../../mock/mockData';

const ContractStatisticsPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Thống kê Hợp đồng</h1>
      <p className="text-gray-500 text-sm mt-1">Tổng hợp trạng thái hợp đồng nghiên cứu khoa học</p>
    </div>
    <div className="grid grid-cols-4 gap-5">
      {[
        ['Tổng hợp đồng', mockContracts.length, 'text-gray-900'],
        ['Đã ký', mockContracts.filter(c => c.status === 'da_ky').length, 'text-emerald-600'],
        ['Chờ duyệt', mockContracts.filter(c => c.status === 'cho_duyet').length, 'text-amber-600'],
        ['Hoàn thành', mockContracts.filter(c => c.status === 'hoan_thanh').length, 'text-primary'],
      ].map(([label, val, cls]) => (
        <div key={label as string} className="bg-white p-5 rounded-xl border border-gray-100 shadow-card">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
          <p className={`text-3xl font-black ${cls}`}>{val}</p>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800">Chi tiết hợp đồng</h2></div>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
          <tr>{['Mã HĐ', 'Đề tài', 'Chủ nhiệm', 'Kinh phí', 'Ngày ký', 'Trạng thái'].map(h => <th key={h} className="px-6 py-4">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {mockContracts.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-bold text-primary">{c.code}</td>
              <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">{c.projectTitle}</td>
              <td className="px-6 py-4 text-gray-500">{c.owner}</td>
              <td className="px-6 py-4 text-gray-600">{(c.budget / 1000000).toFixed(0)}tr VNĐ</td>
              <td className="px-6 py-4 text-gray-500">{c.signedDate || '—'}</td>
              <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ContractStatisticsPage;
