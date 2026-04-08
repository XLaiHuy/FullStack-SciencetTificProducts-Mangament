import React, { useRef, useState } from 'react';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { templateService } from '../../services/api/templateService';
import type { Council, Template } from '../../types';

const MEMBER_DRAFT_KEY = 'council_member_workspace_draft';

type DownloadItem =
  | { kind: 'decision'; label: string }
  | { kind: 'minutes'; label: string }
  | { kind: 'report'; label: string; reportId: string };

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const MemberPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [councilId, setCouncilId] = useState('');
  const [activeCouncil, setActiveCouncil] = useState<Council | null>(null);
  const [templateId, setTemplateId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(MEMBER_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { selectedSchedule?: string; uploadedFileName?: string };
      if (draft.selectedSchedule) setSelectedSchedule(draft.selectedSchedule);
      if (draft.uploadedFileName) {
        showToast(`Draft restored. Please reselect file: ${draft.uploadedFileName}`);
      }
    } catch {
      // ignore malformed local draft
    }
  }, []);

  React.useEffect(() => {
    const bootstrap = async () => {
      try {
        const list = await councilService.getMine();
        if (!list.length) return;

        const id = list[0].id;
        setCouncilId(id);

        const [detail, templates] = await Promise.all([
          councilService.getById(id),
          templateService.getAll().catch(() => [] as Template[]),
        ]);

        if (detail) setActiveCouncil(detail);

        const memberTemplate = templates.find((t) => {
          const role = normalizeText(t.role);
          const category = normalizeText(t.category);
          const name = normalizeText(t.name);
          return role.includes('uy vien') || category.includes('uy_vien') || name.includes('cham diem');
        });
        if (memberTemplate) setTemplateId(memberTemplate.id);
      } catch (err) {
        console.error(err);
        showToast('Cannot load council data.');
      }
    };

    bootstrap().catch(console.error);
  }, []);

  const availableDocs = React.useMemo<DownloadItem[]>(() => {
    if (!activeCouncil) return [];

    const docs: DownloadItem[] = [
      { kind: 'decision', label: `Decision ${activeCouncil.decisionCode}.pdf` },
      { kind: 'minutes', label: `Minutes ${activeCouncil.decisionCode}.pdf` },
    ];

    for (const report of activeCouncil.projectReports ?? []) {
      if (!report.fileUrl) continue;
      docs.push({
        kind: 'report',
        reportId: report.id,
        label: report.type === 'final' ? 'Final report.pdf' : 'Midterm report.pdf',
      });
    }

    return docs;
  }, [activeCouncil]);

  const handleDownloadDoc = async (doc: DownloadItem) => {
    if (!activeCouncil) {
      showToast('No assigned council to download documents.');
      return;
    }

    try {
      if (doc.kind === 'decision') {
        await councilService.downloadDecision(activeCouncil.id, doc.label);
      } else if (doc.kind === 'minutes') {
        await councilService.downloadMinutes(activeCouncil.id, doc.label);
      } else {
        if (!activeCouncil.projectId) throw new Error('Missing project id from council.');
        await projectService.downloadReportFile(activeCouncil.projectId, doc.reportId, doc.label);
      }
      showToast(`Downloaded: ${doc.label}`);
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : `Cannot download ${doc.label}.`);
    }
  };

  const handleDownloadTemplate = async (templateName: string) => {
    if (!templateId || !activeCouncil?.projectId) {
      showToast('No member template configured in system.');
      return;
    }

    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast(`Downloading ${templateName}...`);
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : 'Cannot download member template.');
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(
      MEMBER_DRAFT_KEY,
      JSON.stringify({
        selectedSchedule,
        uploadedFileName: uploadedFile?.name ?? '',
        savedAt: new Date().toISOString(),
      }),
    );
    showToast('Draft saved.');
  };

  const handleSubmitWorkspace = () => {
    if (!uploadedFile) {
      showToast('Please upload at least one meeting document before submit.');
      return;
    }
    if (!selectedSchedule) {
      showToast('Please select a schedule before submit.');
      return;
    }
    localStorage.removeItem(MEMBER_DRAFT_KEY);
    showToast('Workspace marked as completed.');
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-slate-800">Council Workspace</h2>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold uppercase">
          Status: In progress
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <section className="w-full lg:w-80 space-y-8 flex-shrink-0">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Project info</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="text-base font-bold text-[#1e40af] leading-tight mb-3">
                {activeCouncil?.projectTitle ?? 'No project assigned'}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-24 text-slate-500 shrink-0">Project code:</span>
                  <span className="font-medium">{activeCouncil?.projectCode ?? 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 shrink-0">Council code:</span>
                  <span className="font-medium">{activeCouncil?.decisionCode ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Document hub</h3>
            <div className="space-y-3">
              {(availableDocs.length ? availableDocs : [{ kind: 'decision' as const, label: 'No document available' }]).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                  <span className="text-sm font-medium truncate pr-2 w-3/4">{doc.label}</span>
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    disabled={!activeCouncil || !councilId || doc.label === 'No document available'}
                    className="text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded uppercase font-bold hover:bg-black transition-colors shrink-0 disabled:opacity-50"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">My templates</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleDownloadTemplate('Administrative minutes template')}
                className="flex items-center justify-start p-3 bg-[#eff6ff] text-[#1e40af] border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium text-left"
              >
                <span className="mr-3 text-lg font-bold">[DOC]</span> Administrative minutes template
              </button>
              <button
                onClick={() => handleDownloadTemplate('Council invitation template')}
                className="flex items-center justify-start p-3 bg-[#eff6ff] text-[#1e40af] border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium text-left"
              >
                <span className="mr-3 text-lg font-bold">[DOC]</span> Council invitation template
              </button>
            </div>
          </div>
        </section>

        <section className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-xl font-bold text-slate-800">Administrative workspace</h3>
            <p className="text-sm text-slate-500 mt-1">Manage meeting files and internal schedule preparation.</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Upload meeting files (invitation, minutes, evidence)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#1e40af] hover:bg-slate-50 transition-all bg-white"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 font-bold text-2xl">+</div>
              <p className="text-sm font-medium text-slate-600">
                {uploadedFile ? `Selected: ${uploadedFile.name}` : 'Drop file here or choose from computer'}
              </p>
              <p className="text-xs text-slate-400 mt-2 italic">Supported: PDF, JPG, PNG, DOCX (Max 20MB)</p>
            </button>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Schedule suggestions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {[
                  { key: 'WED-14:00', day: 'WED', date: '12', time: '14:00 - 16:30', place: 'Room A102 - Floor 1' },
                  { key: 'FRI-08:30', day: 'FRI', date: '14', time: '08:30 - 11:00', place: 'Online meeting (Zoom)' },
                ].map((slot) => (
                  <div key={slot.key} className="flex items-center p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="w-12 h-12 bg-[#eff6ff] text-[#1e40af] rounded flex flex-col items-center justify-center shrink-0 mr-4">
                      <span className="text-[10px] font-bold">{slot.day}</span>
                      <span className="text-lg font-bold">{slot.date}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{slot.time}</p>
                      <p className="text-xs text-slate-500">{slot.place}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSchedule(slot.key);
                        showToast('Schedule selected.');
                      }}
                      className={`px-3 py-1 text-[10px] font-bold rounded uppercase ${
                        selectedSchedule === slot.key
                          ? 'bg-[#1e40af] text-white hover:bg-blue-800'
                          : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {selectedSchedule === slot.key ? 'SELECTED' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center flex flex-col items-center justify-center text-slate-400">
                Interactive calendar block
                <br />
                (kept simple for this release)
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end space-x-4">
            <button
              onClick={handleSaveDraft}
              className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Save draft
            </button>
            <button
              onClick={handleSubmitWorkspace}
              className="px-6 py-2 bg-[#1e40af] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-shadow shadow-md"
            >
              Mark completed
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MemberPage;
