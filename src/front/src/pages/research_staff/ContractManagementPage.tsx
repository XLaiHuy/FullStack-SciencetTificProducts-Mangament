import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import type { Contract } from '../../types';
import type { Project } from '../../types';
import { contractService } from '../../services/api/contractService';
import { projectService } from '../../services/api/projectService';

const ContractManagementPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
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
      setToast(typeof e === 'string' ? e : 'Không thể tải dữ liệu hợp đồng.');
      setTimeout(() => setToast(''), 3000);
    });
  }, []);

  const filtered = contracts.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.owner.toLowerCase().includes(search.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const total = contracts.length;
  const active = contracts.filter(c => c.status === 'da_ky').length;
  const pending = contracts.filter(c => c.status === 'cho_duyet').length;
  const completed = contracts.filter(c => c.status === 'hoan_thanh').length;

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const handleCreateContract = async () => {
    if (!selectedProject) {
      showToast('Vui lòng chọn đề tài.');
      return;
    }
    setLoading(true);
    try {
      await contractService.create({
        projectId: selectedProject.id,
        budget: selectedProject.budget,
      });
      await refresh();
      showToast('Đã tạo hợp đồng và gửi thông báo thành công!');
      setSelectedProjectId('');
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Tạo hợp đồng thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedContractId) {
      showToast('Vui lòng chọn hợp đồng cần liên kết.');
      return;
    }
    if (!uploadFile) {
      showToast('Vui lòng chọn file PDF.');
      return;
    }
    setLoading(true);
    try {
      await contractService.uploadPdf(selectedContractId, uploadFile);
      await refresh();
      showToast('Tải lên thành công!');
      setUploadFile(null);
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Tải lên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Hợp đồng</h1>
        <p className="text-gray-500 text-sm mt-1">Lựa chọn nhân sự và rà soát nội dung trước khi ban hành.</p>
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
              <p className="text-sm text-gray-500">Lựa chọn nhân sự và rà soát nội dung trước khi ban hành.</p>
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
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
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
                    <p className="font-bold uppercase text-xs">BÊN B: {selectedProject ? selectedProject.owner : '[Tên Chủ nhiệm]'}</p>
                    <p className="text-gray-400 italic">[Nội dung điều khoản pháp lý mẫu được tự động thiết lập...]</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button className="px-5 py-2 text-sm font-semibold text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors">
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
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg w-40 focus:ring-1 focus:ring-primary outline-none"
                placeholder="Tìm mã HĐ..."
              />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 border-b border-gray-100">Mã HĐ</th>
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
                    <td className="px-6 py-4">{c.owner}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.budget.toLocaleString('vi-VN')} VNĐ</td>
                    <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[10px] font-bold text-primary uppercase hover:underline">Chi tiết</button>
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
              <button className="px-4 py-2 bg-white text-primary text-[11px] font-bold rounded-lg uppercase tracking-wide">Xem tài liệu</button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractManagementPage;
