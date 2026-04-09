import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Settlement } from '../../types';
import { settlementService } from '../../services/api/settlementService';
import { reportService } from '../../services/api/reportService';

const statusConfig: Record<string, { label: string; cls: string }> = {
  cho_bo_sung: { label: 'Chờ bổ sung', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  hop_le:      { label: 'Hợp lệ',      cls: 'bg-green-50 text-green-700 border border-green-200' },
  da_xac_nhan: { label: 'Đã xác nhận', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  hoa_don_vat: { label: 'Hóa đơn VAT', cls: 'bg-red-50 text-red-700 border border-red-200' },
};

const SettlementTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState({ totalBudget: 0, disbursedBudget: 0, overdueProjects: 0, pendingSettlements: 0 });

  const refresh = async () => {
    const [settlementList, reportStats] = await Promise.all([
      settlementService.getAll(),
      reportService.getStats(),
    ]);
    setSettlements(settlementList);
    setSummaryStats({
      totalBudget: reportStats.totalBudget,
      disbursedBudget: reportStats.disbursedBudget,
      overdueProjects: reportStats.overdueProjects,
      pendingSettlements: settlementList.filter(s => s.status === 'cho_bo_sung' || s.status === 'hoa_don_vat').length,
    });
  };

  useEffect(() => {
    refresh().catch((e) => {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Không thể tải danh sách quyết toán.');
    });
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };

  const filtered = settlements.filter(s => {
    // Tab filter
    if (activeTab === 'pending' && s.status !== 'cho_bo_sung' && s.status !== 'hoa_don_vat') return false;
    if (activeTab === 'done' && s.status !== 'da_xac_nhan') return false;

    // Advanced filter: "sắp hết hạn" — mock: progress >= 80 and not done
    if (activeFilters.includes('sap_het_han') && s.status === 'da_xac_nhan') return false;
    if (activeFilters.includes('sap_het_han') && !(s.status === 'cho_bo_sung' || s.status === 'hoa_don_vat')) return false;

    // Advanced filter: "chứng từ bị từ chối" — only show hoa_don_vat or cho_bo_sung
    if (activeFilters.includes('bi_tu_choi') && s.status !== 'hoa_don_vat' && s.status !== 'cho_bo_sung') return false;

    return true;
  });

  const tabs = [['all', 'Tất cả hồ sơ'], ['pending', 'Chờ thẩm định'], ['done', 'Hoàn tất']];
  const footerStats = [
    { label: 'Tổng kinh phí quản lý', value: `${summaryStats.totalBudget.toLocaleString('vi-VN')} VNĐ`, cls: 'text-slate-900', border: '' },
    { label: 'Đã giải ngân', value: `${summaryStats.disbursedBudget.toLocaleString('vi-VN')} VNĐ`, cls: 'text-primary', border: 'border-l-4 border-l-primary' },
    { label: 'Hồ sơ trễ hạn', value: `${summaryStats.overdueProjects.toString().padStart(2, '0')} ĐỀ TÀI`, cls: 'text-orange-600', border: 'border-l-4 border-l-orange-500' },
    { label: 'Sai sót chứng từ', value: `${summaryStats.pendingSettlements.toString().padStart(2, '0')} VỤ VIỆC`, cls: 'text-red-600', border: 'border-l-4 border-l-red-500' },
  ];

  const advancedFilters = [
    { key: 'sap_het_han', label: 'Đề tài sắp hết hạn quyết toán', activeColor: 'border-orange-400 bg-orange-50 text-orange-700' },
    { key: 'bi_tu_choi', label: 'Đề tài có chứng từ bị từ chối', activeColor: 'border-red-400 bg-red-50 text-red-700' },
  ];

  const exportFilteredRows = () => {
    if (!filtered.length) {
      showToast('Không có dữ liệu để xuất.');
      return;
    }

    const headers = ['Mã hồ sơ', 'Noi dung', 'De tai', 'So tien', 'Trạng thái'];
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const body = filtered.map((s) => [
      s.code,
      s.content,
      s.projectTitle,
      String(s.amount),
      s.status,
    ]);
    const csv = [headers.map(escapeCell).join(','), ...body.map((row) => row.map(escapeCell).join(','))].join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement_tracking_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('Đã xuất Excel (CSV) cho danh sách hiện tại.');
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Theo dõi Quyết toán</h1>
        <p className="text-slate-500 mt-1">Theo dõi tiến độ, thẩm định chứng từ và yêu cầu bổ sung hồ sơ.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-100">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === key ? 'text-primary border-primary' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Filter panel */}
        <div className="col-span-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card space-y-5">
            <h4 className="text-base font-bold flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full" /> Bộ lọc hồ sơ
            </h4>

            {/* Advanced filters */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lọc nâng cao</p>
              <div className="space-y-2">
                {advancedFilters.map(f => {
                  const isActive = activeFilters.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggleFilter(f.key)}
                      className={`w-full p-3.5 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${isActive ? f.activeColor : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-600'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-current border-current' : 'border-slate-300'}`}>
                        {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-xs font-bold">{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status filters */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Trạng thái minh chứng</p>
              <div className="space-y-2">
                {['Thiếu mẫu đề nghị tạm ứng', 'Bảng kê chi tiền mặt sai'].map(item => (
                  <div key={item} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div className="w-4 h-4 rounded border border-slate-300 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-red-500 border border-slate-100 rounded-xl transition-colors"
              >
                ✕ Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="col-span-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className="text-base font-bold">Danh sách hồ sơ cần xử lý</h4>
                {filtered.length !== settlements.length && (
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {filtered.length} / {settlements.length}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportFilteredRows}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 rounded-lg hover:text-green-600 hover:bg-green-50 transition-colors"
                >
                  Xuất Excel
                </button>
              </div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Mã hồ sơ', 'Nội dung', 'Số tiền (VNĐ)', 'Tiến độ', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                      Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                ) : filtered.map(s => {
                  const cfg = statusConfig[s.status] ?? { label: s.status, cls: 'bg-slate-50 text-slate-600' };
                  const progress = s.status === 'da_xac_nhan' ? 100 : s.status === 'hop_le' ? 70 : s.status === 'cho_bo_sung' ? 40 : 20;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-primary">{s.code}</td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-800 max-w-[140px]">
                        <p className="truncate">{s.content}</p>
                        <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">{s.projectTitle}</p>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">
                        {s.amount.toLocaleString('vi-VN')}
                      </td>
                      {/* Progress bar column */}
                      <td className="px-4 py-4">
                        <div className="space-y-1 min-w-[80px]">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500">Giải ngân</span>
                            <span className={`text-[10px] font-black ${progress >= 80 ? 'text-green-600' : progress >= 40 ? 'text-primary' : 'text-orange-500'}`}>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-green-500' : progress >= 40 ? 'bg-primary' : 'bg-orange-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      {/* Smart status badge */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {(s.status === 'cho_bo_sung' || s.status === 'hoa_don_vat') ? (
                            <button
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  await settlementService.requestSupplement(s.id, ['Thiếu chứng từ']);
                                  await refresh();
                                  showToast(`Đã gửi yêu cầu bổ sung cho hồ sơ ${s.code}`);
                                } catch (e) {
                                  console.error(e);
                                  showToast(typeof e === 'string' ? e : `Gửi yêu cầu bổ sung thất bại: ${s.code}`);
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-colors"
                            >
                              Yêu cầu bổ sung
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  await settlementService.updateStatus(s.id, 'da_xac_nhan');
                                  await refresh();
                                  showToast(`Đã xác nhận hồ sơ ${s.code}!`);
                                } catch (e) {
                                  console.error(e);
                                  showToast(typeof e === 'string' ? e : `Xác nhận hồ sơ thất bại: ${s.code}`);
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase hover:bg-primary-dark transition-colors"
                            >
                              Xác nhận
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/research-staff/settlement/${s.id}`)}
                            className="text-[10px] font-black text-slate-400 hover:text-primary uppercase transition-colors"
                          >
                            Chi tiết →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-4 gap-6">
        {footerStats.map((s) => (
          <div key={s.label} className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-card ${s.border}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{s.label}</p>
            <p className={`text-xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {loading && <p className="text-xs text-slate-400">Đang đồng bộ dữ liệu...</p>}
    </div>
  );
};

export default SettlementTrackingPage;
