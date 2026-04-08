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
        const councils = await councilService.getAll();
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
          return role.includes('phan bien') || category.includes('phan_bien') || name.includes('nhan xet');
        });
        if (reviewerTemplate) setTemplateId(reviewerTemplate.id);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Khong the tai du lieu hoi dong.');
      } finally {
        setLoading(false);
      }
    };
    run().catch(() => undefined);
  }, []);

  const docs = React.useMemo<DownloadItem[]>(() => {
    if (!activeCouncil) return [];
    const rows: DownloadItem[] = [
      { kind: 'decision', label: `Quyet dinh ${activeCouncil.decisionCode}.pdf` },
      { kind: 'minutes', label: `Bien ban ${activeCouncil.decisionCode}.pdf` },
    ];
    for (const report of activeCouncil.projectReports ?? []) {
      if (!report.fileUrl) continue;
      rows.push({
        kind: 'report',
        reportId: report.id,
        label: report.type === 'final' ? 'Bao cao tong ket.pdf' : 'Bao cao giua ky.pdf',
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
      showToast(`Da tai: ${doc.label}`);
    } catch (e) {
      setError(typeof e === 'string' ? e : `Khong the tai ${doc.label}.`);
    }
  };

  const submitReview = async () => {
    if (!councilId || !score) return;
    setError('');
    try {
      await councilService.submitReview(councilId, Number(score), comments);
      const now = new Date().toISOString();
      setSubmittedAt(now);
      showToast('Da gui phieu diem va nhan xet.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the gui phieu nhan xet.');
    }
  };

  const downloadTemplate = async () => {
    if (!templateId || !activeCouncil?.projectId) {
      setError('Chua co bieu mau phan bien tren he thong.');
      return;
    }
    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Da tai phieu nhan xet phan bien.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai phieu nhan xet.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Khong gian lam viec phan bien</h2>
        <p className="text-sm text-slate-500">Cham diem va gui nhan xet cho hoi dong nghiem thu.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Dang tai du lieu...</div>
      ) : !activeCouncil ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Ban chua duoc phan cong hoi dong.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Thong tin de tai</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Ma de tai:</span> <span className="font-semibold">{activeCouncil.projectCode}</span></p>
                <p><span className="text-slate-500">Ma hoi dong:</span> <span className="font-semibold">{activeCouncil.decisionCode}</span></p>
                <p><span className="text-slate-500">Ten de tai:</span> <span className="font-medium">{activeCouncil.projectTitle}</span></p>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kho tai lieu</h3>
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
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Bieu mau cua toi</h3>
              <button onClick={() => downloadTemplate().catch(() => undefined)} className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors text-center">
                Tai phieu nhan xet phan bien
              </button>
            </section>
          </aside>

          <article className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Soan nhan xet phan bien</h3>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={Boolean(submittedAt)}
              className="w-full min-h-[260px] p-4 text-sm leading-relaxed border border-slate-200 rounded-lg"
              placeholder="Nhap noi dung nhan xet chi tiet..."
            />
            <div className="flex items-end justify-between gap-4">
              <label className="block text-sm font-semibold text-slate-700">
                Diem chuyen mon (0-100)
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
                Gui phieu diem va nhan xet
              </button>
            </div>
            {submittedAt && <p className="text-xs font-semibold text-emerald-600">Da gui luc {new Date(submittedAt).toLocaleString('vi-VN')}</p>}
          </article>
        </div>
      )}
    </div>
  );
};

export default ReviewerPage;
