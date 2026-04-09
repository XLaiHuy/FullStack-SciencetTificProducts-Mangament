import React, { useEffect, useRef, useState } from 'react';
import { projectService } from '../../services/api/projectService';
import type { Project } from '../../types';

const MIDTERM_DRAFT_KEY = 'project_owner_midterm_report_draft';

const MidtermReportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    projectService.getAll().then((list) => {
      setProjects(list);
      if (list.length > 0) setProjectId(list[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MIDTERM_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { projectId?: string; notes?: string };
      if (draft.projectId) setProjectId(draft.projectId);
      if (draft.notes) setNotes(draft.notes);
    } catch {
      // Ignore corrupted draft payload.
    }
  }, []);

  const handleSaveDraft = () => {
    localStorage.setItem(
      MIDTERM_DRAFT_KEY,
      JSON.stringify({
        projectId,
        notes,
        savedAt: new Date().toISOString(),
      })
    );
    showToast('Đã lưu nháp báo cáo giữa kỳ.', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !file) {
      showToast('Vui lòng chọn đề tài và tải lên file báo cáo.', 'error');
      return;
    }
    setLoading(true);
    try {
      await projectService.submitProduct(projectId, { type: 'midterm_report', content: notes, file });
      setSubmitted(true);
      await projectService.getAll().then(setProjects);
      localStorage.removeItem(MIDTERM_DRAFT_KEY);
      showToast('Đã nộp báo cáo giữa kỳ thành công.', 'success');
    } catch (e) {
      showToast(typeof e === 'string' ? e : 'Không thể nộp báo cáo giữa kỳ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Báo cáo Tiến độ Giữa kỳ</h1>
        <p className="text-slate-500 text-sm mt-1">Nộp báo cáo tiến độ nghiên cứu giữa kỳ cho Phòng NCKH</p>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl font-bold">✓</span>
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Nộp báo cáo thành công!</h2>
          <p className="text-green-600">Báo cáo tiến độ giữa kỳ của bạn đã được gửi đến Phòng NCKH.</p>
          <p className="text-sm text-green-500 mt-2">Phòng NCKH sẽ phản hồi trong vòng 3-5 ngày làm việc.</p>
          <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">Nộp báo cáo khác</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Thông tin báo cáo giữa kỳ</h2>
            <p className="text-sm text-slate-500">Đề tài: NCKH-2023-0142 — Hạn nộp: 30/10/2023</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Đề tài</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl border-slate-300 text-sm focus:ring-primary focus:border-primary py-2.5 mb-3">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.title}</option>)}
                </select>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Giai đoạn thực hiện</label>
                <select className="w-full rounded-xl border-slate-300 text-sm focus:ring-primary focus:border-primary py-2.5">
                  <option>Giữa kỳ (6 tháng đầu)</option>
                  <option>Giữa kỳ (6 tháng tiếp theo)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tỷ lệ hoàn thành (%)</label>
                <input type="number" min="0" max="100" defaultValue="60" className="w-full rounded-xl border-slate-300 text-sm focus:ring-primary focus:border-primary py-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả tiến độ thực hiện</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-xl border-slate-300 text-sm focus:ring-primary focus:border-primary"
                rows={5}
                placeholder="Mô tả chi tiết về các công việc đã thực hiện, kết quả đạt được và những khó khăn gặp phải..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tải lên báo cáo (PDF/DOCX)</label>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                className="sr-only"
                onChange={e => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.docx"
              />
              <button
                type="button"
                onClick={openFilePicker}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all"
              >
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-primary">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-[10px] font-bold text-slate-400">PDF</div>
                    <p className="text-sm font-bold text-slate-700">Kéo thả tệp hoặc <span className="text-primary">chọn từ máy tính</span></p>
                    <p className="text-xs text-slate-400 mt-2">Định dạng: .pdf, .docx (Tối đa 20MB)</p>
                  </>
                )}
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
              <button disabled={loading || !projectId || !file} type="submit" className="px-8 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark disabled:opacity-50">{
                loading ? 'ĐANG NỘP...' : 'NỘP BÁO CÁO GIỮA KỲ'
              }</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MidtermReportPage;
