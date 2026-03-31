import React, { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { archiveService } from '../../services/api/archiveService';

const RepositoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [field, setField] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; code: string; title: string; ownerName: string; field: string; status: string; files: string[] }>>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  React.useEffect(() => {
    archiveService.getAll().then(setAllProjects).catch(console.error);
  }, []);
  const fields = [...new Set(allProjects.map(p => p.field))];

  const filtered = allProjects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchField = !field || p.field === field;
    return matchSearch && matchField;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Kho lưu trữ Nghiên cứu</h1>
        <p className="text-gray-500 text-sm mt-1">Tìm kiếm và tra cứu kết quả nghiên cứu khoa học</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-card">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
              placeholder="Tìm kiếm theo tên đề tài, chủ nhiệm, mã số..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <select
            value={field}
            onChange={e => setField(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary text-gray-600"
          >
            <option value="">Tất cả lĩnh vực</option>
            {fields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary text-gray-600">
            <option>Tất cả năm học</option>
            <option>2023-2024</option>
            <option>2022-2023</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Tìm thấy <span className="font-bold text-gray-900">{filtered.length}</span> đề tài</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-xs font-bold border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Sắp xếp: Mới nhất</button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-card p-6 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{p.code}</span>
              <StatusBadge status={p.status} />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">{p.title}</h3>
            <div className="space-y-1.5 mt-3">
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Chủ nhiệm:</span> {p.ownerName}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Lĩnh vực:</span> {p.field}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Tình trạng:</span> {p.status}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
              <button className="text-xs font-bold text-primary hover:underline">Xem chi tiết</button>
              <button
                onClick={async () => {
                  if (!p.files || p.files.length === 0) {
                    showToast(`De tai ${p.code} chua co tep luu tru de tai.`, 'error');
                    return;
                  }
                  try {
                    await archiveService.download(p.id);
                    showToast(`Da tai tai lieu cua de tai ${p.code}.`, 'success');
                  } catch (e) {
                    showToast(typeof e === 'string' ? e : `Khong the tai tai lieu cua de tai ${p.code}.`, 'error');
                  }
                }}
                className={`text-xs font-bold transition-colors ${p.files && p.files.length > 0 ? 'text-gray-400 hover:text-primary' : 'text-gray-300 cursor-not-allowed'}`}
              >Tải tài liệu</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RepositoryPage;
