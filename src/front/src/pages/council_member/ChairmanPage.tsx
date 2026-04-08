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
        const councils = await councilService.getAll();
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

  const submitScore = async () => {
    if (!councilId || !score) return;
    setError('');
    try {
      await councilService.submitScore(councilId, Number(score), comments);
      const now = new Date().toISOString();
      setSubmittedAt(now);
      showToast('Da gui ket qua va ket thuc nghiem thu.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the gui diem chu tich.');
    }
  };

  const downloadTemplate = async () => {
    if (!templateId || !activeCouncil?.projectId) {
      setError('Chua co bieu mau chu tich tren he thong.');
      return;
    }
    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Da tai bieu mau chu tich.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai bieu mau chu tich.');
    }
  };

  const uploadMinutes = async () => {
    if (!councilId || !minutesFile) return;
    setError('');
    try {
      await councilService.submitMinutes(councilId, comments || 'Chu tich gui bien ban ket luan.', minutesFile);
      showToast('Da tai bien ban nghiem thu da ky.');
      setMinutesFile(null);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai bien ban da ky.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      <header className="bg-white border border-slate-200 rounded-xl flex items-center justify-between px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Khong gian lam viec chu tich hoi dong</h2>
        <button
          type="button"
          onClick={() => submitScore().catch(() => undefined)}
          disabled={Boolean(submittedAt) || !score}
          className="bg-[#1E40AF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-all shadow-sm disabled:opacity-50"
        >
          Gui ket qua va ket thuc nghiem thu
        </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thong tin de tai</h3>
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-slate-500">Ma de tai</p><p className="font-semibold">{activeCouncil.projectCode}</p></div>
                <div><p className="text-xs text-slate-500">Ten de tai</p><p className="font-medium">{activeCouncil.projectTitle}</p></div>
                <div><p className="text-xs text-slate-500">Ma hoi dong</p><p className="font-semibold">{activeCouncil.decisionCode}</p></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Kho tai lieu</h3>
              <ul className="space-y-2">
                {docs.map((doc, idx) => (
                  <li key={`${doc.label}-${idx}`} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-sm text-slate-700 truncate pr-2">{doc.label}</span>
                    <button onClick={() => downloadDoc(doc).catch(() => undefined)} className="text-xs text-[#1E40AF] font-semibold hover:underline">
                      Tai
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bieu mau cua toi</h3>
              <button onClick={() => downloadTemplate().catch(() => undefined)} className="w-full px-4 py-3 bg-white border border-[#1E40AF] text-[#1E40AF] text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
                Tai mau chu tich
              </button>
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Cham diem va nhan xet</h3>
            <label className="block text-sm font-semibold text-slate-700">
              Diem cua chu tich
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
              Nhan xet chi tiet
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
                {minutesFile ? `Da chon: ${minutesFile.name}` : 'Chon bien ban nghiem thu da ky (PDF)'}
              </button>
              <button
                onClick={() => uploadMinutes().catch(() => undefined)}
                disabled={!minutesFile}
                className="mt-3 w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-black disabled:opacity-50"
              >
                Tai bien ban da ky
              </button>
            </div>
            {submittedAt && <p className="text-xs font-semibold text-emerald-600">Da gui luc {new Date(submittedAt).toLocaleString('vi-VN')}</p>}
          </section>
        </div>
      )}
    </div>
  );
};

export default ChairmanPage;
