import React, { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { accountingService } from '../../services/api/accountingService';
import { settlementService } from '../../services/api/settlementService';

const DocumentManagementPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [rows, setRows] = React.useState<Array<{ id: string; code: string; title: string; totalAmount: number; status: string }>>([]);
  const [viewRows, setViewRows] = React.useState<Array<{ id: string; code: string; title: string; totalAmount: number; status: string }>>([]);
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [schoolYearFilter, setSchoolYearFilter] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const pageSize = 10;

  const loadRows = async () => {
    const data = await accountingService.getDocuments();
    const mapped = data.map((d) => ({
      id: d.id,
      code: d.project?.code ?? d.code,
      title: d.project?.title ?? d.content,
      totalAmount: Number(d.totalAmount ?? 0),
      status: d.status,
    }));
    setRows(mapped);
    setViewRows(mapped);
  };

  React.useEffect(() => {
    loadRows().catch((e) => {
      showToast(typeof e === 'string' ? e : 'Không thể tải danh sách hồ sơ.');
    });
  }, []);

  const applyFilters = () => {
    const keyword = searchKeyword.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (keyword && !(`${r.code} ${r.title}`.toLowerCase().includes(keyword))) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (schoolYearFilter) {
        const yearTag = schoolYearFilter.slice(0, 4);
        if (!r.code.includes(yearTag)) return false;
      }
      return true;
    });
    setViewRows(filtered);
    setCurrentPage(1);
    showToast(`Đã áp dụng bộ lọc: ${filtered.length}/${rows.length} hồ sơ.`);
  };

  const totalPages = Math.max(1, Math.ceil(viewRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = viewRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIndex = viewRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const endIndex = viewRows.length ? (safePage - 1) * pageSize + pagedRows.length : 0;

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const exportCurrentView = () => {
    if (!viewRows.length) {
      showToast('Không có dữ liệu để xuất.');
      return;
    }

    const headers = ['Mã hồ sơ', 'Nội dung', 'Số tiền', 'Trạng thái'];
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const body = viewRows.map((r) => [r.code, r.title, String(r.totalAmount), r.status]);
    const csv = [headers.map(escapeCell).join(','), ...body.map((row) => row.map(escapeCell).join(','))].join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting_management_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('Đã xuất Excel (CSV) cho danh sách hiện tại.');
  };

  const printSummary = () => {
    const totalAmount = viewRows.reduce((sum, item) => sum + item.totalAmount, 0);
    showToast(`Đã tạo báo cáo tóm tắt: ${viewRows.length} hồ sơ, tổng ${totalAmount.toLocaleString('vi-VN')} VNĐ.`);
    window.print();
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Hồ sơ</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý và theo dõi toàn bộ hồ sơ tài chính nghiên cứu</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex items-center justify-between gap-4">
        <div className="flex gap-3 flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hồ sơ, tên đề tài..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary text-gray-600">
            <option value="">Tất cả trạng thái</option>
            <option value="cho_bo_sung">Chờ bổ sung</option>
            <option value="hop_le">Hợp lệ</option>
            <option value="da_xac_nhan">Đã xác nhận</option>
            <option value="hoa_don_vat">Hóa đơn VAT</option>
          </select>
          <select value={schoolYearFilter} onChange={(e) => setSchoolYearFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary text-gray-600">
            <option value="">Tất cả năm học</option>
            <option value="2023-2024">2023-2024</option>
            <option value="2022-2023">2022-2023</option>
          </select>
        </div>
        <button onClick={applyFilters} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark">
          Tìm kiếm
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Danh sách hồ sơ tài chính</h2>
          <div className="flex gap-2">
            <button onClick={exportCurrentView} className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors">
              Xuất Excel
            </button>
            <button onClick={printSummary} className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors">
              In báo cáo
            </button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Mã hồ sơ', 'Nội dung', 'Số tiền', 'Trạng thái', 'Thao tác'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedRows.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-primary">{s.code}</td>
                <td className="px-6 py-4 font-medium text-gray-700 max-w-xs truncate">{s.title}</td>
                <td className="px-6 py-4 font-semibold text-gray-800">{s.totalAmount.toLocaleString('vi-VN')} VNĐ</td>
                <td className="px-6 py-4"><StatusBadge status={s.status as any} /></td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => showToast(`Ho so ${s.code}: ${s.title} | ${s.totalAmount.toLocaleString('vi-VN')} VNĐ`)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const result = await settlementService.exportFile(s.id, 'excel');
                          showToast(`Đã tạo liên kết xuất file cho ${s.code}: ${result.url}`);
                        } catch (e) {
                          showToast(typeof e === 'string' ? e : `Không thể tải tài liệu ${s.code}`);
                        }
                      }}
                      className="text-[11px] font-bold text-gray-400 hover:text-primary transition-colors"
                    >
                      Tải tài liệu
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Hiển thị {startIndex}-{endIndex} / {rows.length} hồ sơ</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Trước
            </button>
            <span className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">{safePage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagementPage;
