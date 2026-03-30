import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { archiveService } from '../../services/api/archiveService';

const ArchiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [archived, setArchived] = React.useState<Array<{ id: string; code: string; title: string; ownerName: string; field: string; status: string }>>([]);
  React.useEffect(() => {
    archiveService.getAll().then((rows) => setArchived(rows)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan Lưu trữ</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý kho dữ liệu nghiên cứu khoa học đã nghiệm thu</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          ['Đề tài đã lưu trữ', archived.length.toString(), 'text-primary'],
          ['Tài liệu đã số hóa', '1,024', 'text-emerald-600'],
          ['Dung lượng sử dụng', '45.2 GB / 100 GB', 'text-gray-800'],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-card">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
            <p className={`text-2xl font-black ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Đề tài đã nghiệm thu (đã lưu trữ)</h2>
          <button
            onClick={() => navigate('/archive/repository')}
            className="text-xs font-bold text-primary hover:underline"
          >Xem kho lưu trữ →</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Mã đề tài', 'Tên đề tài', 'Chủ nhiệm', 'Lĩnh vực', 'Trạng thái'].map(h => (
                <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {archived.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-primary">{p.code}</td>
                <td className="px-6 py-4 font-medium text-gray-800 max-w-xs truncate">{p.title}</td>
                <td className="px-6 py-4 text-gray-600">{p.ownerName}</td>
                <td className="px-6 py-4 text-gray-500">{p.field}</td>
                <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {archived.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">Chưa có đề tài nào lưu trữ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchiveDashboard;
