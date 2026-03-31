import React from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { accountingService } from '../../services/api/accountingService';
import { settlementService } from '../../services/api/settlementService';

const DocumentListPage: React.FC = () => {
  const [rows, setRows] = React.useState<Array<{ id: string; code: string; title: string; ownerName: string; totalAmount: number; status: string }>>([]);
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadRows = async () => {
    const data = await accountingService.getDocuments();
    setRows(data.map((d) => ({
      id: d.id,
      code: d.project?.code ?? d.code,
      title: d.project?.title ?? d.content,
      ownerName: d.project?.owner?.name ?? '-',
      totalAmount: Number(d.totalAmount ?? 0),
      status: d.status,
    })));
  };

  React.useEffect(() => {
    loadRows().catch((e) => {
      showToast(typeof e === 'string' ? e : 'Khong the tai danh sach ho so.', 'error');
    });
  }, []);

  const exportRowsToCsv = () => {
    if (!rows.length) {
      showToast('Khong co du lieu de xuat.', 'error');
      return;
    }

    const headers = ['Ma ho so', 'Ten de tai', 'Chu nhiem', 'Tong tien', 'Trang thai'];
    const data = rows.map((r) => [
      r.code,
      r.title,
      r.ownerName,
      String(r.totalAmount),
      r.status,
    ]);

    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCell).join(','), ...data.map((row) => row.map(escapeCell).join(','))].join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting_documents_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Da xuat file Excel (CSV).', 'success');
  };

  return (
  <div className="space-y-6">
    {toast && (
      <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
        {toast.message}
      </div>
    )}
    <div><h1 className="text-2xl font-bold text-gray-800">Danh sách hồ sơ</h1><p className="text-gray-500 text-sm mt-1">Toàn bộ hồ sơ tài chính cần xử lý</p></div>
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-800">Hồ sơ tài chính</h2>
        <button onClick={exportRowsToCsv} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl">Xuất Excel</button>
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
              <td className="px-6 py-4 font-medium">{c.totalAmount.toLocaleString('vi-VN')} VNĐ</td>
              <td className="px-6 py-4"><StatusBadge status={c.status as any} /></td>
              <td className="px-6 py-4">
                <button
                  onClick={async () => {
                    try {
                      const result = await settlementService.exportFile(c.id, 'excel');
                      showToast(`Da tao lien ket xuat file: ${result.url}`, 'success');
                    } catch (e) {
                      showToast(typeof e === 'string' ? e : 'Khong the xuat file ho so.', 'error');
                    }
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Tải
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default DocumentListPage;
