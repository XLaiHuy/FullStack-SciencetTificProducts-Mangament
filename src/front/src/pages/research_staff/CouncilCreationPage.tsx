import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { contractService, type ParsedContractProposal } from '../../services/api/contractService';
import type { Council, CouncilMember, Project } from '../../types';
import { buildRoleCounts, canAssignUniqueRole, findMissingRequiredRoles, validateCouncilComposition } from '../../utils/councilRules';
import { useDataSync } from '../../hooks/useDataSync';

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

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const NOISE_NAME_PREFIXES = [
  'vai tro',
  'email',
  'ho va ten',
  'hoc ham',
  'nhap hoc ham',
  'nhap email',
  'don vi',
  'chuc danh',
  'chu nhiem',
  'cong hoa xa hoi',
  'doc lap',
  'danh sach',
  'ma de tai',
  'ten de tai',
  'ngay thanh lap',
  'ghi chu',
  'hoi dong',
];

const rebalanceRecognizedRoles = (rows: CouncilMember[]) => {
  if (rows.length < 4) return rows;
  const requiredRoles: CouncilMember['role'][] = ['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky'];
  const counts = buildRoleCounts(rows);
  const missing = requiredRoles.filter((role) => counts[role] === 0);

  if (missing.length === 0) return rows;

  const rowsWithIndex = rows.map((member, index) => ({ member, index }));
  const mutable = rows.map((member) => ({ ...member }));

  // Prefer reassigning rows currently marked as 'uy_vien' and with weaker semantics.
  const candidates = rowsWithIndex
    .filter(({ member }) => member.role === 'uy_vien')
    .map(({ index }) => index);

  if (candidates.length === 0) return rows;

  let cursor = 0;
  for (const role of missing) {
    if (cursor >= candidates.length) break;
    mutable[candidates[cursor]].role = role;
    cursor += 1;
  }

  return mutable;
};

const isNoiseMember = (member: CouncilMember) => {
  const normalizedName = normalizeText(member.name);
  const normalizedEmail = (member.email ?? '').trim().toLowerCase();

  if (!normalizedName && !normalizedEmail) return true;
  if (normalizedName.length > 0 && normalizedName.length < 3 && !normalizedEmail) return true;
  return NOISE_NAME_PREFIXES.some((prefix) => normalizedName.startsWith(prefix));
};

const mergeMember = (base: CouncilMember, incoming: CouncilMember): CouncilMember => ({
  ...base,
  name: incoming.name || base.name,
  title: incoming.title || base.title,
  institution: incoming.institution || base.institution,
  email: incoming.email || base.email,
  phone: incoming.phone || base.phone,
  affiliation: incoming.affiliation || base.affiliation,
  role: incoming.role || base.role,
});

const memberKey = (member: CouncilMember) => {
  const normalizedEmail = (member.email ?? '').trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;
  return `name:${normalizeText(member.name)}`;
};

const dedupeMembers = (rows: CouncilMember[]) => {
  const deduped = new Map<string, CouncilMember>();

  rows.forEach((rawMember) => {
    const member: CouncilMember = {
      ...rawMember,
      name: (rawMember.name ?? '').trim(),
      title: (rawMember.title ?? rawMember.hocHamHocVi ?? '').trim(),
      email: (rawMember.email ?? '').trim().toLowerCase(),
      institution: (rawMember.institution ?? '').trim(),
      affiliation: (rawMember.affiliation ?? '').trim(),
      phone: (rawMember.phone ?? '').trim(),
      role: rawMember.role ?? 'uy_vien',
    };

    if (isNoiseMember(member)) return;

    const key = memberKey(member);
    const existing = deduped.get(key);
    deduped.set(key, existing ? mergeMember(existing, member) : member);
  });

  return Array.from(deduped.values());
};

type ActivityEvent = {
  id: string;
  at: string;
  category: 'user' | 'system';
  message: string;
};

type CredentialExportRecord = {
  id: string;
  decisionCode: string;
  createdAt: string;
  count: number;
  fileName: string;
  csvBase64: string;
};

const COUNCIL_DRAFT_KEY = 'nckh:council-creation:draft';

type CouncilDraftPayload = {
  activeProjectId: string;
  activeProjectSnapshot: { id?: string; code: string; title: string; owner?: string } | null;
  members: CouncilMember[];
  removedMemberIndexes: number[];
  wizardStep: 1 | 2 | 3;
  savedAt: string;
};

