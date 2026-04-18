import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import type { Contract, Project } from '../../types';
import { contractService } from '../../services/api/contractService';
import { projectService } from '../../services/api/projectService';
import { templateService } from '../../services/api/templateService';

type ToastType = 'success' | 'error';
const CONTRACT_DRAFT_KEY = 'research_staff_contract_draft';
const CONTRACT_TABLE_PAGE_SIZE = 40;

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} VNĐ`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toContractWordHtml = (input: {
  contractCode: string;
  projectCode: string;
  projectTitle: string;
  owner: string;
  ownerTitle?: string;
  ownerEmail?: string;
  agencyName?: string;
  representative?: string;
  budget: number;
  signedDate?: string;
  notes?: string;
}) => {
  const partyB = `${input.ownerTitle ? `${input.ownerTitle} ` : ''}${input.owner}`.trim();
  const today = new Date().toLocaleDateString('vi-VN');
  const partyBRepresentative = partyB || 'Chủ nhiệm đề tài';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Hợp đồng ${escapeHtml(input.contractCode)}</title>
  <style>
    body { font-family: "Times New Roman", serif; line-height: 1.55; margin: 36px; color: #111; }
    .center { text-align: center; }
    .title { font-size: 20px; font-weight: 700; margin: 18px 0 4px; text-transform: uppercase; }
    .muted { color: #555; font-style: italic; margin-bottom: 18px; }
    .section { margin: 10px 0; }
    .label { font-weight: 700; }
    .table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .table td { border: 1px solid #222; padding: 8px; vertical-align: top; }
    .sign { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign .box { text-align: center; min-height: 110px; }
  </style>
</head>
<body>
  <div class="center">
    <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
    <div><strong>Độc lập - Tự do - Hạnh phúc</strong></div>
    <div class="title">HỢP ĐỒNG NGHIÊN CỨU KHOA HỌC</div>
    <div class="muted">Số: ${escapeHtml(input.contractCode)}/HD-NCKH</div>
  </div>

  <div class="section"><span class="label">Bên A:</span> ${escapeHtml(input.agencyName || 'Trường/Cơ quan quản lý đề tài')}.</div>
  <div class="section"><span class="label">Bên B:</span> ${escapeHtml(partyB || 'Chủ nhiệm đề tài')} (${escapeHtml(input.ownerEmail ?? 'chưa cập nhật email')})</div>
  <div class="section"><span class="label">Đại diện Bên B:</span> ${escapeHtml(partyBRepresentative)}</div>

  <table class="table">
    <tr><td class="label">Mã đề tài</td><td>${escapeHtml(input.projectCode)}</td></tr>
    <tr><td class="label">Tên đề tài</td><td>${escapeHtml(input.projectTitle)}</td></tr>
    <tr><td class="label">Giá trị hợp đồng</td><td>${escapeHtml(formatCurrency(input.budget))}</td></tr>
    <tr><td class="label">Ngày lập</td><td>${escapeHtml(today)}</td></tr>
    <tr><td class="label">Ngày ký</td><td>${escapeHtml(input.signedDate ?? 'Chưa ký')}</td></tr>
    <tr><td class="label">Ghi chú</td><td>${escapeHtml(input.notes ?? 'Không')}</td></tr>
  </table>

  <div class="section">Điều khoản cơ bản: Bên B thực hiện đề tài đúng tiến độ, báo cáo theo quy định và chịu trách nhiệm về tính trung thực khoa học.</div>

  <div class="sign">
    <div class="box"><strong>ĐẠI DIỆN BÊN A</strong><br/><i>(Ký, ghi rõ họ tên)</i><br/>${escapeHtml(input.representative || '')}</div>
    <div class="box"><strong>ĐẠI DIỆN BÊN B</strong><br/><i>(Ký, ghi rõ họ tên)</i><br/>${escapeHtml(partyBRepresentative)}</div>
  </div>
</body>
</html>`;
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// BroadcastChannel to notify project_owner ContractViewPage of updates
const contractUpdateChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('contract_updates')
  : null;

const ContractManagementPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [agencyName, setAgencyName] = useState('Đại học Khoa học và Công nghệ');
  const [partyARepresentative, setPartyARepresentative] = useState('');
  const [budgetOverride, setBudgetOverride] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  // --- Adjust-contract panel state ---
  const [adjustContractId, setAdjustContractId] = useState('');
  const [adjustFile, setAdjustFile] = useState<File | null>(null);
  const [adjustAgencyName, setAdjustAgencyName] = useState('');
  const [adjustRepresentative, setAdjustRepresentative] = useState('');
  const [adjustBudget, setAdjustBudget] = useState<number | ''>('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  // ------------------------------------
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [contractPage, setContractPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [defaultContractTemplateId, setDefaultContractTemplateId] = useState('');

  const refresh = async () => {
    const [contractsRes, projectsRes, templateRes] = await Promise.all([
      contractService.getAll(),
      projectService.getAll(),
      templateService.getAll('contract_template').catch(() => []),
    ]);

    const contractRoleTemplates = templateRes.filter((t) => t.role === 'hop_dong');
    const defaultTemplate = contractRoleTemplates.find((t) => t.is_default) ?? contractRoleTemplates[0];

    setContracts(contractsRes);
    setProjects(projectsRes);
    setDefaultContractTemplateId(defaultTemplate?.id ?? '');
  };

  useEffect(() => {
    refresh().catch((e) => {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Không thể tải dữ liệu hợp đồng.', 'error');
    });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTRACT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        selectedProjectId?: string;
        budgetOverride?: number | null;
      };
      if (draft.selectedProjectId) setSelectedProjectId(draft.selectedProjectId);
      if (typeof draft.budgetOverride === 'number') setBudgetOverride(draft.budgetOverride);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (contracts.length === 0) {
      if (selectedContractId) setSelectedContractId('');
      return;
    }

    const selectedExists = contracts.some((contract) => contract.id === selectedContractId);
    if (!selectedContractId || !selectedExists) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const keyword = search.trim().toLowerCase();
  const filtered = useMemo(
    () => contracts.filter(c =>
      c.code.toLowerCase().includes(keyword) ||
      c.owner.toLowerCase().includes(keyword) ||
      c.projectCode.toLowerCase().includes(keyword) ||
      c.projectTitle.toLowerCase().includes(keyword)
    ),
    [contracts, keyword],
  );

  useEffect(() => {
    setContractPage(1);
  }, [keyword]);

  const contractTotalPages = Math.max(1, Math.ceil(filtered.length / CONTRACT_TABLE_PAGE_SIZE));
  const safeContractPage = Math.min(contractPage, contractTotalPages);
  const pagedContracts = useMemo(
    () => filtered.slice((safeContractPage - 1) * CONTRACT_TABLE_PAGE_SIZE, safeContractPage * CONTRACT_TABLE_PAGE_SIZE),
    [filtered, safeContractPage],
  );

  const total = contracts.length;
  const active = contracts.filter(c => c.status === 'da_ky').length;
  const pending = contracts.filter(c => c.status === 'cho_duyet').length;
  const completed = contracts.filter(c => c.status === 'hoan_thanh').length;

  const activeContractsByProject = new Set(
    contracts.filter(c => c.status !== 'huy').map((c: any) => c.projectId).filter(Boolean)
  );
  const eligibleProjects = projects.filter((p) => !activeContractsByProject.has(p.id));

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const selectedProjectOwnerLabel = selectedProject
    ? `${selectedProject.ownerTitle ? `${selectedProject.ownerTitle} ` : ''}${selectedProject.owner}`.trim()
    : '[Chủ nhiệm]';
  const selectedUploadContract = contracts.find((contract) => contract.id === selectedContractId) || contracts[0] || null;
  const canUploadPdf = Boolean(selectedUploadContract && uploadFile && !loading);
  const effectiveBudget = typeof budgetOverride === 'number' ? budgetOverride : (selectedProject?.budget ?? 0);
  const budgetBase = selectedProject?.budget ?? 0;
  const budgetDiffRatio = budgetBase > 0 ? Math.abs(effectiveBudget - budgetBase) / budgetBase : 0;
  const budgetDiffAlert = budgetDiffRatio >= 0.2;
  const canCreateContract = Boolean(
    selectedProject &&
    agencyName.trim() &&
    partyARepresentative.trim() &&
    defaultContractTemplateId &&
    Number.isFinite(effectiveBudget) &&
    effectiveBudget > 0
  );

  useEffect(() => {
    if (!selectedProjectId && eligibleProjects.length > 0) {
      setSelectedProjectId(eligibleProjects[0].id);
    }
  }, [eligibleProjects, selectedProjectId]);

  const exportWord = (payload: any, filename: string) => {
    const html = toContractWordHtml(payload);
    saveBlob(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }), filename);
  };

  const handleExportContractDraft = () => {
    if (!selectedProject) {
      showToast('Vui lòng chọn đề tài.', 'error');
      return;
    }
    exportWord({
      contractCode: 'NHAP',
      projectCode: selectedProject.code,
      projectTitle: selectedProject.title,
      owner: selectedProject.owner,
      ownerTitle: selectedProject.ownerTitle,
      ownerEmail: selectedProject.ownerEmail,
      agencyName,
      representative: partyARepresentative,
      budget: effectiveBudget,
      notes: 'Ký kết trực tiếp qua cổng quản lý.',
    }, `HopDong_Nhap_${selectedProject.code}.doc`);
    showToast('Đã xuất nháp Word.', 'success');
  };

  const handleExportDefaultTemplateDraft = async () => {
    if (!selectedProject) {
      showToast('Vui lòng chọn đề tài.', 'error');
      return;
    }
    if (!defaultContractTemplateId) {
      showToast('Chưa có template hợp đồng mặc định. Vào Quản lý Biểu mẫu để tải lên trước.', 'error');
      return;
    }

    setLoading(true);
    try {
      await templateService.fill(defaultContractTemplateId, selectedProject.id);
      showToast('Đã tải nháp từ template hợp đồng mặc định.', 'success');
    } catch (error) {
      showToast('Không thể tải nháp từ template mặc định.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const target = filtered.find(c => c.id === selectedContractId) || detailContract || filtered[0];
    if (!target) return;
    try {
      await contractService.exportExcel(target.id, `HopDong_${target.code}.xlsx`);
      showToast(`Đã xuất Excel hợp đồng ${target.code}.`, 'success');
    } catch (err) {
      showToast('Lỗi xuất Excel.', 'error');
    }
  };

  const handleOpenDetail = async (id: string) => {
    setLoading(true);
    try {
      const detail = await contractService.getById(id);
      if (detail) setDetailContract(detail);
    } catch (e) {
      showToast('Không tải được chi tiết.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDetailTemplate = () => {
    if (!detailContract) return;
    exportWord({
      contractCode: detailContract.code,
      projectCode: detailContract.projectCode,
      projectTitle: detailContract.projectTitle,
      owner: detailContract.owner,
      ownerTitle: detailContract.ownerTitle,
      ownerEmail: detailContract.ownerEmail,
      agencyName: (detailContract as any).agencyName,
      representative: (detailContract as any).representative,
      budget: detailContract.budget,
      signedDate: detailContract.signedDate,
      notes: detailContract.notes,
    }, `HopDong_${detailContract.code}.doc`);
  };

  const handleCreateContract = async () => {
    if (!selectedProject) {
      showToast('Vui lòng chọn đề tài để tạo hợp đồng.', 'error');
      return;
    }
    if (!agencyName.trim()) {
      showToast('Vui lòng nhập cơ quan quản lý bên A.', 'error');
      return;
    }
    if (!partyARepresentative.trim()) {
      showToast('Vui lòng nhập đại diện bên A.', 'error');
      return;
    }
    if (!Number.isFinite(effectiveBudget) || effectiveBudget <= 0) {
      showToast('Ngân sách hợp đồng phải lớn hơn 0.', 'error');
      return;
    }
    setLoading(true);
    try {
      await contractService.create({
        projectId: selectedProject.id,
        budget: effectiveBudget,
        agencyName,
        representative: partyARepresentative,
        notes: 'Ký kết trực tiếp qua cổng quản lý.',
      });
      await refresh();
      showToast('Đã tạo hợp đồng!', 'success');
      setSelectedProjectId('');
      setBudgetOverride('');
      setPartyARepresentative('');
    } catch (e) {
      showToast('Tạo hợp đồng thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(CONTRACT_DRAFT_KEY, JSON.stringify({ selectedProjectId, budgetOverride }));
    showToast('Đã lưu nháp.', 'success');
  };

  const handleUploadPdf = async () => {
    if (!selectedUploadContract) {
      showToast('Vui lòng chọn hợp đồng trước khi tải PDF.', 'error');
      return;
    }
    if (!uploadFile) {
      showToast('Vui lòng chọn file PDF đã ký trước khi tải lên.', 'error');
      return;
    }
    setLoading(true);
    try {
      await contractService.uploadPdf(selectedUploadContract.id, uploadFile);
      await refresh();
      contractUpdateChannel?.postMessage({ type: 'pdf_updated', contractId: selectedUploadContract.id });
      showToast('Tải lên thành công!', 'success');
      setUploadFile(null);
    } catch (e) {
      showToast('Lỗi tải lên.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Adjust-contract handlers ──────────────────────────────────────────────
  const handleAdjustContractSelect = (id: string) => {
    setAdjustContractId(id);
    const contract = contracts.find((c) => c.id === id);
    if (!contract) return;
    setAdjustAgencyName((contract as any).agencyName ?? '');
    setAdjustRepresentative((contract as any).representative ?? '');
    setAdjustBudget(contract.budget || '');
    setAdjustNotes(contract.notes ?? '');
    setAdjustFile(null);
  };

  const handleSaveAdjust = async () => {
    const target = contracts.find((c) => c.id === adjustContractId);
    if (!target) {
      showToast('Vui lòng chọn hợp đồng cần điều chỉnh.', 'error');
      return;
    }
    if (!adjustFile) {
      showToast('Vui lòng chọn file PDF mới để thay thế.', 'error');
      return;
    }
    setAdjustLoading(true);
    try {
      // Upload new PDF — backend will delete the old file automatically
      await contractService.uploadPdf(target.id, adjustFile);
      // Update status / notes if the service exposes it — for now just refresh
      await refresh();
      // Notify project_owner screen
      contractUpdateChannel?.postMessage({ type: 'pdf_updated', contractId: target.id });
      showToast(`Đã cập nhật PDF hợp đồng ${target.code}. Bản cũ đã bị xóa.`, 'success');
      setAdjustFile(null);
    } catch (e) {
      showToast('Lỗi khi lưu điều chỉnh.', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-bold animate-fade-up ${toast.type === 'error' ? 'bg-error-500' : 'bg-success-500'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ký kết Hợp đồng</h1>
        <p className="text-gray-600 text-sm mt-2">Lập hợp đồng mới, nhập thông tin Bên A và quản lý tệp ký chính thức.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up-delay-1">
        {[
          ['Tổng hợp đồng', total, 'badge-neutral'],
          ['Đang thực hiện', active, 'badge-info'],
          ['Chờ ký duyệt', pending, 'badge-warning'],
          ['Hoàn thành', completed, 'badge-success']
        ].map(([label, val, badge]) => (
          <div key={label as string} className="card motion-hover-lift">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{label}</p>
            <p className="text-4xl font-bold text-gray-900">{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card animate-fade-up-delay-1">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Tạo Hợp đồng Mới</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn đề tài</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="form-input"
                >
                  <option value="">-- Chọn đề tài --</option>
                  {eligibleProjects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.title}</option>)}
                </select>
                {selectedProject && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Chi tiết Đề tài (Từ Đề xuất)</p>
                    <p className="text-sm font-bold text-gray-900">{selectedProject.code} - {selectedProject.title}</p>
                    <p className="text-xs text-gray-700">
                      <strong>Chủ nhiệm:</strong> {selectedProject.ownerTitle ? `${selectedProject.ownerTitle} ` : ''}{selectedProject.owner} {selectedProject.ownerEmail ? `(${selectedProject.ownerEmail})` : ''}
                    </p>
                    <p className="text-xs text-gray-700">
                      <strong>Kinh phí NS:</strong> {selectedProject.budget ? `${selectedProject.budget.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cơ quan quản lý (Bên A)</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={e => setAgencyName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Đại diện Bên A</label>
                  <input
                    type="text"
                    value={partyARepresentative}
                    onChange={e => setPartyARepresentative(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {budgetDiffAlert && (
                <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
                  <p className="text-xs font-semibold text-warning-700">
                    Ngân sách đang lệch từ 20% trở lên so với đề xuất ban đầu. Vui lòng kiểm tra lại trước khi tạo hợp đồng.
                  </p>
                </div>
              )}

              {!defaultContractTemplateId && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700">
                    Chưa có template hợp đồng mặc định. Vui lòng vào Quản lý Biểu mẫu, tải file mẫu với Loại biểu mẫu = contract_template và Vai trò áp dụng = Hợp đồng rồi quay lại tạo hợp đồng.
                  </p>
                </div>
              )}

              <div className="card p-0">
                <label className="block px-6 py-4 text-sm font-semibold text-gray-700 border-b border-gray-200">Ngân sách (VNĐ)</label>
                <input
                  type="number"
                  value={budgetOverride !== '' ? budgetOverride : (selectedProject?.budget ?? '')}
                  onChange={e => setBudgetOverride(e.target.value === '' ? '' : Number(e.target.value))}
                  className="form-input rounded-none"
                />
              </div>

              <div className="bg-gray-100 rounded-lg border border-gray-300 p-6">
                <div className="bg-white border border-gray-300 p-6 min-h-64 text-[11px] leading-relaxed shadow-sm rounded">
                  <div className="text-center mb-4 font-bold uppercase">Hợp đồng Nghiên cứu Khoa học</div>
                  <div className="space-y-3">
                    <p className="font-bold">BÊN A: {agencyName || '[Chưa nhập]'}</p>
                    <p className="text-gray-700"><strong>Đại diện Bên A:</strong> {partyARepresentative || '[Chưa nhập]'}</p>
                    <p className="font-bold">BÊN B: {selectedProjectOwnerLabel}</p>
                    <p className="text-gray-700">
                      <strong>Đề tài:</strong> {selectedProject ? `${selectedProject.code} - ${selectedProject.title}` : '[Chưa chọn đề tài]'}
                    </p>
                    <p className="text-gray-600 italic">Giá trị: {formatCurrency(effectiveBudget)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { void handleExportDefaultTemplateDraft(); }} disabled={loading || !selectedProject || !defaultContractTemplateId} className="btn-secondary">
                TẢI NHÁP TỪ TEMPLATE MẶC ĐỊNH
              </button>
              <button onClick={handleExportContractDraft} className="btn-secondary">XUẤT NHÁP WORD</button>
              <button onClick={handleSaveDraft} className="btn-secondary">LƯU NHÁP</button>
              <button onClick={handleCreateContract} disabled={loading || !canCreateContract} className="btn-primary uppercase">TẠO HỢP ĐỒNG</button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Danh sách Hợp đồng ({filtered.length}{filtered.length > 0 ? ` • Trang ${safeContractPage}/${contractTotalPages}` : ''})</h2>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="form-input text-xs"
                  placeholder="Tìm kiếm..."
                />
                <button onClick={handleExportExcel} className="btn-secondary text-xs">XUẤT EXCEL</button>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Mã HĐ</th>
                  <th className="px-6 py-3">Đề tài</th>
                  <th className="px-6 py-3">Chủ nhiệm</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedContracts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{c.code}</td>
                    <td className="px-6 py-4 text-xs text-gray-700">{c.projectCode} - {c.projectTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{c.owner}</td>
                    <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenDetail(c.id)} className="text-[10px] font-bold text-primary-600 uppercase hover:text-primary-700">Chi tiết</button>
                    </td>
                  </tr>
                ))}
                {pagedContracts.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-400" colSpan={5}>Chưa có hợp đồng phù hợp bộ lọc.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {filtered.length > CONTRACT_TABLE_PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setContractPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeContractPage === 1}
                  className="btn-secondary text-xs disabled:opacity-50"
                >
                  Trang trước
                </button>
                <span className="text-xs font-semibold text-gray-600 px-3">{safeContractPage} / {contractTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setContractPage((prev) => Math.min(contractTotalPages, prev + 1))}
                  disabled={safeContractPage === contractTotalPages}
                  className="btn-secondary text-xs disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* ── Adjust Contract Panel ── */}
          <div className="card border-2 border-primary-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-primary-50">
              <h2 className="text-lg font-bold text-primary-800">🔄 Điều chỉnh Hợp đồng</h2>
              <p className="text-xs text-primary-600 mt-1">Chọn hợp đồng để tự đổ thông tin, chỉnh sửa rồi lưu PDF mới (bản cũ sẽ bị xóa và đồng bộ qua màn hình Chủ nhiệm).</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Chọn hợp đồng cần điều chỉnh</label>
                <select
                  value={adjustContractId}
                  onChange={(e) => handleAdjustContractSelect(e.target.value)}
                  className="form-input text-sm"
                >
                  <option value="">-- Chọn hợp đồng --</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.projectCode} · {c.owner}
                    </option>
                  ))}
                </select>
              </div>

              {adjustContractId && (
                <>
                  <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-xs text-primary-900 space-y-1">
                    <p className="font-bold text-sm">{contracts.find((c) => c.id === adjustContractId)?.code}</p>
                    <p>Đề tài: {contracts.find((c) => c.id === adjustContractId)?.projectCode} · {contracts.find((c) => c.id === adjustContractId)?.projectTitle}</p>
                    <p>Chủ nhiệm: {contracts.find((c) => c.id === adjustContractId)?.owner}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cơ quan quản lý (Bên A)</label>
                      <input
                        type="text"
                        value={adjustAgencyName}
                        onChange={(e) => setAdjustAgencyName(e.target.value)}
                        className="form-input text-sm"
                        placeholder="Tên cơ quan..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Đại diện Bên A</label>
                      <input
                        type="text"
                        value={adjustRepresentative}
                        onChange={(e) => setAdjustRepresentative(e.target.value)}
                        className="form-input text-sm"
                        placeholder="Họ và tên..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Ngân sách (VNĐ)</label>
                      <input
                        type="number"
                        value={adjustBudget}
                        onChange={(e) => setAdjustBudget(e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-input text-sm"
                        placeholder="Nhập ngân sách..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú</label>
                      <textarea
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        className="form-input text-sm resize-none"
                        rows={2}
                        placeholder="Ghi chú điều chỉnh..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">📎 File PDF mới (thay thế bản cũ)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setAdjustFile(e.target.files?.[0] ?? null)}
                      className="form-input text-sm"
                    />
                    {adjustFile && (
                      <p className="text-[11px] text-green-700 mt-1">✓ Đã chọn: {adjustFile.name}</p>
                    )}
                  </div>

                  <button
                    onClick={handleSaveAdjust}
                    disabled={adjustLoading || !adjustFile}
                    className="w-full py-3 bg-primary-600 text-white rounded-lg text-sm font-bold uppercase hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adjustLoading ? '⏳ ĐANG LƯU...' : '💾 LƯU & THAY THẾ PDF'}
                  </button>
                  <p className="text-[11px] text-gray-500 text-center">
                    Bản PDF cũ sẽ bị xóa khỏi server và đồng bộ ngay qua màn hình Chủ nhiệm.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Quick Upload Panel ── */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 px-6 py-4 border-b border-gray-200">Tải lên PDF đã ký</h2>
            <div className="p-6 space-y-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="form-input text-sm"
              />
              {contracts.length > 1 ? (
                <select
                  value={selectedContractId}
                  onChange={e => setSelectedContractId(e.target.value)}
                  className="form-input"
                >
                  <option value="">Chọn hợp đồng...</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.code} - {c.owner}</option>)}
                </select>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {contracts[0] ? (
                    <>
                      <span className="font-semibold">Hợp đồng đang chọn:</span> {contracts[0].code} - {contracts[0].owner}
                    </>
                  ) : (
                    'Chưa có hợp đồng để tải PDF.'
                  )}
                </div>
              )}
              {selectedUploadContract && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 space-y-1">
                  <p className="font-semibold">{selectedUploadContract.code}</p>
                  <p className="text-xs">Đề tài: {selectedUploadContract.projectCode} - {selectedUploadContract.projectTitle}</p>
                  <p className="text-xs">Bên B: {selectedUploadContract.owner}</p>
                  <p className="text-xs">Trạng thái: {selectedUploadContract.status}</p>
                </div>
              )}
              <button
                onClick={handleUploadPdf}
                disabled={!canUploadPdf}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'ĐANG TẢI LÊN...' : 'TẢI LÊN PDF ĐÃ KÝ'}
              </button>
              <p className="text-[11px] text-gray-500 text-center">
                Chọn file PDF đã ký và hợp đồng cần gắn file, rồi bấm nút này để upload.
              </p>
            </div>
          </div>
        </div>
      </div>

      {detailContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{detailContract.code}</h3>
              <button onClick={() => setDetailContract(null)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">Đóng</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700"><strong>Đề tài:</strong> {detailContract.projectTitle}</p>
              <p className="text-gray-700"><strong>Chủ nhiệm:</strong> {detailContract.owner}</p>
              <p className="text-gray-700"><strong>Ngân sách:</strong> {formatCurrency(detailContract.budget)}</p>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => contractService.previewPdf(detailContract.id).catch((error) => showToast(error instanceof Error ? error.message : 'Không thể xem PDF.', 'error'))}
                  className="btn-primary text-xs"
                >
                  Xem PDF
                </button>
                {detailContract.pdfUrl && <a href={detailContract.pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">Mở PDF đã tải lên</a>}
                <button onClick={handleExportDetailTemplate} className="btn-secondary text-xs">TẢI MẪU WORD</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManagementPage;
