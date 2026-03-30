import React from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { archiveService } from '../../services/api/archiveService';

const DocumentListPage: React.FC = () => {
  const [rows, setRows] = React.useState<Array<{ id: string; code: string; title: string; ownerName: string; status: string }>>([]);
  React.useEffect(() => {
    archiveService.getAll().then((data) => setRows(data)).catch(console.error);
  }, []);

  return (
  <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-800">Danh sách hồ sơ</h1><p className="text-gray-500 text-sm mt-1">Toàn bộ hồ sơ tài chính cần xử lý</p></div>
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-800">Hồ sơ tài chính</h2>
        <button className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl">Xuất Excel</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
          <tr>
            {['Mã HĐ', 'Tên đề tài', 'Chủ nhiệm', 'Kinh phí', 'Trạng thái', 'Thao tác'].map(h => (
              <th key={h} className="px-6 py-4 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-bold text-primary">{c.code}</td>
              <td className="px-6 py-4 font-medium text-gray-800 max-w-[200px] truncate">{c.title}</td>
              <td className="px-6 py-4 text-gray-600">{c.ownerName}</td>
              <td className="px-6 py-4 font-medium">-</td>
              <td className="px-6 py-4"><StatusBadge status={c.status as any} /></td>
              <td className="px-6 py-4"><button onClick={async () => archiveService.download(c.id)} className="text-xs font-bold text-primary hover:underline">Tải</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default DocumentListPage;
