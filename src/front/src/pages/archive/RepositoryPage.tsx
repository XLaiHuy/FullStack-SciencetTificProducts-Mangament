import React, { useDeferredValue, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { archiveService } from '../../services/api/archiveService';

const PAGE_SIZE = 10;

const RepositoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [field, setField] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'asc'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; code: string; title: string; ownerName: string; field: string; status: string; files: string[] }>>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  React.useEffect(() => {
    archiveService.getAll().then(setAllProjects).catch(console.error);
  }, []);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const fields = useMemo(
    () => [...new Set(allProjects.map((p) => p.field))],
    [allProjects],
  );

  const years = useMemo(
    () => [...new Set(allProjects
      .map((p) => (p.code.match(/20\d{2}/)?.[0] ?? ''))
      .filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
    [allProjects],
  );

  const filtered = useMemo(() => allProjects.filter((p) => {
    const matchSearch = !normalizedSearch
      || p.title.toLowerCase().includes(normalizedSearch)
      || p.code.toLowerCase().includes(normalizedSearch)
      || p.ownerName.toLowerCase().includes(normalizedSearch);
    const matchField = !field || p.field === field;
    const matchStatus = !statusFilter || p.status === statusFilter;
    const extractedYear = p.code.match(/20\d{2}/)?.[0] ?? '';
    const matchYear = !yearFilter || extractedYear === yearFilter;
    return matchSearch && matchField && matchStatus && matchYear;
  }), [allProjects, normalizedSearch, field, statusFilter, yearFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.code.localeCompare(b.code);
    }
    return b.code.localeCompare(a.code);
  }), [filtered, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedSorted = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, field, statusFilter, yearFilter, sortOrder]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold animate-fade-up ${toast.type === 'error' ? 'bg-error-500' : 'bg-success-500'}`}>
          {toast.message}
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kho lưu trữ Nghiên cứu</h1>
        <p className="text-gray-600 text-sm mt-2">Tìm kiếm và tra cứu kết quả nghiên cứu khoa học</p>
      </div>

      {/* Search Bar */}
      <div className="card animate-fade-up-delay-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
              placeholder="Tìm kiếm theo tên đề tài, chủ nhiệm, mã số..."
              className="form-input pl-10"
            />
          </div>
          <select
            value={field}
            onChange={e => setField(e.target.value)}
            className="form-input"
          >
            <option value="">Tất cả lĩnh vực</option>
            {fields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input">
            <option value="">Tất cả trạng thái</option>
            {[...new Set(allProjects.map((p) => p.status))].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="form-input">
            <option value="">Tất cả năm học</option>
            {years.map((year) => <option key={year} value={year}>{year}-{Number(year) + 1}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Tìm thấy <span className="font-bold text-gray-900">{sorted.length}</span> đề tài
          {sorted.length > 0 && (
            <span className="ml-2 text-gray-400">(Trang {safePage}/{totalPages})</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder((prev) => (prev === 'latest' ? 'asc' : 'latest'))}
            className="btn-secondary text-xs"
          >
            {sortOrder === 'latest' ? 'Sắp xếp: Mới nhất' : 'Sắp xếp: Mã tăng dần'}
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up-delay-2">
        {pagedSorted.map(p => (
          <div key={p.id} className="card card-interactive motion-hover-lift">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{p.code}</span>
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
              <button
                onClick={() => showToast(`Chi tiet de tai ${p.code}: ${p.title}`, 'success')}
                className="text-xs font-bold text-primary-700 hover:text-primary-900 transition-colors"
              >
                Xem chi tiết
              </button>
              <button
                onClick={async () => {
                  if (!p.files || p.files.length === 0) {
                    showToast(`Đề tài ${p.code} chưa có tệp lưu trữ đề tài.`, 'error');
                    return;
                  }
                  try {
                    await archiveService.download(p.id);
                    showToast(`Đã tải tài liệu của đề tài ${p.code}.`, 'success');
                  } catch (e) {
                    showToast(typeof e === 'string' ? e : `Không thể tải tài liệu của đề tài ${p.code}.`, 'error');
                  }
                }}
                className={`text-xs font-bold transition-colors ${p.files && p.files.length > 0 ? 'text-gray-500 hover:text-primary-700' : 'text-gray-300 cursor-not-allowed'}`}
              >Tải tài liệu</button>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="md:col-span-2 card text-center py-10">
            <p className="text-sm text-gray-600 font-semibold">Không có kết quả phù hợp bộ lọc hiện tại.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setField('');
                setStatusFilter('');
                setYearFilter('');
              }}
              className="btn-secondary text-xs mt-4"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Trang trước
          </button>
          <span className="text-xs font-semibold text-gray-600 px-3">{safePage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
};

export default RepositoryPage;
