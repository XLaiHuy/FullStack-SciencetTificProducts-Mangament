import React from 'react';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { templateService } from '../../services/api/templateService';
import type { Council, Template } from '../../types';

type DownloadItem =
  | { kind: 'decision'; label: string }
  | { kind: 'minutes'; label: string }
  | { kind: 'report'; label: string; reportId: string };

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const ChairmanPage: React.FC = () => {
  const [toast, setToast] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [score, setScore] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [submittedAt, setSubmittedAt] = React.useState<string | null>(null);
  const [councilId, setCouncilId] = React.useState('');
  const [activeCouncil, setActiveCouncil] = React.useState<Council | null>(null);
  const [templateId, setTemplateId] = React.useState('');
  const [minutesFile, setMinutesFile] = React.useState<File | null>(null);
  const [minutesUploadedAt, setMinutesUploadedAt] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const councils = await councilService.getMine();
        if (!councils.length) return;
        const id = councils[0].id;
        setCouncilId(id);
        const [detail, templates] = await Promise.all([
          councilService.getById(id),
          templateService.getAll().catch(() => [] as Template[]),
        ]);
        if (detail) setActiveCouncil(detail);
        const chairmanTemplate = templates.find((t) => {
          const role = normalizeText(t.role);
          const category = normalizeText(t.category);
          const name = normalizeText(t.name);
          return role.includes('chu tich') || category.includes('chu_tich') || name.includes('ket luan');
        });
        if (chairmanTemplate) setTemplateId(chairmanTemplate.id);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Không thể tải dữ liệu hội đồng.');
      } finally {
        setLoading(false);
      }
    };
    run().catch(() => undefined);
  }, []);

  const docs = React.useMemo<DownloadItem[]>(() => {
    if (!activeCouncil) return [];
    const rows: DownloadItem[] = [
      { kind: 'decision', label: `Quyết định ${activeCouncil.decisionCode}.pdf` },
      { kind: 'minutes', label: `Biên bản ${activeCouncil.decisionCode}.pdf` },
    ];
    for (const report of activeCouncil.projectReports ?? []) {
      if (!report.fileUrl) continue;
      rows.push({
        kind: 'report',
        reportId: report.id,
        label: report.type === 'final' ? 'Báo cáo tổng kết.pdf' : 'Báo cáo giữa kỳ.pdf',
      });
    }
    return rows;
  }, [activeCouncil]);

  const downloadDoc = async (doc: DownloadItem) => {
    if (!activeCouncil) return;
    try {
      if (doc.kind === 'decision') {
        await councilService.downloadDecision(activeCouncil.id, doc.label);
      } else if (doc.kind === 'minutes') {
        await councilService.downloadMinutes(activeCouncil.id, doc.label);
      } else if (activeCouncil.projectId) {
        await projectService.downloadReportFile(activeCouncil.projectId, doc.reportId, doc.label);
      }
      showToast(`Đã tải: ${doc.label}`);
    } catch (e) {
      setError(typeof e === 'string' ? e : `Không thể tải ${doc.label}.`);
    }
  };

  const submitScore = async () => {
    if (!councilId || !score) return;
    setError('');
    try {
      await councilService.submitScore(councilId, Number(score), comments);
      const now = new Date().toISOString();
      setSubmittedAt(now);
      showToast('Đã gửi kết quả và báo cáo đánh giá!');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể gửi điểm chủ tịch.');
    }
  };

  const downloadTemplate = async () => {
    if (!templateId || !activeCouncil?.projectId) {
      setError('Chưa có biểu mẫu chủ tịch trên hệ thống.');
      return;
    }
    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Đã tải biểu mẫu chủ tịch.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải biểu mẫu chủ tịch.');
    }
  };

  const uploadMinutes = async () => {
    if (!councilId || !minutesFile) return;
    setError('');
    try {
      await councilService.submitMinutes(councilId, comments || 'Chủ tịch gửi biên bản kết luận.', minutesFile);
      showToast('Đã tải biên bản nghiệm thu đã ký!');
      setMinutesUploadedAt(new Date().toISOString());
      setMinutesFile(null);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải biên bản đã ký.');
    }
  };

  const isScoreSubmitted = Boolean(submittedAt) || Boolean(activeCouncil?.hasSubmittedScore);
  const isMinutesUploaded = Boolean(minutesUploadedAt) || Boolean(activeCouncil?.minutesFileUrl);
  const isCouncilCompleted = activeCouncil?.status === 'da_hoan_thanh';

  const shouldLockScore = isScoreSubmitted || isCouncilCompleted;
  const shouldLockMinutes = isMinutesUploaded || isCouncilCompleted;

  return (
    <div className="flex flex-col h-full gap-6">
      {toast && <div className="fixed top-24 right-4 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[9999] text-sm font-bold animate-in slide-in-from-right-8">{toast}</div>}
      <header className="bg-white border border-slate-200 rounded-xl flex items-center justify-between px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Không gian làm việc chủ tịch hội đồng</h2>
        <div className="flex items-center gap-3">
          {isCouncilCompleted && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200">Đã khóa: Đã chuyển sang Thư ký</span>}
          <button
            type="button"
            onClick={() => submitScore().catch(() => undefined)}
            disabled={shouldLockScore || !score}
            className="bg-[#1E40AF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-all shadow-sm disabled:opacity-50"
          >
            {shouldLockScore ? 'Đã lưu điểm thành công' : 'Gửi kết quả và kết thúc nghiệm thu'}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
      ) : !activeCouncil ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Bạn chưa được phân công hội đồng.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thông tin đề tài</h3>
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-slate-500">Mã đề tài</p><p className="font-semibold">{activeCouncil.projectCode}</p></div>
                <div><p className="text-xs text-slate-500">Tên đề tài</p><p className="font-medium">{activeCouncil.projectTitle}</p></div>
                <div><p className="text-xs text-slate-500">Mã hội đồng</p><p className="font-semibold">{activeCouncil.decisionCode}</p></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Kho tài liệu</h3>
              <ul className="space-y-2">
                {docs.map((doc, idx) => (
                  <li key={`${doc.label}-${idx}`} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-sm text-slate-700 truncate pr-2">{doc.label}</span>
                    <button onClick={() => downloadDoc(doc).catch(() => undefined)} className="text-xs text-[#1E40AF] font-semibold hover:underline">
                      Tải
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Biểu mẫu của tôi</h3>
              <button onClick={() => downloadTemplate().catch(() => undefined)} className="w-full px-4 py-3 bg-white border border-[#1E40AF] text-[#1E40AF] text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
                Tải mẫu chủ tịch
              </button>
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Chấm điểm và nhận xét</h3>
            <label className="block text-sm font-semibold text-slate-700">
              Điểm của chủ tịch
              <input
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={shouldLockScore}
                type="number"
                min="0"
                max="100"
                className="mt-1 w-40 border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Nhận xét chi tiết
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={shouldLockScore}
                rows={6}
                className="mt-1 w-full border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
            <div className="rounded-xl border border-dashed border-slate-300 p-5 bg-slate-50">
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" disabled={shouldLockMinutes} onChange={(e) => setMinutesFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileInputRef.current?.click()} disabled={shouldLockMinutes} className="w-full border border-slate-200 bg-white rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
                {minutesFile ? `Đã chọn: ${minutesFile.name}` : 'Chọn biên bản nghiệm thu đã ký (PDF)'}
              </button>
              <button
                onClick={() => uploadMinutes().catch(() => undefined)}
                disabled={shouldLockMinutes || !minutesFile}
                className="mt-3 w-full bg-gray-900 text-white font-bold py-2.5 rounded-lg hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
              >
                {shouldLockMinutes ? 'Biên bản đã được lưu' : 'Tải lên hệ thống'}
              </button>
              {isMinutesUploaded && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Thông tin biên bản hợp lệ</p>
                    <p className="text-xs text-emerald-600">Đã lưu trữ trên hệ thống an toàn</p>
                  </div>
                </div>
              )}
            </div>
            {isScoreSubmitted && <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Trạng thái: Đã gửi kết quả đánh giá thành công
              </p>
              {submittedAt && <p className="text-xs font-medium text-blue-600 mt-1 pl-7">Vào lúc {new Date(submittedAt).toLocaleString('vi-VN')}</p>}
            </div>}
          </section>
        </div>
      )}
    </div>
  );
};

export default ChairmanPage;

