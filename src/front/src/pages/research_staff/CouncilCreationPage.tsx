import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { contractService, type ParsedContractProposal } from '../../services/api/contractService';
import type { Council, CouncilMember, Project } from '../../types';

type ToastType = 'success' | 'error';
type ProposalSuggestionSource = 'principal_investigator' | 'role_placeholder' | 'parsed_candidate';

type ProposalSuggestion = {
  id: string;
  name: string;
  title?: string;
  institution?: string;
  affiliation?: string;
  email?: string;
  phone?: string;
  role: CouncilMember['role'];
  roleDisplay: string;
  source: ProposalSuggestionSource;
  selectable: boolean;
  hasConflict: boolean;
  conflictReason?: string;
};

const DEFAULT_MEMBER: CouncilMember = {
  name: 'GS.TS. Hoang Van E',
  role: 'chu_tich',
  email: 'hve@university.edu.vn',
  phone: '',
  affiliation: 'Dai hoc Quoc gia',
  title: 'GS.TS.',
};

const ROLE_LABELS: Record<CouncilMember['role'], string> = {
  chu_tich: 'Chu tich',
  phan_bien_1: 'Phan bien 1',
  phan_bien_2: 'Phan bien 2',
  thu_ky: 'Thu ky',
  uy_vien: 'Uy vien',
};

const ROLE_SUGGESTION_TEMPLATE: Array<Pick<ProposalSuggestion, 'role' | 'roleDisplay'>> = [
  { role: 'phan_bien_1', roleDisplay: 'PHAN BIEN 1' },
  { role: 'phan_bien_2', roleDisplay: 'PHAN BIEN 2' },
  { role: 'thu_ky', roleDisplay: 'THU KY' },
  { role: 'uy_vien', roleDisplay: 'UY VIEN' },
];

