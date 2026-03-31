import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import type { Contract } from '../../types';
import type { Project } from '../../types';
import { contractService } from '../../services/api/contractService';
import type { ParsedContractProposal } from '../../services/api/contractService';
import { projectService } from '../../services/api/projectService';

type ToastType = 'success' | 'error';
type ProposalMode = 'manual_email' | 'upload_autodetect';

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} VNĐ`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const csvCell = (value: string | number | undefined) => {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
};

const toContractWordHtml = (input: {
  contractCode: string;
  projectCode: string;
  projectTitle: string;
  owner: string;
  ownerTitle?: string;
  ownerEmail?: string;
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
  <title>Hop dong ${escapeHtml(input.contractCode)}</title>
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
    <div><strong>CONG HOA XA HOI CHU NGHIA VIET NAM</strong></div>
    <div><strong>Doc lap - Tu do - Hanh phuc</strong></div>
    <div class="title">HOP DONG NGHIEN CUU KHOA HOC</div>
    <div class="muted">So: ${escapeHtml(input.contractCode)}/HD-NCKH</div>
  </div>

  <div class="section"><span class="label">Ben A:</span> Truong/Co quan quan ly de tai.</div>
  <div class="section"><span class="label">Ben B:</span> ${escapeHtml(partyB || 'Chu nhiem de tai')} (${escapeHtml(input.ownerEmail ?? 'chua cap nhat email')})</div>

  <table class="table">
    <tr><td class="label">Ma de tai</td><td>${escapeHtml(input.projectCode)}</td></tr>
    <tr><td class="label">Ten de tai</td><td>${escapeHtml(input.projectTitle)}</td></tr>
    <tr><td class="label">Gia tri hop dong</td><td>${escapeHtml(formatCurrency(input.budget))}</td></tr>
    <tr><td class="label">Ngay lap</td><td>${escapeHtml(today)}</td></tr>
    <tr><td class="label">Ngay ky</td><td>${escapeHtml(input.signedDate ?? 'Chua ky')}</td></tr>
    <tr><td class="label">Ghi chu</td><td>${escapeHtml(input.notes ?? 'Khong')}</td></tr>
  </table>

  <div class="section">Dieu khoan co ban: Ben B thuc hien de tai dung tien do, bao cao theo quy dinh va chiu trach nhiem ve tinh trung thuc khoa hoc.</div>

  <div class="sign">
    <div class="box"><strong>DAI DIEN BEN A</strong><br/><i>(Ky, ghi ro ho ten)</i></div>
    <div class="box"><strong>DAI DIEN BEN B</strong><br/><i>(Ky, ghi ro ho ten)</i><br/>${escapeHtml(partyB || '')}</div>
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
  const [proposalMode, setProposalMode] = useState<ProposalMode>('manual_email');
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [proposalParsed, setProposalParsed] = useState<ParsedContractProposal | null>(null);
  const [proposalParseLoading, setProposalParseLoading] = useState(false);
  const [budgetOverride, setBudgetOverride] = useState<number | ''>('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
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

  const keyword = search.trim().toLowerCase();
  const filtered = contracts.filter(c =>
    c.code.toLowerCase().includes(keyword) ||
    c.owner.toLowerCase().includes(keyword) ||
    c.projectCode.toLowerCase().includes(keyword) ||
    c.projectTitle.toLowerCase().includes(keyword)
  );

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const total = contracts.length;
  const active = contracts.filter(c => c.status === 'da_ky').length;
  const pending = contracts.filter(c => c.status === 'cho_duyet').length;
  const completed = contracts.filter(c => c.status === 'hoan_thanh').length;

  const activeContractsByProject = new Set(
    contracts.filter(c => c.status !== 'huy').map((c: any) => c.projectId).filter(Boolean)
  );
  const eligibleProjects = projects.filter((p) => !activeContractsByProject.has(p.id));
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const effectiveBudget = typeof budgetOverride === 'number' ? budgetOverride : selectedProject?.budget ?? 0;

  const exportWord = (payload: {
    contractCode: string;
    projectCode: string;
    projectTitle: string;
    owner: string;
    ownerTitle?: string;
    ownerEmail?: string;
    budget: number;
    signedDate?: string;
    notes?: string;
  }, filename: string) => {
    const html = toContractWordHtml(payload);
    saveBlob(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }), filename);
  };

  const handleExportContractDraft = () => {
    if (!selectedProject) {
      showToast('Vui lòng chọn đề tài để xuất nháp hợp đồng.', 'error');
      return;
    }

    exportWord({
      contractCode: 'NHAP',
      projectCode: selectedProject.code,
      projectTitle: selectedProject.title,
      owner: selectedProject.owner,
      ownerTitle: selectedProject.ownerTitle,
      ownerEmail: selectedProject.ownerEmail,
      budget: selectedProject.budget,
      notes: `Nguồn đề xuất: ${proposalMode === 'manual_email' ? 'Email + nhập tay' : 'Upload file + nhận diện tự động'}`,
    }, `HopDong_Nhap_${selectedProject.code}.doc`);

    showToast('Đã xuất nháp Word đầy đủ Bên A/B.', 'success');
  };

  const handleExportExcel = () => {
    if (!filtered.length) {
      showToast('Không có hợp đồng để xuất.', 'error');
      return;
    }

    const header = [
      'Mã hợp đồng',
      'Mã đề tài',
      'Tên đề tài',
      'Bên A',
      'Bên B',
      'Email chủ nhiệm',
      'Ngân sách (VNĐ)',
      'Trạng thái',
      'Ngày ký',
      'Đường dẫn PDF',
    ];

    const rows = filtered.map((c) => [
      c.code,
      c.projectCode,
      c.projectTitle,
      'Truong/Co quan quan ly de tai',
      `${c.ownerTitle ? `${c.ownerTitle} ` : ''}${c.owner}`.trim(),
      c.ownerEmail ?? '',
      c.budget,
      c.status,
      c.signedDate ?? '',
      c.pdfUrl ?? '',
    ]);

    const csv = ['\ufeff' + header.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `DanhSachHopDong_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Đã xuất Excel (CSV) cho danh sách hợp đồng.', 'success');
  };

  const handleCreateEligibleSampleProject = async () => {
    const ownerSeed = projects.find((p) => p.ownerId);
    if (!ownerSeed?.ownerId) {
      showToast('Chưa có chủ nhiệm đề tài để tạo dữ liệu mẫu đủ điều kiện.', 'error');
      return;
    }

    setBootstrapLoading(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      const stamp = now.toISOString().slice(0, 10);

      const created = await projectService.create({
        title: `Đề tài bổ sung hợp đồng ${stamp}`,
        ownerId: ownerSeed.ownerId,
        ownerTitle: ownerSeed.ownerTitle,
        department: ownerSeed.department || 'Khoa Khoa hoc va Cong nghe',
        field: ownerSeed.field || 'Nghien cuu ung dung',
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        durationMonths: 6,
        budget: 100000000,
        advancedAmount: 0,
      });

      await refresh();
      setSelectedProjectId(created.id);
      showToast(`Đã tạo đề tài mẫu ${created.code}. Có thể lập hợp đồng ngay.`, 'success');
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Không thể tạo đề tài mẫu.', 'error');
    } finally {
      setBootstrapLoading(false);
    }
  };

  const handleParseProposal = async () => {
    if (!proposalFile) {
      showToast('Vui lòng chọn file đề xuất trước khi nhận diện.', 'error');
      return;
    }

    setProposalParseLoading(true);
    try {
      const parsed = await contractService.parseProposal(proposalFile);
      setProposalParsed(parsed);

      if (parsed.suggestedBudget && parsed.suggestedBudget > 0) {
        setBudgetOverride(parsed.suggestedBudget);
      }

      const matchedEligible = eligibleProjects.find((p) => {
        const sameId = parsed.suggestedProjectId ? p.id === parsed.suggestedProjectId : false;
        const sameCode = parsed.projectCode ? p.code.toUpperCase() === parsed.projectCode.toUpperCase() : false;
        return sameId || sameCode;
      });

      if (matchedEligible) {
        setSelectedProjectId(matchedEligible.id);
      }

      showToast(
        matchedEligible
          ? `Nhận diện xong (${parsed.confidence}%). Đã tự chọn đề tài ${matchedEligible.code}.`
          : `Nhận diện xong (${parsed.confidence}%). Vui lòng kiểm tra lại đề tài đề xuất.`,
        'success'
      );
    } catch (e) {
      console.error(e);
      setProposalParsed(null);
      showToast(typeof e === 'string' ? e : 'Không thể nhận diện file đề xuất.', 'error');
    } finally {
      setProposalParseLoading(false);
    }
  };

  const handleOpenDetail = async (contractId: string) => {
    setLoading(true);
    try {
      const detail = await contractService.getById(contractId);
      if (!detail) {
        showToast('Không tìm thấy chi tiết hợp đồng.', 'error');
        return;
      }
      setDetailContract(detail);
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Không tải được chi tiết hợp đồng.', 'error');
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
      budget: detailContract.budget,
      signedDate: detailContract.signedDate,
      notes: detailContract.notes,
    }, `HopDong_${detailContract.code}.doc`);
    showToast('Đã xuất mẫu Word theo dữ liệu hợp đồng.', 'success');
  };

  const handleCreateContract = async () => {
    if (!selectedProject) {
      showToast('Vui lòng chọn đề tài.', 'error');
      return;
    }
    if (!effectiveBudget || effectiveBudget <= 0) {
      showToast('Ngân sách hợp đồng không hợp lệ.', 'error');
      return;
    }

    const proposalNote = proposalMode === 'manual_email'
      ? 'Nguồn đề xuất: Email + nhập tay'
      : (proposalParsed?.notesSuggestion ?? 'Nguồn đề xuất: Upload + nhận diện tự động');

    setLoading(true);
    try {
      await contractService.create({
        projectId: selectedProject.id,
        budget: effectiveBudget,
        notes: proposalNote,
      });
      await refresh();
      showToast('Đã tạo hợp đồng và gửi thông báo thành công!', 'success');
      setSelectedProjectId('');
      setProposalFile(null);
      setProposalParsed(null);
      setBudgetOverride('');
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Tạo hợp đồng thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedContractId) {
      showToast('Vui lòng chọn hợp đồng cần liên kết.', 'error');
      return;
    }
    if (!uploadFile) {
      showToast('Vui lòng chọn file PDF.', 'error');
      return;
    }
    setLoading(true);
    try {
      await contractService.uploadPdf(selectedContractId, uploadFile);
      await refresh();
      showToast('Tải lên thành công!', 'success');
      setUploadFile(null);
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Tải lên thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Hợp đồng</h1>
        <p className="text-gray-500 text-sm mt-1">Lập hợp đồng, xuất biểu mẫu Bên A/B và theo dõi tệp ký chính thức.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[['Tổng hợp đồng', total, 'text-gray-900', ''], ['Đang thực hiện', active, 'text-primary', 'border-l-4 border-l-primary'], ['Chờ ký duyệt', pending, 'text-amber-500', 'border-l-4 border-l-amber-400'], ['Hoàn thành', completed, 'text-green-600', 'border-l-4 border-l-green-500']].map(([label, val, cls, border]) => (
          <div key={label as string} className={`bg-white p-6 rounded-xl border border-gray-200 shadow-card ${border}`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-3xl font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Form + Table */}
        <div className="col-span-8 space-y-6">
          {/* Create form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Tạo Hợp đồng Mới</h2>
              <p className="text-sm text-gray-500">Chọn đề tài đủ điều kiện và xác định kênh xử lý đề xuất từ Chủ nhiệm.</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn đề tài chờ ký hợp đồng</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-primary focus:border-primary py-2.5"
                >
                  <option value="">-- Chọn đề tài --</option>
                  {eligibleProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
                {!eligibleProjects.length && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700">Không còn đề tài đủ điều kiện tạo hợp đồng mới (mọi đề tài hiện có đã gắn hợp đồng còn hiệu lực).</p>
                    <button
                      onClick={handleCreateEligibleSampleProject}
                      disabled={bootstrapLoading}
                      className="mt-2 text-xs font-bold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-70"
                    >
                      {bootstrapLoading ? 'ĐANG TẠO DỮ LIỆU MẪU...' : 'TẠO 1 ĐỀ TÀI MẪU ĐỦ ĐIỀU KIỆN'}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-white">
                <p className="text-sm font-semibold text-gray-700 mb-3">Nguồn đề xuất từ Chủ nhiệm đề tài</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <label className={`border rounded-lg p-3 cursor-pointer ${proposalMode === 'manual_email' ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="proposal-mode"
                      className="mr-2"
                      checked={proposalMode === 'manual_email'}
                      onChange={() => {
                        setProposalMode('manual_email');
                        setProposalFile(null);
                        setProposalParsed(null);
                      }}
                    />
                    Email + nhập tay thông tin đề xuất
                  </label>
                  <label className={`border rounded-lg p-3 cursor-pointer ${proposalMode === 'upload_autodetect' ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="proposal-mode"
                      className="mr-2"
                      checked={proposalMode === 'upload_autodetect'}
                      onChange={() => setProposalMode('upload_autodetect')}
                    />
                    Upload file đề xuất + nhận diện tự động
                  </label>
                </div>

                {proposalMode === 'upload_autodetect' && (
                  <div className="mt-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Tệp đề xuất (PDF/DOCX/TXT)</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => setProposalFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleParseProposal}
                      disabled={proposalParseLoading}
                      className="px-4 py-2 text-xs font-bold rounded-md bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-70"
                    >
                      {proposalParseLoading ? 'ĐANG NHẬN DIỆN...' : 'NHẬN DIỆN NỘI DUNG ĐỀ XUẤT'}
                    </button>

                    {proposalParsed && (
                      <div className="rounded-md border border-blue-200 bg-white p-3 text-xs text-gray-700 space-y-1">
                        <p><span className="font-semibold">Độ tin cậy:</span> {proposalParsed.confidence}%</p>
                        <p><span className="font-semibold">Mã đề tài:</span> {proposalParsed.projectCode ?? 'Chưa nhận diện'}</p>
                        <p><span className="font-semibold">Email chủ nhiệm:</span> {proposalParsed.ownerEmail ?? 'Chưa nhận diện'}</p>
                        <p><span className="font-semibold">Ngân sách gợi ý:</span> {proposalParsed.suggestedBudget ? formatCurrency(proposalParsed.suggestedBudget) : 'Chưa nhận diện'}</p>
                        <p className="italic text-gray-500">{proposalParsed.textExcerpt.slice(0, 180)}...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-white">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ngân sách hợp đồng (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  value={typeof budgetOverride === 'number' ? budgetOverride : selectedProject?.budget ?? ''}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (!Number.isFinite(value) || value < 0) {
                      setBudgetOverride('');
                      return;
                    }
                    setBudgetOverride(value);
                  }}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-primary focus:border-primary py-2.5"
                  placeholder="Nhập ngân sách hợp đồng"
                />
                <p className="text-xs text-gray-500 mt-1">Giá trị dùng để tạo hợp đồng: {effectiveBudget > 0 ? formatCurrency(effectiveBudget) : 'Chưa xác định'}</p>
              </div>

              {/* Contract preview */}
              <div className="bg-gray-100 p-6 rounded-xl border border-gray-200">
                <div className="bg-white border border-gray-200 p-8 min-h-64 text-[11px] leading-relaxed shadow-sm">
                  <div className="text-center mb-4 font-bold space-y-1">
                    <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="border-b border-gray-900 w-32 mx-auto pb-1">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                  <div className="text-center mb-4">
                    <p className="font-bold text-xs uppercase">HỢP ĐỒNG NGHIÊN CỨU KHOA HỌC</p>
                    <p className="italic text-gray-500">Số: ......./HĐ-KHCN</p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-bold uppercase text-xs">BÊN A: [Tên Cơ quan Quản lý]</p>
                    <p className="font-bold uppercase text-xs">BÊN B: {selectedProject ? `${selectedProject.ownerTitle ? `${selectedProject.ownerTitle} ` : ''}${selectedProject.owner}` : '[Tên Chủ nhiệm]'}</p>
                    <p className="text-gray-500 italic">Nguồn đề xuất: {proposalMode === 'manual_email' ? 'Email + nhập tay' : 'Upload + nhận diện tự động'}</p>
                    <p className="text-gray-400 italic">[Nội dung điều khoản pháp lý mẫu được tự động thiết lập...]</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={handleExportContractDraft} className="px-5 py-2 text-sm font-semibold text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors">
                XUẤT FILE WORD (.DOCX)
              </button>
              <button className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                LƯU NHÁP
              </button>
              <button
                onClick={handleCreateContract}
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark shadow-card uppercase tracking-wide"
              >
                {loading ? 'ĐANG XỬ LÝ...' : 'TẠO VÀ GỬI THÔNG BÁO'}
              </button>
            </div>
          </div>

          {/* Contracts table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-md font-bold text-gray-800">Danh sách Hợp đồng</h2>
              <div className="flex gap-2 items-center">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg w-48 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Tìm mã HĐ / đề tài..."
                />
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50"
                >
                  XUẤT EXCEL
                </button>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 border-b border-gray-100">Mã HĐ</th>
                  <th className="px-6 py-3 border-b border-gray-100">Đề tài</th>
                  <th className="px-6 py-3 border-b border-gray-100">Chủ nhiệm</th>
                  <th className="px-6 py-3 border-b border-gray-100">Ngân sách</th>
                  <th className="px-6 py-3 border-b border-gray-100">Trạng thái</th>
                  <th className="px-6 py-3 border-b border-gray-100 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{c.code}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{c.projectCode} - {c.projectTitle}</td>
                    <td className="px-6 py-4">{c.owner}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(c.budget)}</td>
                    <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(c.id)}
                        className="text-[10px] font-bold text-primary uppercase hover:underline"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upload + Guide */}
        <div className="col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
            <h2 className="text-md font-bold text-gray-800 mb-1">Tải lên PDF Quét</h2>
            <p className="text-xs text-gray-500 mb-5">Bản sao chính thức đầy đủ chữ ký và mộc.</p>
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer block">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-[10px] font-bold text-gray-400">PDF</div>
              <p className="text-[12px] font-bold text-gray-700 uppercase">Tải lên tài liệu</p>
              <p className="text-[10px] text-gray-400 mt-1">Định dạng .pdf (Max 20MB)</p>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              {uploadFile && (
                <p className="mt-3 text-[11px] text-gray-600 font-semibold break-all">{uploadFile.name}</p>
              )}
            </label>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Liên kết Hợp đồng:</label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm py-2"
                >
                  <option value="">Chọn mã hợp đồng...</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.owner}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleUploadPdf}
                disabled={loading}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-black"
              >
                {loading ? 'ĐANG TẢI LÊN...' : 'HOÀN TẤT TẢI LÊN'}
              </button>
            </div>
          </div>

          <div className="bg-primary rounded-xl shadow-button p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Hướng dẫn quy trình</h3>
              <p className="text-[12px] text-blue-100 mb-4 leading-relaxed">Xem lại các bước hướng dẫn chuẩn bị hồ sơ hợp đồng và rà soát các điều khoản pháp lý mới nhất.</p>
              <button
                onClick={() => showToast('Đã mở hướng dẫn quy trình. Vui lòng tham chiếu checklist theo role để rà soát hồ sơ.', 'success')}
                className="px-4 py-2 bg-white text-primary text-[11px] font-bold rounded-lg uppercase tracking-wide"
              >
                Xem tài liệu
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>

      {detailContract && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Chi tiết hợp đồng</p>
                <h3 className="text-lg font-bold text-gray-800">{detailContract.code}</h3>
              </div>
              <button onClick={() => setDetailContract(null)} className="text-gray-500 hover:text-gray-700 text-sm font-semibold">Đóng</button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase">Đề tài</p>
                  <p className="font-semibold text-gray-800">{detailContract.projectCode} - {detailContract.projectTitle}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase">Bên B</p>
                  <p className="font-semibold text-gray-800">{detailContract.ownerTitle ? `${detailContract.ownerTitle} ` : ''}{detailContract.owner}</p>
                  <p className="text-xs text-gray-500">{detailContract.ownerEmail ?? 'Chưa có email'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase">Ngân sách</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(detailContract.budget)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase">Trạng thái</p>
                  <StatusBadge status={detailContract.status} />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500 uppercase">Tệp đính kèm</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detailContract.pdfUrl ? (
                    <a
                      href={detailContract.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100"
                    >
                      MỞ PDF ĐÃ KÝ
                    </a>
                  ) : (
                    <span className="text-xs text-amber-700">Chưa có PDF đã ký.</span>
                  )}

                  <button
                    onClick={handleExportDetailTemplate}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    TẢI MẪU WORD
                  </button>
                </div>

                {detailContract.pdfUrl && (
                  <div className="mt-3 rounded-md border border-gray-200 overflow-hidden">
                    <iframe
                      src={detailContract.pdfUrl}
                      title={`PDF ${detailContract.code}`}
                      className="w-full h-80"
                    />
                  </div>
                )}
              </div>

              {detailContract.notes && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase">Ghi chú</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{detailContract.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManagementPage;
