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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
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
      showToast('Đã gửi kết quả và kết thúc nghiệm thu.');
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
      showToast('Đã tải biên bản nghiệm thu đã ký.');
      setMinutesFile(null);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải biên bản đã ký.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      <header className="bg-white border border-slate-200 rounded-xl flex items-center justify-between px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Không gian làm việc chủ tịch hội đồng</h2>
        <button
          type="button"
          onClick={() => submitScore().catch(() => undefined)}
          disabled={Boolean(submittedAt) || !score}
          className="bg-[#1E40AF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-all shadow-sm disabled:opacity-50"
        >
          Gửi kết quả và kết thúc nghiệm thu
        </button>
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
                disabled={Boolean(submittedAt)}
                type="number"
                min="0"
                max="100"
                className="mt-1 w-40 border-slate-200 rounded-lg text-sm"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Nhận xét chi tiết
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={Boolean(submittedAt)}
                rows={6}
                className="mt-1 w-full border-slate-200 rounded-lg text-sm"
              />
            </label>
            <div className="rounded-xl border border-dashed border-slate-300 p-5 bg-slate-50">
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setMinutesFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full border border-slate-200 bg-white rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {minutesFile ? `Đã chọn: ${minutesFile.name}` : 'Chọn biên bản nghiệm thu đã ký (PDF)'}
              </button>
              <button
                onClick={() => uploadMinutes().catch(() => undefined)}
                disabled={!minutesFile}
                className="mt-3 w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-black disabled:opacity-50"
              >
                Tải biên bản đã ký
              </button>
            </div>
            {submittedAt && <p className="text-xs font-semibold text-emerald-600">Đã gửi lúc {new Date(submittedAt).toLocaleString('vi-VN')}</p>}
          </section>
        </div>
      )}
    </div>
  );
};

export default ChairmanPage;

