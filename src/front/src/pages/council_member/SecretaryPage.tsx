import React from 'react';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { templateService } from '../../services/api/templateService';
import type { Council, Template } from '../../types';

type DownloadItem =
  | { kind: 'decision'; label: string }
  | { kind: 'minutes'; label: string }
  | { kind: 'report'; label: string; reportId: string };

type ScoreRow = {
  memberId: string;
  memberName: string;
  role: string;
  score: number | null;
  isSubmitted: boolean;
  submittedAt?: string | null;
  decisionStatus?: 'accepted' | 'rework' | null;
  decisionNote?: string;
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const roleLabel = (role: string) => {
  if (role === 'chu_tich') return 'Chu tich';
  if (role === 'phan_bien_1') return 'Phan bien 1';
  if (role === 'phan_bien_2') return 'Phan bien 2';
  if (role === 'thu_ky') return 'Thu ky';
  if (role === 'uy_vien') return 'Uy vien';
  return role;
};

const SecretaryPage: React.FC = () => {
  const [toast, setToast] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [polling, setPolling] = React.useState(false);
  const [councilId, setCouncilId] = React.useState('');
  const [activeCouncil, setActiveCouncil] = React.useState<Council | null>(null);
  const [rows, setRows] = React.useState<ScoreRow[]>([]);
  const [averageScore, setAverageScore] = React.useState(0);
  const [minutesContent, setMinutesContent] = React.useState('');
  const [minutesFile, setMinutesFile] = React.useState<File | null>(null);
  const [submittingMinutes, setSubmittingMinutes] = React.useState(false);
  const [templateId, setTemplateId] = React.useState('');
  const [decisionDialog, setDecisionDialog] = React.useState<{
    memberId: string;
    memberName: string;
    decision: 'accepted' | 'rework';
    note: string;
  } | null>(null);
  const [submittingDecision, setSubmittingDecision] = React.useState(false);
  const minutesFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadBaseData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await councilService.getMine();
      if (!list.length) {
        setCouncilId('');
        setActiveCouncil(null);
        setRows([]);
        setAverageScore(0);
        return;
      }

      const id = councilId || list[0].id;
      setCouncilId(id);

      const [detail, summary, templates] = await Promise.all([
        councilService.getById(id),
        councilService.getScoreSummary(id),
        templateService.getAll().catch(() => [] as Template[]),
      ]);

      if (detail) {
        setActiveCouncil(detail);
      }
      setRows(
        (summary?.items ?? []).map((item) => ({
          memberId: item.memberId,
          memberName: item.memberName,
          role: item.role,
          score: item.score,
          isSubmitted: item.isSubmitted,
          submittedAt: item.submittedAt,
          decisionStatus: item.decisionStatus,
          decisionNote: item.decisionNote,
        })),
      );
      setAverageScore(summary?.averageScore ?? 0);

      const secretaryTemplate = templates.find((t) => {
        const role = normalizeText(t.role);
        const category = normalizeText(t.category);
        const name = normalizeText(t.name);
        return role.includes('thu ky') || category.includes('thu_ky') || name.includes('bien ban');
      });
      if (secretaryTemplate) {
        setTemplateId(secretaryTemplate.id);
      }
    } catch (err) {
      console.error(err);
      setError(typeof err === 'string' ? err : 'Khong the tai du lieu hoi dong.');
    } finally {
      setLoading(false);
    }
  }, [councilId]);

  const refreshScoreBoard = React.useCallback(async () => {
    if (!councilId) return;
    try {
      setPolling(true);
      const summary = await councilService.getScoreSummary(councilId);
      setRows(
        (summary?.items ?? []).map((item) => ({
          memberId: item.memberId,
          memberName: item.memberName,
          role: item.role,
          score: item.score,
          isSubmitted: item.isSubmitted,
          submittedAt: item.submittedAt,
          decisionStatus: item.decisionStatus,
          decisionNote: item.decisionNote,
        })),
      );
      setAverageScore(summary?.averageScore ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setPolling(false);
    }
  }, [councilId]);

  React.useEffect(() => {
    loadBaseData().catch(() => undefined);
  }, [loadBaseData]);

  React.useEffect(() => {
    if (!councilId) return undefined;
    const timer = window.setInterval(() => {
      refreshScoreBoard().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [councilId, refreshScoreBoard]);

  const downloadableDocs = React.useMemo<DownloadItem[]>(() => {
    if (!activeCouncil) return [];
    const docs: DownloadItem[] = [
      { kind: 'decision', label: `Quyet dinh ${activeCouncil.decisionCode}.pdf` },
      { kind: 'minutes', label: `Bien ban ${activeCouncil.decisionCode}.pdf` },
    ];
    for (const report of activeCouncil.projectReports ?? []) {
      if (!report.fileUrl) continue;
      docs.push({
        kind: 'report',
        reportId: report.id,
        label: report.type === 'final' ? 'Bao cao tong ket.pdf' : 'Bao cao giua ky.pdf',
      });
    }
    return docs;
  }, [activeCouncil]);

  const handleDownloadDoc = async (doc: DownloadItem) => {
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
    } catch (err) {
      setError(typeof err === 'string' ? err : `Khong the tai ${doc.label}.`);
    }
  };

  const handleDownloadSummaryTemplate = async () => {
    if (!activeCouncil?.projectId || !templateId) {
      setError('Chua cau hinh bieu mau Thu ky tren he thong.');
      return;
    }
    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Da tai bieu mau Thu ky.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Khong the tai bieu mau Thu ky.');
    }
  };

  const handleUploadMinutes = async () => {
    if (!councilId) {
      setError('Chua co hoi dong de gui bien ban.');
      return;
    }
    if (!minutesFile) {
      setError('Vui long chon file bien ban nghiem thu.');
      return;
    }
    setSubmittingMinutes(true);
    setError('');
    try {
      await councilService.submitMinutes(
        councilId,
        minutesContent.trim() || 'Thu ky gui bien ban nghiem thu chinh thuc.',
        minutesFile,
      );
      showToast('Da tai len bien ban nghiem thu.');
      setMinutesFile(null);
      const detail = await councilService.getById(councilId);
      if (detail) setActiveCouncil(detail);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Khong the tai len bien ban nghiem thu.');
    } finally {
      setSubmittingMinutes(false);
    }
  };

  const openDecisionDialog = (memberId: string, decision: 'accepted' | 'rework', memberName: string) => {
    setDecisionDialog({
      memberId,
      memberName,
      decision,
      note: '',
    });
  };

  const submitDecision = async () => {
    if (!councilId) return;
    if (!decisionDialog) return;
    setSubmittingDecision(true);
    setError('');
    try {
      await councilService.submitScoreDecision(councilId, {
        memberId: decisionDialog.memberId,
        decision: decisionDialog.decision,
        note: decisionDialog.note.trim() || undefined,
      });
      await refreshScoreBoard();
      showToast(
        decisionDialog.decision === 'accepted'
          ? `Da xac nhan hop le cho ${decisionDialog.memberName}.`
          : `Da yeu cau ${decisionDialog.memberName} nhap lai diem.`,
      );
      setDecisionDialog(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Khong the cap nhat quyet dinh diem.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const finalizeCouncil = async () => {
    if (!councilId) return;
    setError('');
    try {
      await councilService.updateStatus(councilId, 'da_hoan_thanh', 'secretary');
      showToast('Da xac nhan hoan thanh chinh sua.');
      await loadBaseData();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Khong the cap nhat trang thai hoi dong.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">Bang dieu khien Thu ky hoi dong</h2>
        <p className="text-sm text-gray-500">Dong bo ket qua cham diem, tong hop bien ban va chot nghiem thu.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Dang tai du lieu hoi dong...</div>
      ) : !activeCouncil ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Ban chua duoc gan vao hoi dong nao.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Thong tin de tai</h3>
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-gray-400">Ma de tai</p><p className="font-semibold">{activeCouncil.projectCode}</p></div>
                <div><p className="text-xs text-gray-400">Ten de tai</p><p className="font-medium leading-relaxed">{activeCouncil.projectTitle}</p></div>
                <div><p className="text-xs text-gray-400">Ma hoi dong</p><p className="font-semibold">{activeCouncil.decisionCode}</p></div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Kho tai lieu</h3>
              {downloadableDocs.length ? (
                <ul className="space-y-2">
                  {downloadableDocs.map((doc, idx) => (
                    <li key={`${doc.label}-${idx}`}>
                      <button onClick={() => handleDownloadDoc(doc).catch(() => undefined)} className="text-sm text-blue-600 hover:underline">
                        {doc.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Chua co tai lieu san sang de tai.</p>
              )}
            </section>

            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Bieu mau cua toi</h3>
              <button
                onClick={() => handleDownloadSummaryTemplate().catch(() => undefined)}
                disabled={!templateId || !activeCouncil.projectId}
                className="w-full bg-[#EFF6FF] text-[#1E40AF] border border-blue-200 font-medium py-3 px-4 rounded-md text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Tai phieu tong hop diem va bien ban
              </button>
            </section>
          </aside>

          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Bang tong hop diem realtime</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {polling ? 'Dang dong bo...' : 'Tu dong cap nhat 5s'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Thanh vien</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Vai tro</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-center">Diem so</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Trang thai nop</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-right">Thao tac thu ky</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.memberId}>
                        <td className="px-6 py-4 text-sm font-medium">{row.memberName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{roleLabel(row.role)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-center">{row.score ?? '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {row.isSubmitted ? (
                            <span className="text-emerald-600 font-semibold">
                              Da nop {row.submittedAt ? `(${new Date(row.submittedAt).toLocaleTimeString('vi-VN')})` : ''}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold">Chua nop</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            disabled={!row.isSubmitted}
                            onClick={() => openDecisionDialog(row.memberId, 'accepted', row.memberName)}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            Xac nhan hop le
                          </button>
                          <button
                            disabled={!row.isSubmitted}
                            onClick={() => openDecisionDialog(row.memberId, 'rework', row.memberName)}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            Yeu cau nhap lai
                          </button>
                          {row.decisionStatus === 'accepted' && <span className="text-[10px] font-bold text-green-600">Da xac nhan</span>}
                          {row.decisionStatus === 'rework' && <span className="text-[10px] font-bold text-red-600">Cho nhap lai</span>}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td className="px-6 py-6 text-sm text-gray-400" colSpan={5}>
                          Chua co du lieu diem.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50">
                      <td className="px-6 py-4 text-sm font-bold text-[#1E40AF]" colSpan={2}>Diem trung binh cong</td>
                      <td className="px-6 py-4 text-lg font-bold text-[#1E40AF] text-center">{averageScore.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm italic text-[#1E40AF]" colSpan={2}>Tu dong tinh toan</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Ghi chu ket luan va yeu cau chinh sua</h3>
              <textarea
                value={minutesContent}
                onChange={(e) => setMinutesContent(e.target.value)}
                className="w-full border-gray-300 rounded-lg focus:ring-[#1E40AF] focus:border-[#1E40AF] text-sm p-4 h-40"
                placeholder="Nhap noi dung thao luan va yeu cau tu hoi dong..."
              />
            </section>

            <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
              <h3 className="font-semibold text-gray-800">Quan ly sau nghiem thu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <input
                    ref={minutesFileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setMinutesFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => minutesFileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-[#1E40AF] transition-colors bg-gray-50"
                  >
                    <div className="mb-3 text-gray-400 text-3xl font-bold">+</div>
                    <p className="text-sm font-medium text-gray-700">
                      {minutesFile ? `Da chon: ${minutesFile.name}` : 'Tai len bien ban nghiem thu chinh thuc'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Dinh dang ho tro: PDF</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUploadMinutes().catch(() => undefined)}
                    disabled={submittingMinutes || !minutesFile}
                    className="mt-3 w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-black disabled:opacity-50"
                  >
                    {submittingMinutes ? 'DANG GUI BIEN BAN...' : 'GUI BIEN BAN CHINH THUC'}
                  </button>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={() => finalizeCouncil().catch(() => undefined)}
                    className="w-full bg-[#1E40AF] text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    Xac nhan hoan thanh chinh sua
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {decisionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {decisionDialog.decision === 'accepted' ? 'Xac nhan hop le' : 'Yeu cau nhap lai'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Thanh vien: <span className="font-semibold text-gray-700">{decisionDialog.memberName}</span>
              </p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chu (tuy chon)
              </label>
              <textarea
                value={decisionDialog.note}
                onChange={(e) =>
                  setDecisionDialog((prev) => (prev ? { ...prev, note: e.target.value } : prev))
                }
                className="w-full rounded-lg border-gray-300 text-sm"
                rows={4}
                placeholder="Nhap ghi chu cho thanh vien..."
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionDialog(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => submitDecision().catch(() => undefined)}
                disabled={submittingDecision}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                  decisionDialog.decision === 'accepted'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingDecision ? 'Dang luu...' : 'Xac nhan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretaryPage;

