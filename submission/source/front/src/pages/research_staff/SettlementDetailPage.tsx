import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { settlementService } from '../../services/api/settlementService';

interface BudgetItem {
  id: string;
  category: string;
  planned: number;
  spent: number;
  evidenceFile: string | null;
  status: 'khop' | 'vuot_muc' | 'chua_nop';
}

interface AuditEntry {
  id: string;
  content: string;
  timestamp: string;
  author: string;
}

const PREDEFINED_REASONS = [
  'Hóa đơn sai thông tin trường',
  'Thiếu bảng kê chi tiền mặt',
  'Chứng từ không khớp với dự toán',
  'Thiếu chữ ký xác nhận của trưởng đơn vị',
];

const statusConfig = {
  khop:     { label: 'Khớp',     cls: 'bg-green-50 text-green-700' },
  vuot_muc: { label: 'Vượt mức', cls: 'bg-red-50 text-red-700' },
  chua_nop: { label: 'Chưa nộp', cls: 'bg-orange-50 text-orange-700' },
};

const SettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [settlementCode, setSettlementCode] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [settlementStatus, setSettlementStatus] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    if (!id) return;
    setDataLoading(true);
    (settlementService as any).getById(id)
      .then((s: any) => {
        setSettlementCode(s.code ?? '');
        setProjectTitle(s.project?.title ?? '');
        setSettlementStatus(s.status ?? 'cho_bo_sung');
        const items: BudgetItem[] = (s.budgetItems ?? []).map((item: any) => {
          // Strip Windows/Unix full paths → show only filename
          const rawFile: string | null = item.evidenceFile ?? null;
          const cleanFile = rawFile ? rawFile.split(/[/\\]/).pop() ?? rawFile : null;
          return {
            id: item.id,
            category: item.category,
            planned: Number(item.planned ?? 0),
            spent: Number(item.spent ?? 0),
            evidenceFile: cleanFile,
            status: item.status ?? 'chua_nop',
          };
        });
        setBudget(items);
        const logs: AuditEntry[] = (s.auditLog ?? []).map((entry: any) => ({
          id: entry.id,
          content: entry.content,
          timestamp: entry.timestamp
            ? new Date(entry.timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
            : '',
          author: entry.author,
        }));
        setAuditLog(logs);
      })
      .catch((err: any) => {
        console.error(err);
        showToast('Không thể tải chi tiết hồ sơ quyết toán.', 'info');
      })
      .finally(() => setDataLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    try {
      await settlementService.updateStatus(id, 'hop_le' as any);
      setSettlementStatus('hop_le');
      const now = new Date();
      setAuditLog(prev => [...prev, {
        id: String(Date.now()),
        content: 'Hồ sơ quyết toán được xác nhận hợp lệ.',
        timestamp: now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
        author: 'Cán bộ NCKH',
      }]);
      showToast('Đã xác nhận hồ sơ quyết toán hợp lệ!');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Không thể xác nhận hồ sơ.';
      showToast(msg, 'info');
    } finally {
      setApproving(false);
    }
  };

  const handleFinalApprove = async () => {
    if (!id) return;
    setApproving(true);
    try {
      await settlementService.approve(id);
      setSettlementStatus('da_xac_nhan');
      const now = new Date();
      setAuditLog(prev => [...prev, {
        id: String(Date.now()),
        content: 'Quyết toán đã được phê duyệt chính thức và đề tài chuyển sang trạng thái thanh lý.',
        timestamp: now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
        author: 'Cán bộ NCKH',
      }]);
      showToast('Đã phê duyệt quyết toán thành công! Đề tài chuyển sang thanh lý.');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Không thể phê duyệt quyết toán.';
      showToast(msg, 'info');
    } finally {
      setApproving(false);
    }
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSendRequest = () => {
    if (selectedReasons.length === 0) return;
    const now = new Date();
    const timestamp = now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    const newEntry: AuditEntry = {
      id: String(Date.now()),
      content: `Đã gửi yêu cầu bổ sung: ${selectedReasons.join('; ')}.`,
      timestamp,
      author: 'Cán bộ NCKH',
    };
    setAuditLog(prev => [...prev, newEntry]);
    setShowModal(false);
    setSelectedReasons([]);
    showToast('Đã gửi yêu cầu bổ sung & cập nhật trạng thái "Chờ bổ sung"!');
  };

  const handleExport = (type: 'excel' | 'word') => {
    if (type === 'excel') {
      const headers = ['Hạng mục', 'Dự toán (VNĐ)', 'Đã chi (VNĐ)', 'Còn lại (VNĐ)', 'Minh chứng', 'Trạng thái'];
      const rows = budget.map(item => [
        item.category,
        item.planned.toString(),
        item.spent.toString(),
        (item.planned - item.spent).toString(),
        item.evidenceFile ?? '',
        statusConfig[item.status].label,
      ]);
      const totalsRow = ['TỔNG CỘNG', totalPlanned.toString(), totalSpent.toString(), totalRemaining.toString(), '', ''];
      const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const csv = [
        headers.map(escapeCell).join(','),
        ...rows.map(r => r.map(escapeCell).join(',')),
        totalsRow.map(escapeCell).join(','),
      ].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `BangKeChungTu_${settlementCode || id}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      showToast('Đã xuất Excel: Bảng kê chứng từ thanh toán.');
    } else {
      const budgetHtml = budget.map(item => `
        <tr>
          <td>${item.category}</td>
          <td style="text-align:right">${item.planned.toLocaleString('vi-VN')}</td>
          <td style="text-align:right">${item.spent.toLocaleString('vi-VN')}</td>
          <td style="text-align:right;color:${item.planned - item.spent < 0 ? 'red' : 'green'}">${(item.planned - item.spent).toLocaleString('vi-VN')}</td>
          <td>${item.evidenceFile ?? 'Chưa có'}</td>
          <td>${statusConfig[item.status].label}</td>
        </tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Giay de nghi thanh toan ${settlementCode}</title>
        <style>body{font-family:"Times New Roman",serif;margin:36px} h1{text-align:center;font-size:18px;text-transform:uppercase} table{width:100%;border-collapse:collapse;margin-top:16px} td,th{border:1px solid #333;padding:7px 10px;font-size:12px} th{background:#f0f0f0;font-weight:bold;text-align:left} tfoot td{font-weight:bold;background:#fafafa}</style>
        </head><body>
        <h1>Giấy Đề Nghị Thanh Toán</h1>
        <p><b>Mã quyết toán:</b> ${settlementCode}</p>
        <p><b>Đề tài:</b> ${projectTitle}</p>
        <table><thead><tr><th>Hạng mục</th><th>Dự toán (VNĐ)</th><th>Đã chi (VNĐ)</th><th>Còn lại (VNĐ)</th><th>Minh chứng</th><th>Trạng thái</th></tr></thead>
        <tbody>${budgetHtml}</tbody>
        <tfoot><tr><td>TỔNG CỘNG</td><td style="text-align:right">${totalPlanned.toLocaleString('vi-VN')}</td><td style="text-align:right">${totalSpent.toLocaleString('vi-VN')}</td><td style="text-align:right">${totalRemaining.toLocaleString('vi-VN')}</td><td colspan="2"></td></tr></tfoot>
        </table></body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `GiayDeNghiThanhToan_${settlementCode || id}.doc`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      showToast('Đã xuất Word: Giấy đề nghị thanh toán.');
    }
  };

  const handleSendReminder = (entry: AuditEntry) => {
    showToast(`Đã gửi Email nhắc nhở: "${entry.content.substring(0, 50)}..."`);
  };

  const handleDownloadEvidence = (filename: string) => {
    showToast(`Đang tải tệp minh chứng: ${filename}`, 'info');
  };

  const totalPlanned  = budget.reduce((s, b) => s + b.planned, 0);
  const totalSpent    = budget.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalPlanned - totalSpent;

  const statusDotCls =
    settlementStatus === 'da_xac_nhan' ? 'bg-emerald-500' :
    settlementStatus === 'hop_le' ? 'bg-blue-400' : 'bg-orange-400';
  const statusTextCls =
    settlementStatus === 'da_xac_nhan' ? 'text-emerald-700' :
    settlementStatus === 'hop_le' ? 'text-blue-600' : 'text-orange-600';
  const statusLabel =
    settlementStatus === 'da_xac_nhan' ? 'Đã phê duyệt' :
    settlementStatus === 'hop_le' ? 'Hợp lệ' : 'Chờ bổ sung';

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-24 right-4 z-[9999] px-6 py-4 rounded-xl shadow-lg text-sm font-bold text-white ${toastType === 'success' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          {toast}
        </div>
      )}

      {dataLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải dữ liệu hồ sơ...</div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/research-staff/settlement-tracking')}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-lg transition-colors"
              >
                ←
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{settlementCode || `QT-${id?.padStart(4, '0')}`}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDotCls}`} />
                  <span className={`text-xs font-bold ${statusTextCls}`}>{statusLabel}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">Chi tiết Hồ sơ Quyết toán</h1>
                <p className="text-slate-500 text-sm mt-0.5">Đề tài: {projectTitle || 'Đang tải...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleExport('excel')} className="px-4 py-2.5 text-xs font-bold border border-green-200 text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">Xuất Excel</button>
              <button onClick={() => handleExport('word')} className="px-4 py-2.5 text-xs font-bold border border-blue-200 text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">Xuất Word</button>
              {settlementStatus === 'da_xac_nhan' ? (
                <span className="px-4 py-2.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">✓ Đã phê duyệt quyết toán</span>
              ) : settlementStatus === 'hop_le' ? (
                <button
                  onClick={handleFinalApprove}
                  disabled={approving}
                  className="px-4 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {approving ? 'Đang xử lý...' : 'Phê duyệt quyết toán chính thức'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="px-4 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {approving ? 'Đang xác nhận...' : 'Xác nhận hợp lệ'}
                  </button>
                  <button onClick={() => setShowModal(true)} className="px-4 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition-colors">Yêu cầu bổ sung</button>
                </>
              )}
            </div>
          </div>

          {/* Approved banner */}
          {(settlementStatus === 'hop_le' || settlementStatus === 'da_xac_nhan') && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              settlementStatus === 'da_xac_nhan'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <svg className={`w-5 h-5 shrink-0 ${settlementStatus === 'da_xac_nhan' ? 'text-emerald-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <div>
                <p className={`text-sm font-bold ${settlementStatus === 'da_xac_nhan' ? 'text-emerald-800' : 'text-blue-700'}`}>
                  {settlementStatus === 'da_xac_nhan' ? 'Đã phê duyệt quyết toán chính thức' : 'Hồ sơ quyết toán hợp lệ — chờ phê duyệt chính thức'}
                </p>
                <p className={`text-xs mt-0.5 ${settlementStatus === 'da_xac_nhan' ? 'text-emerald-600' : 'text-blue-500'}`}>
                  {settlementStatus === 'da_xac_nhan' ? 'Đề tài đã hoàn tất quy trình quyết toán kinh phí nghiên cứu.' : 'Nhấn "Phê duyệt quyết toán chính thức" để hoàn tất quy trình.'}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT: Budget Table */}
            <div className="col-span-8">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Bảng phân rã kinh phí
                  </h2>
                  <span className="text-xs text-slate-400 font-semibold">Đơn vị: VNĐ</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Hạng mục', 'Dự toán (A)', 'Đã chi (B)', 'Còn lại (A−B)', 'Minh chứng', 'Trạng thái'].map(h => (
                          <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {budget.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400 italic">Chưa có dữ liệu phân rã kinh phí.</td></tr>
                      ) : budget.map(item => {
                        const rem = item.planned - item.spent;
                        const cfg = statusConfig[item.status];
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 text-sm font-semibold text-slate-800">{item.category}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{item.planned.toLocaleString('vi-VN')}</td>
                            <td className="px-4 py-4 text-sm font-bold text-slate-800">{item.spent.toLocaleString('vi-VN')}</td>
                            <td className={`px-4 py-4 text-sm font-bold ${rem < 0 ? 'text-red-600' : 'text-green-700'}`}>
                              {rem < 0 ? '−' : ''}{Math.abs(rem).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-4 py-4">
                              {item.evidenceFile ? (
                                <button onClick={() => handleDownloadEvidence(item.evidenceFile as string)} className="text-xs font-bold text-primary hover:underline">{item.evidenceFile}</button>
                              ) : (
                                <span className="text-xs text-slate-300 italic">Chưa có file</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="px-4 py-3 text-xs font-black text-slate-700 uppercase">Tổng cộng</td>
                        <td className="px-4 py-3 text-sm font-black text-slate-800">{totalPlanned.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-sm font-black text-slate-800">{totalSpent.toLocaleString('vi-VN')}</td>
                        <td className={`px-4 py-3 text-sm font-black ${totalRemaining < 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {totalRemaining < 0 ? '−' : ''}{Math.abs(totalRemaining).toLocaleString('vi-VN')}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => { handleExport('excel'); setTimeout(() => handleExport('word'), 800); }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                  >
                    Xuất toàn bộ bộ hồ sơ quyết toán (Excel + Word)
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Audit Trail */}
            <div className="col-span-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-orange-400 rounded-full" />
                    Lịch sử & Trao đổi
                  </h2>
                </div>
                <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed">{entry.content}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">{entry.timestamp}</p>
                          <p className="text-[10px] text-primary font-bold">{entry.author}</p>
                        </div>
                        <button
                          onClick={() => handleSendReminder(entry)}
                          className="text-[10px] font-black text-slate-400 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-2 py-1 rounded-lg transition-colors"
                        >
                          Nhắc nhở
                        </button>
                      </div>
                    </div>
                  ))}
                  {auditLog.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6 italic">Chưa có lịch sử trao đổi</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-[480px] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Yêu cầu bổ sung hồ sơ</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Chọn lý do và hệ thống sẽ gửi mail tự động</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50">✕</button>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Chọn lý do mẫu</p>
                  {PREDEFINED_REASONS.map(reason => (
                    <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedReasons.includes(reason)}
                        onChange={() => toggleReason(reason)}
                        className="w-4 h-4 rounded accent-red-600"
                      />
                      <span className="text-sm text-slate-700 font-medium">{reason}</span>
                    </label>
                  ))}
                  {selectedReasons.length > 0 && (
                    <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase mb-1">Nội dung sẽ gửi:</p>
                      <p className="text-xs text-red-700">{selectedReasons.join('; ')}</p>
                    </div>
                  )}
                </div>
                <div className="px-6 pb-6 flex gap-3 justify-end">
                  <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
                  <button
                    onClick={handleSendRequest}
                    disabled={selectedReasons.length === 0}
                    className="px-5 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Xác nhận & Gửi mail
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettlementDetailPage;
