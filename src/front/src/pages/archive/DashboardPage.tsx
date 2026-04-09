import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { archiveService } from '../../services/api/archiveService';

const ArchiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [archived, setArchived] = React.useState<Array<{ id: string; code: string; title: string; ownerName: string; field: string; status: string; files?: string[] }>>([]);
  React.useEffect(() => {
    archiveService.getAll().then((rows) => setArchived(rows)).catch(console.error);
  }, []);

  const totalFiles = archived.reduce((acc, item) => acc + (item.files?.length ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tổng quan Lưu trữ</h1>
        <p className="text-gray-600 text-sm mt-2">Quản lý kho dữ liệu nghiên cứu khoa học đã nghiệm thu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up-delay-1">
        {[
          ['Đề tài đã lưu trữ', archived.length.toString(), 'text-primary-700'],
          ['Tài liệu đã số hóa', totalFiles.toString(), 'text-info-700'],
          ['Mức sử dụng kho', `${Math.min(100, Math.round((archived.length / 200) * 100))}%`, 'text-gray-900'],
        ].map(([label, val, cls]) => (
          <div key={label} className="card motion-hover-lift">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{label}</p>
            <p className={`text-3xl font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden animate-fade-up-delay-2">
        <div className="px-6 py-4 border-b border-primary-100 bg-primary-50/60 flex justify-between items-center">
          <h2 className="text-sm font-bold text-primary-800 uppercase tracking-wider">Đề tài đã nghiệm thu (đã lưu trữ)</h2>
          <button
            onClick={() => navigate('/archive/repository')}
            className="text-xs font-bold text-primary-700 hover:text-primary-900 transition-colors"
          >Xem kho lưu trữ →</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Mã đề tài', 'Tên đề tài', 'Chủ nhiệm', 'Lĩnh vực', 'Trạng thái'].map(h => (
                <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-gray-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {archived.map(p => (
              <tr key={p.id} className="hover:bg-primary-50/40 transition-colors">
                <td className="px-6 py-4 font-bold text-primary-700">{p.code}</td>
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
