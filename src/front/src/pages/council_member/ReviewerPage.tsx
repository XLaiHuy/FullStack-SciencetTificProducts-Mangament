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

const ReviewerPage: React.FC = () => {
  const [toast, setToast] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [score, setScore] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [submittedAt, setSubmittedAt] = React.useState<string | null>(null);
  const [councilId, setCouncilId] = React.useState('');
  const [activeCouncil, setActiveCouncil] = React.useState<Council | null>(null);
  const [templateId, setTemplateId] = React.useState('');

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
        const reviewerTemplate = templates.find((t) => {
          const role = normalizeText(t.role);
          const category = normalizeText(t.category);
          const name = normalizeText(t.name);
          return (
            role.includes('phan bien') ||
            role.includes('phan_bien') ||
            role === 'phan_bien_1' ||
            role === 'phan_bien_2' ||
            category.includes('phan_bien') ||
            category.includes('phan bien') ||
            name.includes('nhan xet') ||
            name.includes('phan bien')
          );
        });
        if (reviewerTemplate) setTemplateId(reviewerTemplate.id);
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

  const submitReview = async () => {
    if (!councilId || !score) return;
    setError('');
    try {
      await councilService.submitReview(councilId, Number(score), comments);
      const now = new Date().toISOString();
      setSubmittedAt(now);
      showToast('Đã gửi phiếu điểm và nhận xét.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể gửi phiếu nhận xét.');
    }
  };

  const downloadTemplate = async () => {
    if (!templateId || !activeCouncil?.projectId) {
      setError('Chưa có biểu mẫu phản biện trên hệ thống.');
      return;
    }
    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Đã tải phiếu nhận xét phản biện.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải phiếu nhận xét.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Không gian làm việc phản biện</h2>
        <p className="text-sm text-slate-500">Chấm điểm và gửi nhận xét cho hội đồng nghiệm thu.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Thông tin đề tài</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Mã đề tài:</span> <span className="font-semibold">{activeCouncil.projectCode}</span></p>
                <p><span className="text-slate-500">Mã hội đồng:</span> <span className="font-semibold">{activeCouncil.decisionCode}</span></p>
                <p><span className="text-slate-500">Tên đề tài:</span> <span className="font-medium">{activeCouncil.projectTitle}</span></p>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kho tài liệu</h3>
              <ul className="space-y-2">
                {docs.map((doc, idx) => (
                  <li key={`${doc.label}-${idx}`}>
                    <button onClick={() => downloadDoc(doc).catch(() => undefined)} className="text-sm text-blue-600 hover:underline">
                      {doc.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Biểu mẫu của tôi</h3>
              <button onClick={() => downloadTemplate().catch(() => undefined)} className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors text-center">
                Tải phiếu nhận xét phản biện
              </button>
            </section>
          </aside>

          <article className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Soạn nhận xét phản biện</h3>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={Boolean(submittedAt)}
              className="w-full min-h-[260px] p-4 text-sm leading-relaxed border border-slate-200 rounded-lg"
              placeholder="Nhập nội dung nhận xét chi tiết..."
            />
            <div className="flex items-end justify-between gap-4">
              <label className="block text-sm font-semibold text-slate-700">
                Điểm chuyên môn (0-100)
                <input
                  disabled={Boolean(submittedAt)}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1 w-32 border-slate-200 rounded-lg text-sm"
                />
              </label>
              <button
                onClick={() => submitReview().catch(() => undefined)}
                disabled={Boolean(submittedAt) || !score}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-[#2563eb] border border-[#1d4ed8] rounded-md hover:bg-[#1d4ed8] transition-colors shadow-md disabled:opacity-50"
              >
                Gửi phiếu điểm và nhận xét
              </button>
            </div>
            {submittedAt && <p className="text-xs font-semibold text-emerald-600">Đã gửi lúc {new Date(submittedAt).toLocaleString('vi-VN')}</p>}
          </article>
        </div>
      )}
    </div>
  );
};

export default ReviewerPage;

