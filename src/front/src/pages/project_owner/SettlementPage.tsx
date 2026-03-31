import React, { useEffect, useRef, useState } from 'react';

const SETTLEMENT_DRAFT_KEY = 'project_owner_settlement_draft';

const SettlementPage: React.FC = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Thiết bị nghiên cứu');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTLEMENT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        content?: string;
        amount?: string;
        category?: string;
        evidenceFileName?: string;
      };
      setContent(draft.content ?? '');
      setAmount(draft.amount ?? '');
      setCategory(draft.category ?? 'Thiết bị nghiên cứu');
      if (draft.evidenceFileName) {
        showToast(`Da tai lai nhap, vui long chon lai tep: ${draft.evidenceFileName}.`, 'success');
      }
    } catch {
      // Ignore malformed draft data.
    }
  }, []);

  const handleSaveDraft = () => {
    localStorage.setItem(
      SETTLEMENT_DRAFT_KEY,
      JSON.stringify({
        content,
        amount,
        category,
        evidenceFileName: evidenceFile?.name ?? '',
        savedAt: new Date().toISOString(),
      })
    );
    showToast('Da luu nhap ho so quyet toan.');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      showToast('Vui long nhap noi dung quyet toan.', 'error');
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('So tien quyet toan khong hop le.', 'error');
      return;
    }
    if (!evidenceFile) {
      showToast('Vui long tai len it nhat 1 tep chung tu.', 'error');
      return;
    }

    localStorage.removeItem(SETTLEMENT_DRAFT_KEY);
    setContent('');
    setAmount('');
    setCategory('Thiết bị nghiên cứu');
    setEvidenceFile(null);
    showToast('Da nop ho so quyet toan thanh cong! Phong NCKH se xem xet trong 5-7 ngay.');
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quyết toán đề tài</h1>
        <p className="text-slate-500 text-sm mt-1">Nộp hồ sơ quyết toán kinh phí nghiên cứu</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[['Tổng kinh phí', '500.000.000 VNĐ', 'text-slate-800'], ['Đã tạm ứng', '200.000.000 VNĐ', 'text-primary'], ['Còn lại quyết toán', '300.000.000 VNĐ', 'text-amber-600']].map(([label, val, cls]) => (
          <div key={label} className="bg-white border rounded-xl p-5 shadow-card">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">{label}</p>
            <p className={`text-xl font-black ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Nộp hồ sơ quyết toán</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung quyết toán</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary"
              rows={4}
              placeholder="Mô tả chi tiết nội dung chi tiêu..."
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Số tiền quyết toán (VNĐ)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary py-2.5"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Khoản chi</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary py-2.5"
              >
                <option>Thiết bị nghiên cứu</option>
                <option>Vật tư thí nghiệm</option>
                <option>Công tác phí</option>
                <option>Hội thảo, hội nghị</option>
                <option>Thù lao thực hiện</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tải lên chứng từ (hóa đơn, biên lai...)</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:border-primary hover:bg-blue-50 transition-all cursor-pointer"
            >
              <p className="text-sm font-bold text-slate-700">
                {evidenceFile ? `Da chon: ${evidenceFile.name}` : 'Kéo thả hoặc chọn file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, JPG (Max 20MB)</p>
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-6 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Lưu nháp
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark"
            >
              NỘP HỒ SƠ QUYẾT TOÁN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlementPage;
