import React, { useEffect, useState } from 'react';
import type { Template } from '../../types';
import { templateService } from '../../services/api/templateService';

type ToastType = 'success' | 'error';

const TemplateManagementPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('chu_tich');
  const [version, setVersion] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formTypes, setFormTypes] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [formTypeCode, setFormTypeCode] = useState('general');
  const [roleFilter, setRoleFilter] = useState('');

  const refresh = async () => {
    const data = await templateService.getAll();
    setTemplates(data);
  };

  useEffect(() => {
    templateService.getFormTypes().then((types) => {
      setFormTypes(types);
      if (types[0]) setFormTypeCode(types[0].code);
    }).catch(console.error);
    refresh().catch((e) => {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Không thể tải danh sách biểu mẫu.');
    });
  }, []);

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpload = async () => {
    if (!name || !version || !effectiveDate || !file) {
      showToast('Vui lòng nhập đủ thông tin và chọn file.', 'error');
      return;
    }
    setLoading(true);
    try {
      await templateService.upload({
        name,
        version,
        role,
        formTypeCode,
        effectiveDate: new Date(effectiveDate).toISOString(),
        file,
      });
      await refresh();
      setName('');
      setRole('chu_tich');
      setVersion('');
      setEffectiveDate('');
      setNote('');
      setFormTypeCode(formTypes[0]?.code ?? 'general');
      setFile(null);
      showToast('Biểu mẫu đã được tải lên và lưu trữ thành công!', 'success');
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Tải biểu mẫu thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await templateService.delete(id);
      await refresh();
      showToast('Đã ngưng áp dụng biểu mẫu.', 'success');
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Không thể ngưng áp dụng biểu mẫu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFill = async (id: string) => {
    const projectId = window.prompt("Nhập ID Đề tài (projectId) để tải dự thảo:");
    if (!projectId) return;
    setLoading(true);
    try {
      await templateService.fill(id, projectId);
      showToast('Tải dự thảo thành công!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Không thể tải dự thảo. Kiểm tra lại ID Đề tài.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setRole('chu_tich');
    setVersion('');
    setEffectiveDate('');
    setNote('');
    setFile(null);
    setFormTypeCode(formTypes[0]?.code ?? 'general');
    showToast('Đã xóa dữ liệu đang nhập trên form.', 'success');
  };

  const cycleRoleFilter = () => {
    const availableRoles = Array.from(new Set(templates.map((t) => t.role)));
    if (!availableRoles.length) return;
    if (!roleFilter) {
      setRoleFilter(availableRoles[0]);
      showToast(`Đang lọc theo vai trò: ${availableRoles[0]}`, 'success');
      return;
    }
    const currentIndex = availableRoles.indexOf(roleFilter);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= availableRoles.length) {
      setRoleFilter('');
      showToast('Đã bỏ lọc vai trò.', 'success');
      return;
    }
    setRoleFilter(availableRoles[nextIndex]);
    showToast(`Đang lọc theo vai trò: ${availableRoles[nextIndex]}`, 'success');
  };

  const visibleTemplates = roleFilter ? templates.filter((t) => t.role === roleFilter) : templates;

  const grouped = visibleTemplates.reduce((acc: Record<string, Template[]>, t) => {
    if (!acc[t.role]) acc[t.role] = [];
    acc[t.role].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {toast && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Biểu mẫu Hội đồng</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý và cập nhật các biểu mẫu nghiệm thu</p>
      </div>

      {/* Upload card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-50 text-primary rounded-lg flex items-center justify-center text-[10px] font-bold">UP</span>
          <h2 className="font-bold text-gray-900">Tải lên Biểu mẫu Mới</h2>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-6 space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">Tên biểu mẫu</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 rounded-xl border-gray-200 text-sm focus:ring-primary focus:border-primary" placeholder="Nhập tên biểu mẫu..." type="text" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-2">Vai trò áp dụng</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-11 rounded-xl border-gray-200 text-sm focus:ring-primary">
                    <option value="chu_tich">Chủ tịch Hội đồng</option>
                    <option value="phan_bien">Người phản biện</option>
                    <option value="thu_ky">Thư ký</option>
                    <option value="uy_vien">Ủy viên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-2">Loại biểu mẫu</label>
                  <input
                    list="template-form-types"
                    value={formTypeCode}
                    onChange={(e) => setFormTypeCode(e.target.value)}
                    className="w-full h-11 rounded-xl border-gray-200 text-sm focus:ring-primary"
                    placeholder="Nhập hoặc chọn loại biểu mẫu"
                  />
                  <datalist id="template-form-types">
                    {formTypes.map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
                    {!formTypes.length && <option value="general">general</option>}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">Phiên bản</label>
                <input value={version} onChange={(e) => setVersion(e.target.value)} className="w-full h-11 rounded-xl border-gray-200 text-sm focus:ring-primary" placeholder="2024.1.0" type="text" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">Ngày hiệu lực</label>
                <input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full h-11 rounded-xl border-gray-200 text-sm focus:ring-primary" type="date" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">Ghi chú</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm focus:ring-primary" placeholder="Mô tả cập nhật..." rows={3} />
              </div>
            </div>
            <div className="col-span-6">
              <label className="h-full border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center p-10 cursor-pointer">
                <div className="w-14 h-14 bg-white rounded-full shadow-card flex items-center justify-center mb-4">
                  <span className="text-primary font-bold text-[10px]">FILE</span>
                </div>
                <p className="text-sm font-bold text-gray-900">Kéo thả tệp hoặc <span className="text-primary">chọn từ máy tính</span></p>
                <p className="text-xs text-gray-400 mt-2 font-medium">Định dạng: .docx, .pdf (Max 10MB)</p>
                <input type="file" className="hidden" accept=".doc,.docx,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file && <p className="text-xs text-gray-600 mt-2 font-semibold break-all">{file.name}</p>}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-8 border-t border-gray-100">
            <button onClick={handleResetForm} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Hủy bỏ</button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-button hover:bg-primary-dark"
            >{loading ? 'ĐANG TẢI...' : 'Tải lên & Lưu trữ'}</button>
          </div>
        </div>
      </div>

      {/* Template list */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Danh sách biểu mẫu hiện hành</h2>
          <button onClick={cycleRoleFilter} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-white hover:bg-gray-50">
            {roleFilter ? `Bộ lọc: ${roleFilter}` : 'Bộ lọc'}
          </button>
        </div>
        {Object.entries(grouped).map(([role, tmps]) => (
          <div key={role} className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
            <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
              <h3 className="text-sm font-bold text-gray-900">Vai trò: {role}</h3>
              <span className="bg-blue-100 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">{tmps.length} Biểu mẫu</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tên biểu mẫu', 'Phiên bản', 'Cập nhật', 'Thao tác'].map(h => (
                    <th key={h} className="px-8 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tmps.map(t => (
                  <tr key={t.id}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary">
                          <span className="text-[10px] font-bold">DOC</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {t.name}
                            {t.is_default && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">MẶC ĐỊNH</span>}
                          </p>
                          <p className="text-xs text-gray-400">{t.size} • Ngày hiệu lực: {t.effectiveDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-bold">{t.version}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-500">{t.updatedDate}</td>
                    <td className="px-8 py-5 space-x-4">
                      <button onClick={() => handleFill(t.id)} className="text-sm font-bold text-primary hover:underline">Tải dự thảo</button>
                      <button onClick={() => handleDelete(t.id)} className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors">Ngưng áp dụng</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateManagementPage;