const CouncilCreationPage: React.FC = () => {
  const [councils, setCouncils] = useState<Council[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [members, setMembers] = useState<CouncilMember[]>([DEFAULT_MEMBER]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [activeProjectSnapshot, setActiveProjectSnapshot] = useState<{ id?: string; code: string; title: string; owner?: string } | null>(null);
  const [activeCouncilId, setActiveCouncilId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removedMemberIndexes, setRemovedMemberIndexes] = useState<number[]>([]);
  const [decisionFile, setDecisionFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [proposalParsed, setProposalParsed] = useState<ParsedContractProposal | null>(null);
  const [proposalParseLoading, setProposalParseLoading] = useState(false);
  const [proposalCandidates, setProposalCandidates] = useState<ProposalSuggestion[]>([]);
  const [newMember, setNewMember] = useState<CouncilMember>({ name: '', role: 'uy_vien', email: '', phone: '', affiliation: '', title: '' });

  const decisionInputRef = useRef<HTMLInputElement | null>(null);
  const proposalInputRef = useRef<HTMLInputElement | null>(null);

  const activeMembers = useMemo(
    () => members.filter((_, idx) => !removedMemberIndexes.includes(idx)),
    [members, removedMemberIndexes],
  );

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [projects, activeProjectId],
  );

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const buildPlaceholderSuggestions = (): ProposalSuggestion[] =>
    ROLE_SUGGESTION_TEMPLATE.map(({ role, roleDisplay }) => ({
      id: `placeholder-${role}`,
      name: 'Chua co ung vien tu file',
      role,
      roleDisplay,
      source: 'role_placeholder',
      selectable: false,
      hasConflict: false,
      institution: 'Goi y mem cho hoi dong',
      affiliation: 'Bo sung thu cong sau khi kiem tra COI',
    }));

  const resetProposalState = (nextFile?: File | null) => {
    setProposalFile(nextFile ?? null);
    setProposalParsed(null);
    setProposalCandidates([]);
    setToast(null);
  };

  useEffect(() => {
    Promise.all([councilService.getAll(), projectService.getAll()])
      .then(([councilRows, projectRows]) => {
        setCouncils(councilRows);
        setProjects(projectRows.filter((item) => item.status === 'cho_nghiem_thu'));
      })
      .catch((error) => {
        console.error(error);
        showToast(typeof error === 'string' ? error : 'Khong the tai du lieu hoi dong.', 'error');
      });
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    const matched = projects.find((item) => item.id === activeProjectId);
    if (matched) {
      setActiveProjectSnapshot({ id: matched.id, code: matched.code, title: matched.title, owner: matched.owner });
    }
  }, [activeProjectId, projects]);

  const refreshCouncils = async () => {
    const councilRows = await councilService.getAll();
    setCouncils(councilRows);
  };

  const refreshProjects = async () => {
    const projectRows = await projectService.getAll();
    setProjects(projectRows.filter((item) => item.status === 'cho_nghiem_thu'));
  };

  const loadCouncilDetail = async (councilId: string, editMode: boolean) => {
    setLoading(true);
    try {
      const council = await councilService.getById(councilId);
      if (!council) {
        showToast('Khong tim thay hoi dong.', 'error');
        return;
      }

      setActiveCouncilId(council.id);
      setActiveProjectId(council.projectId ?? '');
      setActiveProjectSnapshot({ id: council.projectId, code: council.projectCode, title: council.projectTitle });
      setMembers(council.members.map((member) => ({ ...member, title: member.title ?? member.hocHamHocVi ?? '' })));
      setRemovedMemberIndexes([]);
      document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
      showToast(editMode ? 'Da mo che do sua hoi dong.' : 'Da mo chi tiet hoi dong.', 'success');
    } catch (error) {
      console.error(error);
      showToast(typeof error === 'string' ? error : 'Khong the tai chi tiet hoi dong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resolveProjectFromProposal = (parsed: ParsedContractProposal) => {
    if (parsed.suggestedProjectId) {
      const matchedById = projects.find((item) => item.id === parsed.suggestedProjectId);
      if (matchedById) return matchedById;
    }

    if (parsed.projectCode) {
      const upperCode = parsed.projectCode.toUpperCase();
      const matchedByCode = projects.find((item) => item.code.toUpperCase() === upperCode);
      if (matchedByCode) return matchedByCode;
    }

    return null;
  };

  const buildParsedSuggestions = async (parsed: ParsedContractProposal, matchedProjectId?: string): Promise<ProposalSuggestion[]> => {
    const suggestions: ProposalSuggestion[] = [];

    if (parsed.ownerName || parsed.ownerEmail) {
      let hasConflict = true;
      let conflictReason = 'Chu nhiem de tai khong the tham gia hoi dong nghiem thu.';

      if (matchedProjectId && parsed.ownerEmail) {
        const conflict = await councilService.checkConflict({
          name: parsed.ownerName || '',
          title: parsed.ownerTitle || '',
          role: 'uy_vien',
          email: parsed.ownerEmail,
        }, matchedProjectId);

        hasConflict = conflict;
        if (!conflict) {
          hasConflict = true;
          conflictReason = 'Chu nhiem de tai luon duoc danh dau COI tren khu goi y.';
        }
      }

      suggestions.push({
        id: 'principal-investigator',
        name: parsed.ownerName || 'Chua ro chu nhiem de tai',
        title: parsed.ownerTitle || '',
        institution: parsed.projectTitle || 'Thong tin nhan dien tu file de xuat',
        affiliation: 'Chu nhiem de tai',
        email: parsed.ownerEmail || '',
        role: 'uy_vien',
        roleDisplay: 'CHU NHIEM DE TAI',
        source: 'principal_investigator',
        selectable: false,
        hasConflict,
        conflictReason,
      });
    }

    suggestions.push(...buildPlaceholderSuggestions());
    return suggestions;
  };

  const handleParseProposal = async () => {
    if (!proposalFile) {
      showToast('Vui long chon file de xuat truoc khi nhan dien.', 'error');
      return;
    }
    if (proposalInputRef.current && (proposalInputRef.current.files?.length ?? 0) === 0) {
      showToast('Khong the doc file da chon, vui long chon lai file roi thu lai.', 'error');
      return;
    }
    if (proposalFile.size === 0) {
      showToast('File de xuat dang rong. Vui long chon file hop le.', 'error');
      return;
    }

    setProposalParseLoading(true);
    try {
      const parsed = await contractService.parseProposal(proposalFile);
      setProposalParsed(parsed);

      const matchedProject = resolveProjectFromProposal(parsed);
      if (matchedProject) {
        setActiveProjectId(matchedProject.id);
        setActiveProjectSnapshot({
          id: matchedProject.id,
          code: matchedProject.code,
          title: matchedProject.title,
          owner: matchedProject.owner,
        });
      }

      const suggestions = await buildParsedSuggestions(parsed, matchedProject?.id);
      setProposalCandidates(suggestions);
      showToast('Nhan dien de xuat thanh cong!', 'success');
    } catch (error) {
      console.error(error);
      const message = typeof error === 'string'
        ? error
        : proposalFile
          ? 'Khong the nhan dien noi dung tep. Neu file da hien ten, vui long chon lai file roi thu lai.'
          : 'Khong the nhan dien noi dung tep.';
      showToast(message, 'error');
    } finally {
      setProposalParseLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const projectForCheck = activeProjectId || activeProjectSnapshot?.id;
    if (!projectForCheck) {
      showToast('Vui long chon de tai can thanh lap hoi dong truoc.');
      return;
    }

    setLoading(true);
    try {
      const hasConflict = await councilService.checkConflict(newMember, projectForCheck);
      if (hasConflict) {
        showToast('Khong the them thanh vien: co xung dot loi ich (COI).', 'error');
        return;
      }

      if (activeCouncilId) {
        await councilService.addMember(activeCouncilId, { ...newMember, hasConflict: false, title: newMember.title }, 'Research Staff');
        await loadCouncilDetail(activeCouncilId, true);
      } else {
        setMembers([...members, { ...newMember, hasConflict: false, title: newMember.title }]);
      }

      setNewMember({ name: '', role: 'uy_vien', email: '', phone: '', affiliation: '', title: '' });
      setIsModalOpen(false);
      showToast(`Da them thanh vien: ${newMember.name}`, 'success');
    } catch (error) {
      console.error(error);
      showToast(typeof error === 'string' ? error : 'Them thanh vien that bai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = (candidate: ProposalSuggestion) => {
    if (!candidate.selectable || candidate.hasConflict || !candidate.email) {
      showToast(candidate.conflictReason || 'De xuat nay khong the them truc tiep vao hoi dong.', 'error');
      return;
    }

    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }

    const exists = members.some((member) => member.email.toLowerCase() === candidate.email?.toLowerCase());
    if (exists) {
      showToast('Thanh vien nay da co trong danh sach.', 'error');
      return;
    }

    setMembers([
      ...members,
      {
        name: candidate.name,
        title: candidate.title,
        institution: candidate.institution,
        affiliation: candidate.affiliation,
        email: candidate.email,
        role: candidate.role,
        hasConflict: false,
        phone: candidate.phone,
      },
    ]);
    document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`Da them de xuat: ${candidate.name}`, 'success');
  };

  const handleRemoveMember = async (idx: number) => {
    const member = members[idx];
    if (!member) return;

    if (activeCouncilId && member.id) {
      setLoading(true);
      try {
        await councilService.removeMember(activeCouncilId, member.id);
        await loadCouncilDetail(activeCouncilId, true);
        await refreshCouncils();
        showToast(`Da go thanh vien ${member.name}`, 'success');
      } catch (error) {
        console.error(error);
        showToast(typeof error === 'string' ? error : 'Khong the go thanh vien.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    setRemovedMemberIndexes([...removedMemberIndexes, idx]);
    showToast(`Da go thanh vien ${member.name} khoi ban nhap`, 'success');
  };

  const handleExport = () => {
    const rows = activeMembers.map((member, index) => `${index + 1},${member.name},${member.title ?? ''},${member.role},${member.email},${member.affiliation ?? ''}`);
    const csv = ['STT,HoTen,HocHamHocVi,VaiTro,Email,DonVi', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `HoiDong_${activeProjectSnapshot?.code ?? 'BanNhay'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Xuat file thanh cong.', 'success');
  };

  const handleCreateCouncil = async () => {
    if (activeCouncilId) {
      if (!decisionFile) {
        showToast('Ban dang o che do sua. Chon file neu muon cap nhat quyet dinh.', 'success');
        return;
      }

      setLoading(true);
      try {
        await councilService.uploadDecision(activeCouncilId, decisionFile);
        await refreshCouncils();
        showToast('Da cap nhat file quyet dinh cho hoi dong.', 'success');
        setDecisionFile(null);
      } catch (error) {
        console.error(error);
        showToast(typeof error === 'string' ? error : 'Cap nhat file quyet dinh that bai.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!activeProject) {
      showToast('Vui long chon de tai can thanh lap hoi dong.');
      return;
    }

    if (activeMembers.length === 0) {
      showToast('Vui long them toi thieu 1 thanh vien hoi dong.');
      return;
    }

    setLoading(true);
    try {
      const created = await councilService.create(activeProject.id, activeProject.title, activeMembers, 'Research Staff');
      if (decisionFile) {
        await councilService.uploadDecision(created.id, decisionFile);
      }

      setCouncils([created, ...councils]);
      await refreshProjects();
      await refreshCouncils();
      setActiveProjectId('');
      setActiveProjectSnapshot(null);
      setMembers([DEFAULT_MEMBER]);
      setRemovedMemberIndexes([]);
      setDecisionFile(null);
      resetProposalState(null);
      showToast('Hoi dong da duoc phe duyet va ban hanh thanh cong!', 'success');
    } catch (error) {
      console.error(error);
      showToast(typeof error === 'string' ? error : 'Ban hanh hoi dong that bai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thanh lap Hoi dong Nghiem thu</h1>
        <p className="text-gray-500 text-sm mt-1">Thanh lap hoi dong cho cac de tai da hoan thanh</p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-full" />
            De tai cho thanh lap Hoi dong
          </h2>
          <span className="bg-blue-50 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-blue-100">{projects.length} can xu ly</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-card">
          {projects.map((project, index) => (
            <div key={project.id} className={`p-6 flex items-center justify-between gap-6 border-l-4 ${index === 0 ? 'border-l-primary' : 'border-l-transparent'} border-b border-gray-50 last:border-b-0`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{project.code}</span>
                  {project.endDate < '2024-01-01' && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">HAN: {project.endDate}</span>}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{project.title}</h3>
                <p className="text-xs text-gray-500">Chu nhiem: {project.owner} • Thoi gian: {project.durationMonths} thang</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveProjectId(project.id);
                  setActiveCouncilId(null);
                  setActiveProjectSnapshot({ id: project.id, code: project.code, title: project.title, owner: project.owner });
                  document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-button hover:bg-primary-dark"
              >
                Thiet lap Hoi dong
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-4 space-y-6">
          <div className="bg-white border border-blue-200 rounded-2xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-blue-50 bg-blue-50/50">
              <h3 className="font-bold text-blue-800 text-sm uppercase tracking-tight">AI Nhan Dien De Xuat</h3>
            </div>
            <div className="p-5 space-y-4 text-center">
              <div className="border-2 border-dashed border-blue-100 rounded-xl p-6 bg-blue-50/20">
                <input
                  ref={proposalInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(event) => resetProposalState(event.target.files?.[0] ?? null)}
                />
                <button type="button" onClick={() => proposalInputRef.current?.click()} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-button">
                  <span className="text-xl">+</span>
                </button>
                <p className="text-xs font-bold text-gray-700">{proposalFile ? proposalFile.name : 'TAI FILE DE XUAT (PDF/DOCX)'}</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase">Tu dong dien canh bao COI va goi y role</p>
              </div>

              <button type="button" onClick={handleParseProposal} disabled={proposalParseLoading || !proposalFile} className="w-full py-2.5 bg-blue-700 text-white text-xs font-bold rounded-xl shadow-button hover:bg-blue-800 disabled:opacity-50">
                {proposalParseLoading ? 'DANG XU LY...' : 'BAT DAU NHAN DIEN'}
              </button>

              {proposalParsed && (
                <div className="text-left bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ket qua nhan dien</p>
                  <p className="text-xs font-bold text-gray-800">Ma de tai: <span className="text-blue-600 font-black">{proposalParsed.projectCode || 'N/A'}</span></p>
                  <p className="text-xs text-gray-600">Chu nhiem: {proposalParsed.ownerTitle ? `${proposalParsed.ownerTitle} ` : ''}{proposalParsed.ownerName || 'N/A'}</p>
                  <p className="text-xs text-gray-600">Email: {proposalParsed.ownerEmail || 'N/A'}</p>
                  <p className="text-xs text-gray-600">Kinh phi: {proposalParsed.suggestedBudget ? proposalParsed.suggestedBudget.toLocaleString('vi-VN') : 'N/A'}</p>
                  <p className="text-[11px] text-gray-600 italic">"{proposalParsed.textExcerpt.slice(0, 120)}..."</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight">Goi y tu Chu nhiem</h3>
            </div>
            <div className="p-5 space-y-4">
              {proposalCandidates.length === 0 && (
                <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-xs text-gray-500">
                  Chua co goi y. Tai file de xuat va bam nhan dien de hien canh bao COI cho chu nhiem cung cac role mem.
                </div>
              )}
              {proposalCandidates.map((candidate) => (
                <div key={candidate.id} className="p-4 border border-gray-100 rounded-xl space-y-3 bg-white">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{candidate.name}</p>
                      <p className="text-[11px] text-gray-500">{candidate.institution || candidate.affiliation || 'Chua co thong tin bo sung'}</p>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded">{candidate.roleDisplay}</span>
                  </div>

                  {candidate.hasConflict ? (
                    <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {candidate.conflictReason || 'CANH BAO: XUNG DOT LOI ICH (COI)'}
                    </div>
                  ) : candidate.selectable ? (
                    <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      DU DIEU KIEN
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      CHO BO SUNG UNG VIEN
                    </div>
                  )}

                  {candidate.email && <p className="text-[11px] text-gray-500">{candidate.email}</p>}

                  <button
                    type="button"
                    onClick={() => handleSelectProposal(candidate)}
                    disabled={!candidate.selectable || candidate.hasConflict}
                    className={`w-full py-2.5 text-[11px] font-bold border rounded-xl transition-colors ${!candidate.selectable || candidate.hasConflict ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-primary hover:text-white hover:border-primary'}`}
                  >
                    {candidate.selectable && !candidate.hasConflict ? 'Chon de xuat' : 'Khong the them truc tiep'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8" id="council-details-section">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-card">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Chi tiet thanh phan Hoi dong</h3>
            <div className="mb-6 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">De tai dang chon</p>
              <p className="text-sm font-bold text-gray-900">
                {activeProject ? `${activeProject.code} - ${activeProject.title}` : activeProjectSnapshot ? `${activeProjectSnapshot.code} - ${activeProjectSnapshot.title}` : 'Chua chon de tai'}
              </p>
              {(activeProject || activeProjectSnapshot) && (
                <p className="text-xs text-gray-500 mt-1">Chu nhiem: {activeProject?.owner ?? activeProjectSnapshot?.owner ?? 'N/A'}</p>
              )}
            </div>

            <div className="overflow-hidden border border-gray-100 rounded-xl mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Ho va ten', 'Hoc ham / Hoc vi', 'Vai tro', 'Email', 'Xoa'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((member, idx) => (
                    <tr key={`${member.email}-${idx}`}>
                      <td className="px-4 py-4">
                        <input type="text" value={member.name} onChange={(event) => setMembers(members.map((item, index) => index === idx ? { ...item, name: event.target.value } : item))} className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" value={member.title || ''} onChange={(event) => setMembers(members.map((item, index) => index === idx ? { ...item, title: event.target.value, hocHamHocVi: event.target.value } : item))} className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" placeholder="Nhap hoc ham/hoc vi" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" value={ROLE_LABELS[member.role]} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="email" value={member.email || ''} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {removedMemberIndexes.includes(idx) ? (
                          <span className="text-[10px] font-bold text-red-500 uppercase">Da go</span>
                        ) : (
                          <button type="button" onClick={() => handleRemoveMember(idx)} className="text-gray-400 hover:text-red-500 font-bold text-[10px] uppercase">Go thanh vien</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="px-4 py-4">
                      <button type="button" onClick={() => setIsModalOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-[#1E40AF] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                        + Them thanh vien moi
                      </button>
                      <button type="button" onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2 text-xs font-bold w-full">
                        Xuat file
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Bieu mau lien quan</p>
              <p className="text-xs text-blue-800">Mo trang quan ly bieu mau de xem/sua bieu mau theo vai tro cua thanh vien trong hoi dong.</p>
              <button type="button" onClick={() => { window.location.href = '/research-staff/template-management'; }} className="mt-2 text-xs font-bold text-primary hover:underline">
                Mo bieu mau lien quan
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Quyet dinh thanh lap (.pdf)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/50">
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 font-bold text-xs mb-4">UP</div>
                <input ref={decisionInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => setDecisionFile(event.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => decisionInputRef.current?.click()} className="bg-white border border-gray-200 px-6 py-2 text-xs font-bold text-primary rounded-xl mb-2 shadow-card">
                  Chon tep tin
                </button>
                <p className="text-[11px] text-gray-400 font-medium">hoac keo tha vao day (Toi da 10MB)</p>
                {decisionFile && <p className="text-xs text-gray-600 font-bold mt-2">Da chon: {decisionFile.name}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleCreateCouncil} disabled={loading} className="px-8 py-3 text-xs font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark">
                {loading ? 'DANG XU LY...' : 'Phe duyet & Ban hanh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" /> Hoi dong da thanh lap gan day
          </h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['So quyet dinh', 'Ten de tai', 'Ngay lap', 'Trang thai', 'Thao tac'].map((header) => (
                  <th key={header} className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {councils.map((council) => (
                <tr key={council.id} className="hover:bg-gray-50/50">
                  <td className="px-8 py-5 text-sm font-bold text-gray-900">{council.decisionCode}</td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-600 max-w-xs truncate">{council.projectTitle}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{council.createdDate}</td>
                  <td className="px-8 py-5"><StatusBadge status={council.status} /></td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => loadCouncilDetail(council.id, false)} className="text-[10px] font-bold text-primary hover:underline">Xem</button>
                      <button type="button" onClick={() => loadCouncilDetail(council.id, true)} className="text-[10px] font-bold text-primary hover:underline">Sua</button>
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const result = await councilService.resendInvitations(council.id);
                            showToast(`Da gui mail cho ${result.sent} thanh vien.`, 'success');
                          } catch (error) {
                            console.error(error);
                            showToast(typeof error === 'string' ? error : 'Gui mail that bai.', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Gui mail
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-[500px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Them thanh vien Hoi dong</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold">x</button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ho va ten</label>
                <input required type="text" value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="Nhap ten thanh vien..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vai tro</label>
                <select value={newMember.role} onChange={(event) => setNewMember({ ...newMember, role: event.target.value as CouncilMember['role'] })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]">
                  <option value="chu_tich">Chu tich</option>
                  <option value="phan_bien_1">Phan bien 1</option>
                  <option value="phan_bien_2">Phan bien 2</option>
                  <option value="thu_ky">Thu ky</option>
                  <option value="uy_vien">Uy vien</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                <input required type="email" value={newMember.email} onChange={(event) => setNewMember({ ...newMember, email: event.target.value })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="email@domain.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hoc ham / Hoc vi</label>
                <input value={newMember.title ?? ''} onChange={(event) => setNewMember({ ...newMember, title: event.target.value, hocHamHocVi: event.target.value })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="Vi du: GS.TS., PGS.TS., TS..." />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold border rounded-xl text-gray-600 hover:bg-gray-50">Huy</button>
                <button disabled={loading} type="submit" className="px-6 py-2.5 text-sm font-bold bg-[#1E40AF] text-white rounded-xl shadow-md hover:bg-blue-800">{loading ? 'DANG KIEM TRA...' : 'Luu thanh vien'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilCreationPage;
