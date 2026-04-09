import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import type { Contract, Project } from '../../types';
import { contractService } from '../../services/api/contractService';
import { projectService } from '../../services/api/projectService';

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
    <div class="box"><strong>ĐẠI DIỆN BÊN B</strong><br/><i>(Ký, ghi rõ họ tên)</i><br/>${escapeHtml(partyB || '')}</div>
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

const ContractManagementPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [agencyName, setAgencyName] = useState('Đại học Khoa học và Công nghệ');
  const [partyARepresentative, setPartyARepresentative] = useState('');
  const [budgetOverride, setBudgetOverride] = useState<number | ''>('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [contractPage, setContractPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const [contractsRes, projectsRes] = await Promise.all([
      contractService.getAll(),
      projectService.getAll(),
    ]);
    setContracts(contractsRes);
    setProjects(projectsRes);
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
  const effectiveBudget = typeof budgetOverride === 'number' ? budgetOverride : (selectedProject?.budget ?? 0);
  const budgetBase = selectedProject?.budget ?? 0;
  const budgetDiffRatio = budgetBase > 0 ? Math.abs(effectiveBudget - budgetBase) / budgetBase : 0;
  const budgetDiffAlert = budgetDiffRatio >= 0.2;
  const canCreateContract = Boolean(
    selectedProject &&
    agencyName.trim() &&
    partyARepresentative.trim() &&
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
    if (!selectedContractId || !uploadFile) return;
    setLoading(true);
    try {
      await contractService.uploadPdf(selectedContractId, uploadFile);
      await refresh();
      showToast('Tải lên thành công!', 'success');
      setUploadFile(null);
    } catch (e) {
      showToast('Lỗi tải lên.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
                    <p className="font-bold">BÊN A: {agencyName}</p>
                    <p className="font-bold">BÊN B: {selectedProject?.owner || '[Chủ nhiệm]'}</p>
                    <p className="text-gray-600 italic">Giá trị: {formatCurrency(effectiveBudget)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
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
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 px-6 py-4 border-b border-gray-200">Tải lên PDF đã ký</h2>
            <div className="p-6 space-y-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="form-input text-sm"
              />
              <select
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
                className="form-input"
              >
                <option value="">Chọn hợp đồng...</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.code} - {c.owner}</option>)}
              </select>
              <button onClick={handleUploadPdf} disabled={loading} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-colors">TẢI LÊN</button>
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
                {detailContract.pdfUrl && <a href={detailContract.pdfUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs">MỞ PDF</a>}
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
