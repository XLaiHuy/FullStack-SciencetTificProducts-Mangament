import React, { useEffect, useRef, useState } from 'react';
import { projectService } from '../../services/api/projectService';
import { settlementService } from '../../services/api/settlementService';
import type { Project } from '../../types';

const SETTLEMENT_DRAFT_KEY = 'project_owner_settlement_draft';

const SettlementPage: React.FC = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Thiết bị nghiên cứu');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load danh sách đề tài của GV
  useEffect(() => {
    projectService.getAll()
      .then((list) => {
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch((e) => showToast(typeof e === 'string' ? e : 'Không thể tải danh sách đề tài.', 'error'));
  }, []);

  // Restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTLEMENT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        content?: string; amount?: string; category?: string;
        selectedProjectId?: string; evidenceFileName?: string;
      };
      if (draft.content) setContent(draft.content);
      if (draft.amount) setAmount(draft.amount);
      if (draft.category) setCategory(draft.category);
      if (draft.selectedProjectId) setSelectedProjectId(draft.selectedProjectId);
      if (draft.evidenceFileName) {
        showToast(`Đã tải lại nháp, vui lòng chọn lại tệp: ${draft.evidenceFileName}.`, 'success');
      }
    } catch {
      // Ignore malformed draft
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const advanced = selectedProject?.advancedAmount ?? 0;
  const total = selectedProject?.budget ?? 0;
  const remaining = total - advanced;
  const numericAmount = Number(amount);
  const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const exceedRemaining = isAmountValid && numericAmount > remaining && remaining >= 0;
  const amountAfterSubmit = isAmountValid ? remaining - numericAmount : remaining;
  const isSubmitDisabled = loading || !selectedProjectId || !content.trim() || !isAmountValid || exceedRemaining;

  const handleSaveDraft = () => {
    localStorage.setItem(SETTLEMENT_DRAFT_KEY, JSON.stringify({
      content, amount, category,
      selectedProjectId,
      evidenceFileName: evidenceFile?.name ?? '',
      savedAt: new Date().toISOString(),
    }));
    showToast('Đã lưu nháp hồ sơ quyết toán.');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProjectId) { showToast('Vui lòng chọn đề tài.', 'error'); return; }
    if (!content.trim()) { showToast('Vui lòng nhập nội dung quyết toán.', 'error'); return; }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('Số tiền quyết toán không hợp lệ.', 'error'); return;
    }
    if (numericAmount > remaining && remaining >= 0) {
      showToast('Số tiền vượt quá kinh phí còn lại của đề tài.', 'error'); return;
    }

    setLoading(true);
    try {
      await settlementService.create({
        projectId: selectedProjectId,
        content: content.trim(),
        totalAmount: numericAmount,
        category,
        evidenceFile,
      });
      localStorage.removeItem(SETTLEMENT_DRAFT_KEY);
      setContent('');
      setAmount('');
      setCategory('Thiết bị nghiên cứu');
      setEvidenceFile(null);
      showToast('Đã nộp hồ sơ quyết toán thành công! Phòng NCKH sẽ xem xét trong 5–7 ngày.');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (typeof e === 'string' ? e : 'Nộp hồ sơ thất bại.');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-bold animate-fade-up ${toast.type === 'error' ? 'bg-error-500' : 'bg-success-500'}`}>
          {toast.message}
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quyết toán đề tài</h1>
        <p className="text-gray-600 text-sm mt-2">Nộp hồ sơ quyết toán kinh phí nghiên cứu</p>
      </div>

      {/* Chọn đề tài */}
      <div className="card motion-hover-lift animate-fade-up-delay-1">
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

      {/* Số liệu tài chính */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up-delay-1">
        {([
          ['Tổng kinh phí', total.toLocaleString('vi-VN') + ' VNĐ', 'text-gray-900'],
          ['Đã tạm ứng', advanced.toLocaleString('vi-VN') + ' VNĐ', 'text-primary-600'],
          ['Còn lại quyết toán', remaining.toLocaleString('vi-VN') + ' VNĐ', 'text-warning-600'],
        ] as [string, string, string][]).map(([label, val, cls]) => (
          <div key={label} className="card motion-hover-lift">
            <p className="text-xs font-bold text-gray-600 uppercase mb-2">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden animate-fade-up-delay-2">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Nộp hồ sơ quyết toán</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nội dung quyết toán</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-input"
              rows={4}
              placeholder="Mô tả chi tiết nội dung chi tiêu..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Số tiền quyết toán (VNĐ)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input"
                placeholder="0"
              />
              {amount !== '' && !isAmountValid && (
                <p className="text-xs text-error-600 mt-2 font-semibold">Số tiền phải lớn hơn 0.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Khoản chi</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input"
              >
                <option>Thiết bị nghiên cứu</option>
                <option>Vật tư thí nghiệm</option>
                <option>Công tác phí</option>
                <option>Hội thảo, hội nghị</option>
                <option>Thù lao thực hiện</option>
              </select>
            </div>
          </div>

          <div className={`rounded-lg border px-4 py-3 ${exceedRemaining ? 'border-error-200 bg-error-50' : 'border-info-200 bg-info-50'}`}>
            <p className="text-xs font-semibold text-gray-700">Dự báo sau khi nộp hồ sơ</p>
            <p className={`text-sm font-bold mt-1 ${exceedRemaining ? 'text-error-700' : 'text-info-700'}`}>
              {exceedRemaining
                ? 'Số tiền vượt quá phần còn lại, vui lòng giảm giá trị quyết toán.'
                : `Kinh phí còn lại sau nộp dự kiến: ${Math.max(amountAfterSubmit, 0).toLocaleString('vi-VN')} VNĐ`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tải lên chứng từ (hóa đơn, biên lai...)</label>
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
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer"
            >
              <p className="text-sm font-bold text-gray-700">
                {evidenceFile ? `Đã chọn: ${evidenceFile.name}` : 'Kéo thả hoặc chọn file'}
              </p>
              <p className="text-xs text-gray-600 mt-1">PDF, DOCX, JPG (Max 20MB)</p>
            </button>
            {evidenceFile && (
              <p className="text-xs text-success-600 mt-2 font-semibold">✓ Đã chọn: {evidenceFile.name}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="btn-secondary"
            >
              Lưu nháp
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'ĐANG NỘP...' : 'NỘP HỒ SƠ QUYẾT TOÁN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlementPage;
