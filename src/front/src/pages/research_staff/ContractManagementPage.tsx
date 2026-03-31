import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import type { Contract, Project } from '../../types';
import { contractService } from '../../services/api/contractService';
import { projectService } from '../../services/api/projectService';

type ToastType = 'success' | 'error';
const CONTRACT_DRAFT_KEY = 'research_staff_contract_draft';

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

  <div class="section"><span class="label">Ben A:</span> ${escapeHtml(input.agencyName || 'Truong/Co quan quan ly de tai')}.</div>
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
    <div class="box"><strong>DAI DIEN BEN A</strong><br/><i>(Ky, ghi ro ho ten)</i><br/>${escapeHtml(input.representative || '')}</div>
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
  const [agencyName, setAgencyName] = useState('Đại học Khoa học và Công nghệ');
  const [partyARepresentative, setPartyARepresentative] = useState('');
  const [budgetOverride, setBudgetOverride] = useState<number | ''>('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
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
  const filtered = contracts.filter(c =>
    c.code.toLowerCase().includes(keyword) ||
    c.owner.toLowerCase().includes(keyword) ||
    c.projectCode.toLowerCase().includes(keyword) ||
    c.projectTitle.toLowerCase().includes(keyword)
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
    if (!selectedProject) return;
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
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ký kết Hợp đồng</h1>
        <p className="text-gray-500 text-sm mt-1">Lập hợp đồng mới, nhập thông tin Bên A và quản lý tệp ký chính thức.</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {[
          ['Tổng hợp đồng', total, 'text-gray-900', ''],
          ['Đang thực hiện', active, 'text-primary', 'border-l-4 border-l-primary'],
          ['Chờ ký duyệt', pending, 'text-amber-500', 'border-l-4 border-l-amber-400'],
          ['Hoàn thành', completed, 'text-green-600', 'border-l-4 border-l-green-500']
        ].map(([label, val, cls, border]) => (
          <div key={label as string} className={`bg-white p-6 rounded-xl border border-gray-200 shadow-card ${border}`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-3xl font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Tạo Hợp đồng Mới</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn đề tài</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm py-2.5"
                >
                  <option value="">-- Chọn đề tài --</option>
                  {eligibleProjects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.title}</option>)}
                </select>
                {selectedProject && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase track-wider">Chi tiết Đề tài (Từ Đề xuất)</p>
                    <p className="text-sm font-bold text-gray-900">{selectedProject.code} - {selectedProject.title}</p>
                    <p className="text-xs text-gray-600">
                      <strong>Chủ nhiệm:</strong> {selectedProject.ownerTitle ? `${selectedProject.ownerTitle} ` : ''}{selectedProject.owner} {selectedProject.ownerEmail ? `(${selectedProject.ownerEmail})` : ''}
                    </p>
                    <p className="text-xs text-gray-600">
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
                    className="w-full rounded-lg border-gray-300 text-sm py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Đại diện Bên A</label>
                  <input
                    type="text"
                    value={partyARepresentative}
                    onChange={e => setPartyARepresentative(e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm py-2.5"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-white">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ngân sách (VNĐ)</label>
                <input
                  type="number"
                  value={budgetOverride !== '' ? budgetOverride : (selectedProject?.budget ?? '')}
                  onChange={e => setBudgetOverride(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-lg border-gray-300 text-sm py-2.5"
                />
              </div>

              <div className="bg-gray-100 p-6 rounded-xl border border-gray-200">
                <div className="bg-white border border-gray-200 p-8 min-h-64 text-[11px] leading-relaxed shadow-sm">
                  <div className="text-center mb-4 font-bold uppercase">Hợp đồng Nghiên cứu Khoa học</div>
                  <div className="space-y-3">
                    <p className="font-bold">BÊN A: {agencyName}</p>
                    <p className="font-bold">BÊN B: {selectedProject?.owner || '[Chủ nhiệm]'}</p>
                    <p className="text-gray-500 italic">Giá trị: {formatCurrency(effectiveBudget)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={handleExportContractDraft} className="px-5 py-2 text-sm font-semibold text-primary bg-white border border-primary rounded-lg hover:bg-blue-50">XUẤT NHÁP WORD</button>
              <button onClick={handleSaveDraft} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">LƯU NHÁP</button>
              <button onClick={handleCreateContract} disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark uppercase">TẠO HỢP ĐỒNG</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-md font-bold text-gray-800">Danh sách Hợp đồng</h2>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg w-48"
                  placeholder="Tìm kiếm..."
                />
                <button onClick={handleExportExcel} className="px-3 py-1.5 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-lg">XUẤT EXCEL</button>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Mã HĐ</th>
                  <th className="px-6 py-3">Đề tài</th>
                  <th className="px-6 py-3">Chủ nhiệm</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{c.code}</td>
                    <td className="px-6 py-4 text-xs">{c.projectCode} - {c.projectTitle}</td>
                    <td className="px-6 py-4">{c.owner}</td>
                    <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenDetail(c.id)} className="text-[10px] font-bold text-primary uppercase">Chi tiết</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
            <h2 className="text-md font-bold text-gray-800 mb-4">Tải lên PDF đã ký</h2>
            <div className="space-y-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              <select
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm"
              >
                <option value="">Chọn hợp đồng...</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.code} - {c.owner}</option>)}
              </select>
              <button onClick={handleUploadPdf} disabled={loading} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-black">TẢI LÊN</button>
            </div>
          </div>
        </div>
      </div>

      {detailContract && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">{detailContract.code}</h3>
              <button onClick={() => setDetailContract(null)} className="text-sm font-semibold">Đóng</button>
            </div>
            <div className="p-6 space-y-4">
              <p><strong>Đề tài:</strong> {detailContract.projectTitle}</p>
              <p><strong>Chủ nhiệm:</strong> {detailContract.owner}</p>
              <p><strong>Ngân sách:</strong> {formatCurrency(detailContract.budget)}</p>
              <div className="pt-4 flex gap-3">
                {detailContract.pdfUrl && <a href={detailContract.pdfUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-rose-600 text-white rounded text-xs">MỞ PDF</a>}
                <button onClick={handleExportDetailTemplate} className="px-4 py-2 bg-blue-600 text-white rounded text-xs">TẢI MẪU WORD</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManagementPage;
