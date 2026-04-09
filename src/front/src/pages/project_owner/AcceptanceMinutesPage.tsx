import React, { useEffect, useMemo, useState } from 'react';
import { councilService } from '../../services/api/councilService';
import type { Council } from '../../types';

const AcceptanceMinutesPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [council, setCouncil] = useState<Council | null>(null);
  const [downloading, setDownloading] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const loadCouncil = async () => {
      try {
        const list = await councilService.getAll();
        if (!list.length) return;
        const detail = await councilService.getById(list[0].id);
        if (detail) setCouncil(detail);
      } catch (err) {
        console.error(err);
        showToast('Không thể tải dữ liệu biên bản nghiệm thu.');
      }
    };
    loadCouncil();
  }, []);

  const statusLabel = useMemo(() => {
    if (!council) return 'Không có dữ liệu';
    if (council.status === 'cho_danh_gia') return 'Chờ đánh giá';
    if (council.status === 'dang_danh_gia') return 'Đang đánh giá';
    return 'Đã hoàn thành';
  }, [council]);

  const handleDownloadPdf = async () => {
    if (!council) {
      showToast('Chưa có hội đồng để tải biên bản.');
      return;
    }

    setDownloading(true);
    try {
      const fallbackName = `BienBanNghiemThu_${council.decisionCode.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
      await councilService.downloadMinutes(council.id, fallbackName);
      showToast('Đã tải biên bản nghiệm thu từ hệ thống.');
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : 'Không thể tải biên bản nghiệm thu.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Biên bản Nghiệm thu</h1>
        <p className="text-slate-500 text-sm mt-1">Xem biên bản nghiệm thu và kết quả đánh giá từ Hội đồng</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <div id="acceptance-printable">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Biên bản Nghiệm thu — {council?.decisionCode ?? 'N/A'}</h2>
              <p className="text-sm text-slate-500">Ngày họp: {council?.createdDate ?? 'N/A'} | Địa điểm: Phòng họp A — Tầng 3</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold uppercase">{statusLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            {[
              ['Đề tài', council?.projectTitle ?? 'N/A'],
              ['Chủ nhiệm', council?.members?.find((m) => m.role === 'chu_tich')?.name ?? 'N/A'],
              ['Hội đồng', council?.decisionCode ?? 'N/A'],
              ['Kết quả dự kiến', statusLabel],
            ].map(([k, v]) => (
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
                {(council?.members?.length ? council.members : [
                  { name: 'Chưa có dữ liệu', institution: '-', role: 'uy_vien' as const },
                ]).map((member, i) => {
                  const roleLabel = member.role === 'chu_tich'
                    ? 'Chủ tịch'
                    : member.role === 'thu_ky'
                      ? 'Thư ký'
                      : member.role === 'phan_bien_1'
                        ? 'Phản biện 1'
                        : member.role === 'phan_bien_2'
                          ? 'Phản biện 2'
                          : 'Ủy viên';

                  const row = [member.name, member.institution || '-', roleLabel, '—'];
                  return (
                  <tr key={i} className="hover:bg-slate-50">
                    {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || !council}
            className="px-5 py-2 text-sm font-semibold text-primary border border-primary rounded-xl hover:bg-blue-50"
          >
            {downloading ? 'Đang tải...' : 'Tải xuống PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptanceMinutesPage;