const CouncilCreationPage: React.FC = () => {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
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
  const [councilFile, setCouncilFile] = useState<File | null>(null);
  const [councilParseLoading, setCouncilParseLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([]);
  const [credentialExports, setCredentialExports] = useState<CredentialExportRecord[]>([]);
  const [newMember, setNewMember] = useState<CouncilMember>({ name: '', role: 'uy_vien', email: '', phone: '', affiliation: '', title: '' });

  const decisionInputRef = useRef<HTMLInputElement | null>(null);
  const councilFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMembers = useMemo(
    () => members.filter((_, idx) => !removedMemberIndexes.includes(idx)),
    [members, removedMemberIndexes],
  );

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [projects, activeProjectId],
  );

  const roleCounts = useMemo(() => buildRoleCounts(activeMembers), [activeMembers]);

  const missingRoles = useMemo(
    () => findMissingRequiredRoles(roleCounts),
    [roleCounts],
  );

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const pushActivity = (message: string, category: ActivityEvent['category'] = 'user') => {
    setActivityLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        category,
        message,
      },
      ...prev,
    ].slice(0, 20));
  };

  const buildPlaceholderSuggestions = (): ProposalSuggestion[] =>
    ROLE_SUGGESTION_TEMPLATE.map(({ role, roleDisplay }) => ({
      id: `placeholder-${role}`,
      name: 'Chưa có ứng viên từ file',
      role,
      roleDisplay,
      source: 'role_placeholder',
      selectable: false,
      hasConflict: false,
      institution: 'Gợi ý mềm cho hội đồng',
      affiliation: 'Bo sung thu cong sau khi kiem tra COI',
    }));

  const resetCouncilState = (nextFile?: File | null) => {
    setCouncilFile(nextFile ?? null);
    setToast(null);
  };

  const saveDraft = () => {
    const payload: CouncilDraftPayload = {
      activeProjectId,
      activeProjectSnapshot,
      members,
      removedMemberIndexes,
      wizardStep,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(COUNCIL_DRAFT_KEY, JSON.stringify(payload));
    showToast('Đã lưu nháp cục bộ cho trang lập hội đồng.', 'success');
    pushActivity('Lưu bản nháp lập hội đồng.', 'user');
  };

  const clearDraft = () => {
    window.localStorage.removeItem(COUNCIL_DRAFT_KEY);
  };

  useEffect(() => {
    Promise.all([councilService.getAll(), projectService.getAll()])
      .then(([councilRows, projectRows]) => {
        setCouncils(councilRows);
        setAllProjects(projectRows);
        setProjects(projectRows.filter((item) => item.status === 'cho_nghiem_thu'));

        const rawDraft = window.localStorage.getItem(COUNCIL_DRAFT_KEY);
        if (!rawDraft) return;

        try {
          const parsed = JSON.parse(rawDraft) as CouncilDraftPayload;
          if (Array.isArray(parsed.members) && parsed.members.length > 0) {
            setMembers(parsed.members);
            setRemovedMemberIndexes(Array.isArray(parsed.removedMemberIndexes) ? parsed.removedMemberIndexes : []);
            setWizardStep(parsed.wizardStep ?? 1);
          }

          if (parsed.activeProjectId) {
            setActiveProjectId(parsed.activeProjectId);
          }
          if (parsed.activeProjectSnapshot) {
            setActiveProjectSnapshot(parsed.activeProjectSnapshot);
          }

          if (parsed.savedAt) {
            showToast(`Đã khôi phục nháp lưu lúc ${new Date(parsed.savedAt).toLocaleString('vi-VN')}.`, 'success');
          }
        } catch {
          window.localStorage.removeItem(COUNCIL_DRAFT_KEY);
        }
      })
      .catch((error) => {
        console.error(error);
        showToast(typeof error === 'string' ? error : 'Không thể tải dữ liệu hội đồng.', 'error');
      });
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    const matched = projects.find((item) => item.id === activeProjectId);
    if (matched) {
      setActiveProjectSnapshot({ id: matched.id, code: matched.code, title: matched.title, owner: matched.owner });
      setWizardStep((prev) => (prev < 2 ? 2 : prev));
    }
  }, [activeProjectId, projects]);

  const refreshCouncils = async () => {
    const councilRows = await councilService.getAll();
    setCouncils(councilRows);
  };

  const refreshProjects = async () => {
    const projectRows = await projectService.getAll();
    setAllProjects(projectRows);
    setProjects(projectRows.filter((item) => item.status === 'cho_nghiem_thu'));
  };

  // Cross-tab sync: if another window creates/updates a council or project, refresh this page
  const { broadcast: broadcastCouncil } = useDataSync('councils', () => { refreshCouncils(); });
  const { broadcast: broadcastProject } = useDataSync('projects', () => { refreshProjects(); });

  const handleSelectProject = (project: Project) => {
    setActiveProjectId(project.id);
    setActiveCouncilId(null);
    setActiveProjectSnapshot({ id: project.id, code: project.code, title: project.title, owner: project.owner });
    setWizardStep(2);
    pushActivity(`Chọn đề tài ${project.code} để lập hội đồng.`, 'user');
    document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const auditTrail = useMemo(() => {
    const systemEvents: ActivityEvent[] = councils.slice(0, 8).map((council) => ({
      id: `sys-${council.id}`,
      at: council.createdDate,
      category: 'system',
      message: `Hội đồng ${council.decisionCode} được tạo cho đề tài ${council.projectCode}.`,
    }));

    return [...activityLogs, ...systemEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [activityLogs, councils]);

  const escapeCsvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const downloadBase64Csv = (base64: string, fallbackName: string) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const rememberCredentialExport = (record: Omit<CredentialExportRecord, 'id' | 'createdAt'>) => {
    setCredentialExports((prev) => ([
      {
        ...record,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 8)));
  };

  const handleExportAuditTrail = () => {
    const lines = auditTrail.map((event, idx) => [
      String(idx + 1),
      new Date(event.at).toLocaleString('vi-VN'),
      event.category,
      event.message,
    ].map(escapeCsvCell).join(','));

    const csv = ['"STT","ThoiGian","Loai","NoiDung"', ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AuditTrail_HoiDong_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất audit trail CSV.', 'success');
  };

  const loadCouncilDetail = async (councilId: string, editMode: boolean) => {
    setLoading(true);
    try {
      const council = await councilService.getById(councilId);
      if (!council) {
        showToast('Không tìm thấy hội đồng.', 'error');
        return;
      }

      setActiveCouncilId(council.id);
      setActiveProjectId(council.projectId ?? '');
      setActiveProjectSnapshot({ id: council.projectId, code: council.projectCode, title: council.projectTitle });
      setMembers(council.members.map((member) => ({ ...member, title: member.title ?? member.hocHamHocVi ?? '' })));
      setRemovedMemberIndexes([]);
      setWizardStep(3);
      document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
      showToast(editMode ? 'Đã mở chế độ sửa hội đồng.' : 'Đã mở chi tiết hội đồng.', 'success');
    } catch (error) {
      console.error(error);
      showToast(typeof error === 'string' ? error : 'Không thể tải chi tiết hội đồng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleParseCouncilFile = async () => {
    const fileToParse = councilFile ?? councilFileInputRef.current?.files?.[0] ?? null;
    if (!fileToParse) {
      showToast('Vui lòng tải file danh sách hội đồng trước khi nhận diện.', 'error');
      return;
    }
    if (fileToParse.size === 0) {
      showToast('File đang rỗng. Vui lòng chọn file hợp lệ.', 'error');
      return;
    }

    setCouncilParseLoading(true);
    try {
      const parsedMembers = await councilService.parseMembersFromFile(fileToParse);
      setCouncilFile(fileToParse);
      const normalizedParsedMembers = rebalanceRecognizedRoles(parsedMembers);

      const currentActiveMembers = members
        .filter((_, idx) => !removedMemberIndexes.includes(idx))
        .filter((member) => member.name !== DEFAULT_MEMBER.name);

      const uniqueMembers = dedupeMembers([...currentActiveMembers, ...normalizedParsedMembers]);

      if (uniqueMembers.length === 0) {
        showToast('Không nhận diện được thành viên hợp lệ. Vui lòng kiểm tra lại file đầu vào.', 'error');
        return;
      }

      setMembers(uniqueMembers);
      setRemovedMemberIndexes([]);
      setWizardStep(3);
      showToast(`Nhận diện thành công ${uniqueMembers.length} thành viên hợp lệ!`, 'success');
      pushActivity(`Nhận diện danh sách hội đồng từ file ${fileToParse.name}.`, 'user');
    } catch (error: any) {
      console.error(error);
      const message = typeof error === 'string'
        ? error
        : error?.response?.data?.error || error?.message || 'Không cấu trúc được danh sách thành viên.';
      showToast(message, 'error');
    } finally {
      setCouncilParseLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const projectForCheck = activeProjectId || activeProjectSnapshot?.id;
    if (!projectForCheck) {
      showToast('Vui lòng chọn đề tài cần thành lập hội đồng trước.');
      return;
    }

    const normalizedEmail = newMember.email.trim().toLowerCase();
    if (!normalizedEmail) {
      showToast('Vui lòng nhập email thành viên.', 'error');
      return;
    }

    const duplicateEmail = activeMembers.some((member) => (member.email || '').trim().toLowerCase() === normalizedEmail);
    if (duplicateEmail) {
      showToast('Email thành viên đã tồn tại trong hội đồng.', 'error');
      return;
    }

    if (!canAssignUniqueRole(activeMembers, newMember.role)) {
      showToast(`Vai tro ${ROLE_LABELS[newMember.role]} chi duoc phep 1 nguoi.`, 'error');
      return;
    }

    setLoading(true);
    try {
      const hasConflict = await councilService.checkConflict(newMember, projectForCheck);
      if (hasConflict) {
        showToast('Không thể thêm thành viên: có xung đột lợi ích (COI).', 'error');
        return;
      }

      if (activeCouncilId) {
        await councilService.addMember(activeCouncilId, { ...newMember, email: normalizedEmail, hasConflict: false, title: newMember.title }, 'Research Staff');
        await loadCouncilDetail(activeCouncilId, true);
      } else {
        setMembers([...members, { ...newMember, email: normalizedEmail, hasConflict: false, title: newMember.title }]);
      }

      setNewMember({ name: '', role: 'uy_vien', email: '', phone: '', affiliation: '', title: '' });
      setIsModalOpen(false);
      showToast(`Da them thanh vien: ${newMember.name}`, 'success');
      pushActivity(`Them thanh vien ${newMember.name} (${ROLE_LABELS[newMember.role]}).`, 'user');
    } catch (error) {
      console.error(error);
      showToast(typeof error === 'string' ? error : 'Them thanh vien that bai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = (candidate: ProposalSuggestion) => {
    if (!candidate.selectable || candidate.hasConflict || !candidate.email) {
      showToast(candidate.conflictReason || 'Đề xuất này không thể thêm trực tiếp vào hội đồng.', 'error');
      return;
    }

    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }

    const exists = members.some((member) => member.email.toLowerCase() === candidate.email?.toLowerCase());
    if (exists) {
      showToast('Thành viên này đã có trong danh sách.', 'error');
      return;
    }

    if (!canAssignUniqueRole(activeMembers, candidate.role)) {
      showToast(`Vai tro ${ROLE_LABELS[candidate.role]} da du nguoi, vui long chon vai tro khac.`, 'error');
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
    showToast(`Đã thêm đề xuất: ${candidate.name}`, 'success');
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
        showToast(`Đã gỡ thành viên ${member.name}`, 'success');
      } catch (error) {
        console.error(error);
        showToast(typeof error === 'string' ? error : 'Không thể gỡ thành viên.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    setRemovedMemberIndexes([...removedMemberIndexes, idx]);
    showToast(`Đã gỡ thành viên ${member.name} khỏi bản nháp`, 'success');
    pushActivity(`Gỡ thành viên ${member.name} khỏi danh sách bản nháp.`, 'user');
  };

  const handleExport = () => {
    const rows = activeMembers.map((member, index) => [
      index + 1,
      member.name,
      member.title ?? '',
      member.role,
      member.email,
      member.affiliation ?? '',
    ].map(escapeCsvCell).join(','));
    const csv = ['"STT","HoTen","HocHamHocVi","VaiTro","Email","DonVi"', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `HoiDong_${activeProjectSnapshot?.code ?? 'BanNhay'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Xuất file thành công.', 'success');
  };

  const handleCreateCouncil = async () => {
    if (activeCouncilId) {
      if (!decisionFile) {
        showToast('Bạn đang ở chế độ sửa. Chọn file nếu muốn cập nhật quyết định.', 'success');
        return;
      }

      setLoading(true);
      try {
        await councilService.uploadDecision(activeCouncilId, decisionFile);
        await refreshCouncils();
        showToast('Đã cập nhật file quyết định cho hội đồng.', 'success');
        setDecisionFile(null);
      } catch (error) {
        console.error(error);
        showToast(typeof error === 'string' ? error : 'Cập nhật file quyết định thất bại.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!activeProject) {
      showToast('Vui lòng chọn đề tài cần thành lập hội đồng.');
      return;
    }

    if (activeMembers.length === 0) {
      showToast('Vui lòng thêm tối thiểu 1 thành viên hội đồng.');
      return;
    }

    const validation = validateCouncilComposition(activeMembers);
    if (!validation.ok) {
      const firstError = validation.errors[0] ?? 'Dữ liệu hội đồng không hợp lệ.';

      if (firstError.includes('thieu vai tro')) {
        showToast(`Hội đồng con thieu vai tro: ${missingRoles.map((role) => ROLE_LABELS[role]).join(', ')}.`, 'error');
        return;
      }

      showToast(firstError, 'error');
      return;
    }

    setLoading(true);
    try {
      const created = await councilService.create(activeProject.id, activeProject.title, activeMembers, 'Research Staff');
      if (decisionFile) {
        await councilService.uploadDecision(created.id, decisionFile);
      }

      if (created.newAccountsCsvBase64 && (created.newAccountsCount ?? 0) > 0) {
        const fileName = created.newAccountsCsvFileName || `new_accounts_${created.decisionCode || activeProject.code}.csv`;
        downloadBase64Csv(
          created.newAccountsCsvBase64,
          fileName,
        );
        rememberCredentialExport({
          decisionCode: created.decisionCode || activeProject.code,
          count: created.newAccountsCount ?? 0,
          fileName,
          csvBase64: created.newAccountsCsvBase64,
        });
        showToast(`Đã xuất CSV tài khoản hội đồng (${created.newAccountsCount} thành viên).`, 'success');
        pushActivity(`Xuất CSV tài khoản hội đồng cho hội đồng ${created.decisionCode}.`, 'user');
      } else {
        showToast('Đã lưu hội đồng nhưng không có dữ liệu credential để xuất.', 'success');
      }

      setCouncils([created, ...councils]);
      await refreshProjects();
      await refreshCouncils();
      broadcastCouncil({ type: 'created', id: created.id });
      broadcastProject({ type: 'refreshed' });
      setActiveProjectId('');
      setActiveProjectSnapshot(null);
      setWizardStep(1);
      setMembers([DEFAULT_MEMBER]);
      setRemovedMemberIndexes([]);
      setDecisionFile(null);
      resetCouncilState(null);
      clearDraft();
      showToast('Hội đồng da duoc phe duyet va ban hanh thanh cong!', 'success');
      pushActivity(`Ban hành hội đồng ${created.decisionCode} cho de tai ${created.projectCode}.`, 'user');
    } catch (error) {
      console.error(error);
      showToast(typeof error === 'string' ? error : 'Ban hành hội đồng that bai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold text-white animate-fade-up ${toast.type === 'error' ? 'bg-error-500' : 'bg-success-500'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thành lập Hội đồng Nghiệm thu</h1>
        <p className="text-gray-500 text-sm mt-1">Tối giản quy trình lập hội đồng cho đề tài đã hoàn thành</p>
      </div>

      <section className="card p-4 animate-fade-up-delay-1">
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { step: 1, label: 'Chọn đề tài' },
            { step: 2, label: 'Tải & nhận diện' },
            { step: 3, label: 'Chốt hội đồng' },
          ].map((item) => {
            const active = wizardStep === item.step;
            const done = wizardStep > item.step;
            return (
              <div
                key={item.step}
                className={`rounded-xl border px-3 py-2 font-bold ${active ? 'border-primary-300 bg-primary-50 text-primary-800' : done ? 'border-success-200 bg-success-50 text-success-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
              >
                Bước {item.step}: {item.label}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-full" />
            Đề tài cho thành lập Hội đồng
          </h2>
          <span className="bg-blue-50 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-blue-100">{projects.length} cần xử lý</span>
        </div>
        <div className="card p-5 space-y-4 motion-hover-lift">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Chọn nhanh đề tài</label>
            <select
              value={activeProjectId}
              onChange={(event) => {
                const selected = allProjects.find((item) => item.id === event.target.value);
                if (!selected) return;
                if (selected.status !== 'cho_nghiem_thu') {
                  showToast('Đề tài chưa ở trạng thái Chờ nghiệm thu nên chưa thể lập hội đồng.', 'error');
                  return;
                }
                handleSelectProject(selected);
              }}
              className="form-input"
            >
              <option value="">-- Chọn đề tài --</option>
              {allProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.title} ({project.status})
                </option>
              ))}
            </select>
          </div>

          {projects.length === 0 ? (
            <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600">
              Hiện chưa có đề tài ở trạng thái <span className="font-bold">Chờ nghiệm thu</span>. Bạn vẫn có thể chọn đề tài trong danh sách để kiểm tra trạng thái.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="p-4 border border-primary-100 rounded-xl flex items-center justify-between gap-4 bg-white">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-primary-700 mb-1">{project.code}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{project.title}</p>
                    <p className="text-xs text-gray-500 mt-1">Chủ nhiệm: {project.owner} • Thời gian: {project.durationMonths} tháng</p>
                  </div>
                  <button type="button" onClick={() => handleSelectProject(project)} className="btn-primary text-xs">
                    Chọn đề tài
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {false && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-card">
          {projects.map((project, index) => (
            <div key={project.id} className={`p-6 flex items-center justify-between gap-6 border-l-4 ${index === 0 ? 'border-l-primary' : 'border-l-transparent'} border-b border-gray-50 last:border-b-0`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{project.code}</span>
                  {project.endDate < '2024-01-01' && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">HAN: {project.endDate}</span>}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{project.title}</h3>
                <p className="text-xs text-gray-500">Chủ nhiệm: {project.owner} • Thoi gian: {project.durationMonths} thang</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveProjectId(project.id);
                  setActiveCouncilId(null);
                  setActiveProjectSnapshot({ id: project.id, code: project.code, title: project.title, owner: project.owner });
                  setWizardStep(2);
                  document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-button hover:bg-primary-dark"
              >
                Thiết lập Hội đồng
              </button>
            </div>
          ))}
        </div>
        )}
      </section>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-4 space-y-6">
          {wizardStep < 2 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-5 text-sm text-gray-600">
              Chọn một đề tài ở bước 1 để bắt đầu tải file và nhận diện gợi ý hội đồng.
            </div>
          )}

          {wizardStep >= 2 && (
          <div className="bg-white border border-blue-200 rounded-2xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-blue-50 bg-blue-50/50">
              <h3 className="font-bold text-blue-800 text-sm uppercase tracking-tight">AI nhận diện DS Hội đồng</h3>
            </div>
            <div className="p-5 space-y-4 text-center">
              <div className="border-2 border-dashed border-blue-100 rounded-xl p-6 bg-blue-50/20">
                <input
                  ref={councilFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(event) => resetCouncilState(event.target.files?.[0] ?? null)}
                />
                <button type="button" onClick={() => councilFileInputRef.current?.click()} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-button">
                  <span className="text-xl">+</span>
                </button>
                <p className="text-xs font-bold text-gray-700">{councilFile ? councilFile.name : 'Tải file danh sách (PDF/DOCX)'}</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase">Tự động điền 5 thành viên</p>
              </div>

              <button type="button" onClick={handleParseCouncilFile} disabled={councilParseLoading || !councilFile} className="w-full py-2.5 bg-blue-700 text-white text-xs font-bold rounded-xl shadow-button hover:bg-blue-800 disabled:opacity-50">
                {councilParseLoading ? 'Đang xử lý...' : 'Bắt đầu nhận diện'}
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="w-full py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Bỏ qua nhận diện, sang bước 3
              </button>
            </div>
          </div>
          )}

          {wizardStep >= 2 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight">Cảnh báo Chủ nhiệm</h3>
            </div>
            <div className="p-5 space-y-4">
              {(!activeProject && !activeProjectSnapshot) ? (
                <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-xs text-gray-500">
                  Chưa chọn đề tài. Chọn đề tài ở Bước 1 để hiển thị thông tin chủ nhiệm.
                </div>
              ) : (
                <div className="p-4 border border-gray-100 rounded-xl space-y-3 bg-white">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{activeProject?.owner ?? activeProjectSnapshot?.owner ?? 'N/A'}</p>
                      <p className="text-[11px] text-gray-500">{activeProject?.title ?? activeProjectSnapshot?.title ?? 'Đề tài'}</p>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded">CHỦ NHIỆM ĐỀ TÀI</span>
                  </div>

                  <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Chủ nhiệm không thể tham gia hội đồng (COI)
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="col-span-8" id="council-details-section">
          {wizardStep < 3 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-card text-sm text-gray-600">
              Hoàn tất bước 2 (nhận diện) hoặc bấm "Bỏ qua nhận diện" để chuyển sang bước 3 và chốt danh sách hội đồng.
            </div>
          )}

          {wizardStep >= 3 && (
          <div className="card p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Chi tiết thành phần Hội đồng</h3>
            <div className="mb-6 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Đề tài dang chon</p>
              <p className="text-sm font-bold text-gray-900">
                {activeProject ? `${activeProject.code} - ${activeProject.title}` : activeProjectSnapshot ? `${activeProjectSnapshot.code} - ${activeProjectSnapshot.title}` : 'Chưa chọn đề tài'}
              </p>
              {(activeProject || activeProjectSnapshot) && (
                <p className="text-xs text-gray-500 mt-1">Chủ nhiệm: {activeProject?.owner ?? activeProjectSnapshot?.owner ?? 'N/A'}</p>
              )}
            </div>

            <div className="mb-6 rounded-xl border border-info-200 bg-info-50 px-4 py-3">
              <p className="text-xs font-semibold text-info-700">
                Quy tắc nghiệp vụ: tối thiểu 5 thành viên, bắt buộc có Chủ tịch, Phản biện 1, Phản biện 2, Thư ký và không trùng email.
              </p>
              <p className="text-xs text-gray-700 mt-1">
                Vai tro hien tai: Chu tich {roleCounts.chu_tich}, PB1 {roleCounts.phan_bien_1}, PB2 {roleCounts.phan_bien_2}, Thu ky {roleCounts.thu_ky}, Uy vien {roleCounts.uy_vien}.
              </p>
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
                        <input type="text" value={member.title || ''} onChange={(event) => setMembers(members.map((item, index) => index === idx ? { ...item, title: event.target.value, hocHamHocVi: event.target.value } : item))} className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" placeholder="Nhập học hàm/học vị" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" value={ROLE_LABELS[member.role]} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="email" value={member.email || ''} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {removedMemberIndexes.includes(idx) ? (
                          <span className="text-[10px] font-bold text-red-500 uppercase">Đã gỡ</span>
                        ) : (
                          <button type="button" onClick={() => handleRemoveMember(idx)} className="text-gray-400 hover:text-red-500 font-bold text-[10px] uppercase">Gỡ thành viên</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="px-4 py-4">
                      <button type="button" onClick={() => setIsModalOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-[#1E40AF] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                        + Thêm thành viên mới
                      </button>
                      <button type="button" onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2 text-xs font-bold w-full">
                        Xuất file
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Biểu mẫu liên quan</p>
              <p className="text-xs text-blue-800">Mở trang quản lý biểu mẫu để xem/sửa biểu mẫu theo vai trò của thành viên trong hội đồng.</p>
              <button type="button" onClick={() => { window.location.href = '/research-staff/template-management'; }} className="mt-2 text-xs font-bold text-primary hover:underline">
                Mở biểu mẫu liên quan
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Quyết định thành lập (.pdf)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/50">
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 font-bold text-xs mb-4">UP</div>
                <input ref={decisionInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => setDecisionFile(event.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => decisionInputRef.current?.click()} className="bg-white border border-gray-200 px-6 py-2 text-xs font-bold text-primary rounded-xl mb-2 shadow-card">
                  Chọn tệp tin
                </button>
                <p className="text-[11px] text-gray-400 font-medium">hoặc kéo thả vào đây (Tối đa 10MB)</p>
                {decisionFile && <p className="text-xs text-gray-600 font-bold mt-2">Đã chọn: {decisionFile.name}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleCreateCouncil} disabled={loading} className="btn-primary text-xs px-8 py-3">
                {loading ? 'Đang xử lý...' : 'Phê duyệt & Ban hành'}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {wizardStep >= 3 && (
        <div className="sticky bottom-3 z-30 bg-white/95 border border-gray-200 rounded-2xl p-3 shadow-card flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={saveDraft}
            className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            Lưu nháp
          </button>
          <button
            type="button"
            onClick={handleCreateCouncil}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Ban hành'}
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" /> Hội đồng đã thành lập gần đây
          </h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Số quyết định', 'Tên đề tài', 'Ngày lập', 'Trạng thái', 'Thao tác'].map((header) => (
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
                      <button type="button" onClick={() => loadCouncilDetail(council.id, false)} className="text-[10px] font-bold text-primary-700 hover:text-primary-900">Xem</button>
                      <button type="button" onClick={() => loadCouncilDetail(council.id, true)} className="text-[10px] font-bold text-primary-700 hover:text-primary-900">Sửa</button>
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const result = await councilService.resendInvitations(council.id);
                            showToast(`Đã gửi mail cho ${result.sent} thành viên.`, 'success');
                            pushActivity(`Gửi lại email mời họp cho hội đồng ${council.decisionCode} (${result.sent} người).`, 'user');
                          } catch (error) {
                            console.error(error);
                            showToast(typeof error === 'string' ? error : 'Gửi mail thất bại.', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-[10px] font-bold text-primary-700 hover:text-primary-900"
                      >
                        Gửi mail
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {credentialExports.length > 0 && (
        <section className="card animate-fade-up-delay-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Credential CSV Gần Đây</h3>
              <p className="text-xs text-gray-500 mt-1">Chỉ lưu trong phiên hiện tại, tải lại trang sẽ mất dữ liệu này.</p>
            </div>
            <button
              type="button"
              onClick={() => setCredentialExports([])}
              className="btn-secondary text-xs"
            >
              Xóa lịch sử
            </button>
          </div>
          <div className="space-y-3">
            {credentialExports.map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-4 border border-amber-100 rounded-lg px-4 py-3 bg-amber-50/40">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{record.fileName}</p>
                  <p className="text-xs text-gray-600 mt-1">Hội đồng {record.decisionCode} • {record.count} tài khoản mới • {new Date(record.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadBase64Csv(record.csvBase64, record.fileName);
                    showToast('Đã tải lại CSV credentials.', 'success');
                  }}
                  className="btn-primary text-xs"
                >
                  Tải lại CSV
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card animate-fade-up-delay-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Audit Trail Hoạt động</h3>
          <div className="flex items-center gap-2">
            <span className="badge badge-primary text-[10px]">{auditTrail.length} sự kiện</span>
            <button type="button" onClick={handleExportAuditTrail} className="btn-secondary text-xs">
              Xuất CSV
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {auditTrail.length === 0 && (
            <p className="text-sm text-gray-500">Chưa có sự kiện gần đây.</p>
          )}
          {auditTrail.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-4 border border-primary-100 rounded-lg px-4 py-3 bg-white">
              <div>
                <p className="text-sm font-semibold text-gray-900">{event.message}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(event.at).toLocaleString('vi-VN')}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${event.category === 'user' ? 'bg-info-50 text-info-700' : 'bg-gray-100 text-gray-700'}`}>
                {event.category === 'user' ? 'người dùng' : 'hệ thống'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-[500px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Thêm thành viên Hội đồng</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold">x</button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Họ và tên</label>
                <input required type="text" value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="Nhập tên thành viên..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vai trò</label>
                <select value={newMember.role} onChange={(event) => setNewMember({ ...newMember, role: event.target.value as CouncilMember['role'] })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]">
                  <option value="chu_tich">Chủ tịch</option>
                  <option value="phan_bien_1">Phản biện 1</option>
                  <option value="phan_bien_2">Phản biện 2</option>
                  <option value="thu_ky">Thư ký</option>
                  <option value="uy_vien">Ủy viên</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                <input required type="email" value={newMember.email} onChange={(event) => setNewMember({ ...newMember, email: event.target.value })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="email@domain.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Học hàm / Học vị</label>
                <input value={newMember.title ?? ''} onChange={(event) => setNewMember({ ...newMember, title: event.target.value, hocHamHocVi: event.target.value })} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="Ví dụ: GS.TS., PGS.TS., TS..." />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold border rounded-xl text-gray-600 hover:bg-gray-50">Hủy</button>
                <button disabled={loading} type="submit" className="px-6 py-2.5 text-sm font-bold bg-[#1E40AF] text-white rounded-xl shadow-md hover:bg-blue-800">{loading ? 'ĐANG KIỂM TRA...' : 'Lưu thành viên'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilCreationPage;
