import React, { useEffect, useRef, useState } from 'react';
import { projectService } from '../../services/api/projectService';
import { settlementService } from '../../services/api/settlementService';
import type { Project } from '../../types';

const SETTLEMENT_DRAFT_KEY = 'project_owner_settlement_draft_v2';

const CATEGORY_OPTIONS = [
  'Thuê khoán chuyên gia',
  'Vật tư, văn phòng phẩm',
  'Hội nghị, hội thảo',
  'In ấn, tài liệu',
  'Thiết bị nghiên cứu',
  'Vật tư thí nghiệm',
  'Công tác phí',
  'Thù lao thực hiện',
  'Chi phí khác',
];

type BudgetRow = {
  id: string;
  category: string;
  amount: string;       // planned/spent amount (user enters)
  files: File[];
};

const mkRow = (): BudgetRow => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  category: CATEGORY_OPTIONS[0],
  amount: '',
  files: [],
});

const SettlementPage: React.FC = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [content, setContent] = useState('');
  const [rows, setRows] = useState<BudgetRow[]>([mkRow()]);
  const [loading, setLoading] = useState(false);
  const [settledAmount, setSettledAmount] = useState(0);       // tổng đã quyết toán được duyệt
  const [settlementDone, setSettlementDone] = useState(false); // true nếu đã quyết toán xong
  const [pendingSupplementNote, setPendingSupplementNote] = useState<string | null>(null); // Ghi chú bổ sung từ NCKH
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    projectService.getMine()
      .then((list) => {
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch((e) => showToast(typeof e === 'string' ? e : 'Không thể tải danh sách đề tài.', 'error'));
  }, []);

  // When project changes, reload approved settlements to compute already-settled amount
  useEffect(() => {
    if (!selectedProjectId) { setSettledAmount(0); setSettlementDone(false); setPendingSupplementNote(null); return; }
    settlementService.getAll()
      .then((list) => {
        const forProject = list.filter((s: any) => s.projectId === selectedProjectId || s.project?.id === selectedProjectId);
        const approvedTotal = forProject
          .filter((s: any) => s.status === 'da_xac_nhan' || s.status === 'hop_le')
          .reduce((sum: number, s: any) => sum + Number(s.amount ?? 0), 0);
        setSettledAmount(approvedTotal);
        setSettlementDone(
          forProject.some((s: any) => s.status === 'da_xac_nhan')
        );
        // Find the latest pending supplement note
        const pending = forProject.find((s: any) => s.status === 'cho_bo_sung' && s.supplementNote);
        setPendingSupplementNote(pending?.supplementNote ?? null);
      })
      .catch(console.error);
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const total = selectedProject?.budget ?? 0;
  const advanced = selectedProject?.advancedAmount ?? 0;
  // remaining = (toàn bộ kiốp cần quyết toán) - (phần đã quyết thành công)
  const needToSettle = total - advanced;
  const remaining = Math.max(needToSettle - settledAmount, 0);

  // Total from all rows
  const totalAmount = rows.reduce((sum, r) => {
    const n = Number(r.amount);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  const exceedRemaining = totalAmount > remaining && remaining >= 0;

  // Row operations
  const updateRow = (id: string, patch: Partial<BudgetRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, mkRow()]);

  const removeRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addFilesToRow = (id: string, newFiles: FileList | null) => {
    if (!newFiles) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const incoming = Array.from(newFiles).filter(
          (f) => !r.files.some((ex) => ex.name === f.name && ex.size === f.size)
        );
        return { ...r, files: [...r.files, ...incoming] };
      })
    );
  };

  const removeFileFromRow = (rowId: string, fileIdx: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, files: r.files.filter((_, i) => i !== fileIdx) } : r
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) { showToast('Vui lòng chọn đề tài.', 'error'); return; }
    if (!content.trim()) { showToast('Vui lòng nhập nội dung quyết toán.', 'error'); return; }
    if (totalAmount <= 0) { showToast('Tổng số tiền quyết toán phải lớn hơn 0.', 'error'); return; }
    if (exceedRemaining) { showToast('Tổng số tiền vượt quá kinh phí còn lại.', 'error'); return; }
    if (rows.some((r) => !r.amount || Number(r.amount) <= 0)) {
      showToast('Vui lòng nhập số tiền cho tất cả các khoản chi.', 'error'); return;
    }

    // Collect all files
    const allFiles = rows.flatMap((r) => r.files);

    setLoading(true);
    try {
      await settlementService.create({
        projectId: selectedProjectId,
        content: content.trim(),
        totalAmount,
        category: rows[0].category,
        evidenceFiles: allFiles,
      });
      localStorage.removeItem(SETTLEMENT_DRAFT_KEY);
      setContent('');
      setRows([mkRow()]);
      showToast(`Đã nộp hồ sơ quyết toán thành công! ${allFiles.length > 0 ? `Đã đính kèm ${allFiles.length} chứng từ.` : ''} Phòng NCKH sẽ xem xét trong 5–7 ngày.`);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (typeof e === 'string' ? e : 'Nộp hồ sơ thất bại. Kiểm tra lại kết nối.');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className={`fixed top-24 right-4 text-white px-6 py-4 rounded-xl shadow-lg z-[9999] text-sm font-bold max-w-sm ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quyết toán đề tài</h1>
        <p className="text-gray-600 text-sm mt-2">Nộp hồ sơ quyết toán kinh phí nghiên cứu theo từng khoản chi</p>
      </div>

      {/* Select project */}
      <div className="card motion-hover-lift">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn đề tài cần quyết toán</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="form-input"
        >
          <option value="">-- Chọn đề tài của bạn --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.title}</option>
          ))}
        </select>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card motion-hover-lift">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Tổng kinh phí đề tài</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString('vi-VN')} VNĐ</p>
        </div>
        <div className="card motion-hover-lift">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Đã giải ngân tạm ứng</p>
          <p className="text-2xl font-bold text-blue-600">{advanced.toLocaleString('vi-VN')} VNĐ</p>
        </div>
        <div className="card motion-hover-lift">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Đã quyết toán được duyệt</p>
          <p className={`text-2xl font-bold ${settledAmount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{settledAmount.toLocaleString('vi-VN')} VNĐ</p>
        </div>
        <div className="card motion-hover-lift">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Còn lại cần quyết toán</p>
          <p className={`text-2xl font-bold ${remaining === 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
            {remaining === 0 ? 'Đã hoàn tất' : remaining.toLocaleString('vi-VN') + ' VNĐ'}
          </p>
        </div>
      </div>

      {/* ─── Supplement Note Banner (from NCKH staff) ─── */}
      {pendingSupplementNote && !settlementDone && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 overflow-hidden">
          <div className="bg-red-600 px-5 py-3 flex items-center gap-3">
            <span className="text-white text-lg">🔔</span>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-wider">Hồ sơ bị trả về — Cần bổ sung</p>
              <p className="text-red-100 text-xs mt-0.5">Phòng NCKH đã gửi yêu cầu bổ sung chứng từ</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Nội dung cần bổ sung:</p>
            <div className="bg-white border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{pendingSupplementNote}</p>
            </div>
            <p className="text-xs text-red-500 mt-3 font-medium">
              ⚠️ Vui lòng bổ sung đầy đủ các mục trên và nộp lại hồ sơ quyết toán bên dưới.
            </p>
          </div>
        </div>
      )}

      {/* Completion banner */}
      {settlementDone && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <p className="font-bold text-emerald-800">Đề tài đã hoàn tất quyết toán kinh phí</p>
            <p className="text-sm text-emerald-600 mt-0.5">Đã quyết toán {settledAmount.toLocaleString('vi-VN')} VNĐ / tổng {total.toLocaleString('vi-VN')} VNĐ (trong đó tạm ứng {advanced.toLocaleString('vi-VN')} VNĐ + quyết toán {settledAmount.toLocaleString('vi-VN')} VNĐ). Không cần nộp thêm.</p>
          </div>
        </div>
      )}

      {!settlementDone && (
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nộp hồ sơ quyết toán</h2>
            <p className="text-xs text-gray-500 mt-0.5">Thêm từng khoản chi với số tiền và chứng từ riêng</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nội dung quyết toán tổng hợp</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Mô tả tổng quát nội dung chi tiêu của đề tài..."
            />
          </div>

          {/* Budget rows */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Bảng phân bổ kinh phí theo khoản chi</label>
              <button
                type="button"
                onClick={addRow}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                + Thêm khoản chi
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row, idx) => (
                <div key={row.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Khoản {idx + 1}</span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Xóa khoản
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Khoản chi</label>
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.id, { category: e.target.value })}
                        className="form-input text-sm"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Số tiền (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                        className="form-input text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Files for this row */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Chứng từ khoản này (hóa đơn, biên lai...) — <span className="font-normal text-gray-400">Có thể chọn nhiều file</span>
                    </label>
                    <input
                      ref={(el) => { fileInputRefs.current[row.id] = el; }}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => addFilesToRow(row.id, e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[row.id]?.click()}
                      className="w-full border border-dashed border-gray-300 rounded-lg p-3 text-center bg-white hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-sm text-gray-500 font-medium"
                    >
                      {row.files.length > 0 ? `Đã chọn ${row.files.length} file — Bấm để thêm` : '+ Chọn chứng từ cho khoản này'}
                    </button>
                    {row.files.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {row.files.map((f, fi) => (
                          <li key={fi} className="flex items-center justify-between px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs">
                            <span className="text-green-700 font-semibold truncate pr-2">✓ {f.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFileFromRow(row.id, fi)}
                              className="text-red-400 hover:text-red-600 font-bold shrink-0"
                            >
                              Xóa
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className={`rounded-xl border px-4 py-3 ${exceedRemaining ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Tổng quyết toán:</p>
              <p className={`text-lg font-black ${exceedRemaining ? 'text-red-600' : 'text-blue-700'}`}>
                {totalAmount.toLocaleString('vi-VN')} VNĐ
              </p>
            </div>
            <p className={`text-xs font-bold mt-1 ${exceedRemaining ? 'text-red-700' : 'text-blue-600'}`}>
              {exceedRemaining
                ? `⚠ Vượt quá kinh phí còn lại ${(totalAmount - remaining).toLocaleString('vi-VN')} VNĐ`
                : `Kinh phí còn lại sau nộp dự kiến: ${Math.max(remaining - totalAmount, 0).toLocaleString('vi-VN')} VNĐ`}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || exceedRemaining || !selectedProjectId || !content.trim() || totalAmount <= 0}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'ĐANG NỘP...' : 'NỘP HỒ SƠ QUYẾT TOÁN'}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
};

export default SettlementPage;
