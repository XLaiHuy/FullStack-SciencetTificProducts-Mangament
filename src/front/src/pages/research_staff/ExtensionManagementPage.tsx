import React, { useEffect, useState } from 'react';
import type { Extension } from '../../types';
import { extensionService } from '../../services/api/extensionService';
import { projectService } from '../../services/api/projectService';

// Extend the Extension type to include our local status
type LocalExtension = Extension & { status?: 'pending' | 'approved' | 'rejected' };

const ExtensionManagementPage: React.FC = () => {
  const [extensions, setExtensions] = useState<LocalExtension[]>([]);
  const [toast, setToast] = useState('');
  const [projectId, setProjectId] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; code: string; title: string }>>([]);

  const refresh = async () => {
    const data = await extensionService.getAll();
    setExtensions(data.map(ext => ({
      ...ext,
      status: ext.boardStatus === 'da_phe_duyet' ? 'approved' : ext.boardStatus === 'tu_choi' ? 'rejected' : 'pending',
    } as LocalExtension)));
  };

  useEffect(() => {
    refresh().catch(console.error);
    projectService.getAll().then((rows) => {
      const items = rows.map((r) => ({ id: r.id, code: r.code, title: r.title }));
      setProjects(items);
      if (items[0]) setProjectId(items[0].id);
    }).catch(console.error);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const countBadge = (count: number) => {
    const colors = ['', 'bg-blue-50 text-blue-600 border-blue-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-red-50 text-red-600 border-red-100'];
    return colors[Math.min(count, 3)] || colors[3];
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'approved') {
      await extensionService.approve(id);
    }
    await refresh();
    showToast(`Đã ${newStatus === 'approved' ? 'phê duyệt' : 'cập nhật'} yêu cầu gia hạn`);
  };

  const handleCreate = async () => {
    if (!projectId || !requestedDeadline || !reason) {
      showToast('Vui lòng nhập đủ thông tin yêu cầu gia hạn.');
      return;
    }
    await extensionService.create({
      projectId,
      requested_deadline: requestedDeadline,
      reason,
      supporting_document: supportingDocument ?? undefined,
    });
    await refresh();
    setReason('');
    setRequestedDeadline('');
    setSupportingDocument(null);
    showToast('Đã tạo yêu cầu gia hạn mới.');
  };

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý Gia hạn</h1>
        <p className="text-gray-500 mt-2 max-w-2xl leading-relaxed">Danh sách các yêu cầu gia hạn đề tài nghiên cứu đang chờ xử lý sau khi có sự phê duyệt từ Ban Giám đốc.</p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Tạo yêu cầu gia hạn</h2>
        <div className="grid grid-cols-4 gap-4">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border-gray-300 text-sm">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.title}</option>)}
          </select>
          <input value={requestedDeadline} onChange={(e) => setRequestedDeadline(e.target.value)} type="date" className="rounded-xl border-gray-300 text-sm" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do gia hạn" className="rounded-xl border-gray-300 text-sm" />
          <input type="file" onChange={(e) => setSupportingDocument(e.target.files?.[0] ?? null)} className="rounded-xl border-gray-300 text-sm" />
        </div>
        <div className="flex justify-end">
          <button onClick={handleCreate} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">Gửi yêu cầu</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {[['Tổng yêu cầu', extensions.length, 'text-primary'], ['Chờ phê duyệt', extensions.filter(e => e.status === 'pending').length, 'text-amber-500'], ['Đã xử lý', extensions.filter(e => e.status !== 'pending').length, 'text-emerald-500']].map(([label, val, cls]) => (
          <div key={label as string} className="bg-white p-8 rounded-2xl shadow-card border border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            <div className={`text-4xl font-extrabold mt-3 tracking-tight ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Yêu cầu Đang chờ</h2>
          <span className="px-4 py-1.5 rounded-full text-[10px] font-bold bg-blue-50 text-primary border border-blue-100 uppercase">Cần hành động</span>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              {['Mã Đề Tài', 'Lý Do Gia Hạn', 'Giải Trình', 'Hạn Đề Xuất', 'Trạng thái', 'Thao Tác'].map(h => (
                <th key={h} className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {extensions.map(ext => (
              <tr key={ext.id} className={`hover:bg-gray-50/50 transition-colors ${ext.status === 'pending' ? 'bg-gray-50/20' : ''}`}>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono font-bold text-primary text-sm">{ext.projectCode}</span>
                    <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[9px] font-bold border ${countBadge(ext.extensionCount)}`}>
                      GIA HẠN LẦN {ext.extensionCount}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">{ext.projectOwner}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-gray-600 max-w-[280px]">{ext.reason}</td>
                <td className="px-8 py-6">
                  <button className="text-[11px] font-bold uppercase tracking-tight text-primary hover:text-primary-dark">
                    Xem file
                  </button>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm font-bold text-gray-900">{ext.proposedDate}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Gia hạn +{ext.extensionDays} ngày</div>
                </td>
                <td className="px-8 py-6">
                  {ext.status === 'approved' && <span className="text-green-600 font-medium">ĐÃ PHÊ DUYỆT</span>}
                  {ext.status === 'rejected' && <span className="text-red-500 font-medium">ĐÃ TỪ CHỐI</span>}
                  {ext.status === 'pending' && <span className="text-gray-500">ĐANG CHỜ</span>}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleUpdateStatus(ext.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                    >Phê duyệt</button>
                    <button
                      onClick={() => handleUpdateStatus(ext.id, 'rejected')}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >Từ chối</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hiển thị 1 - {extensions.length} / {extensions.length} yêu cầu</span>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50">Trước</button>
            <button className="w-9 h-9 flex items-center justify-center bg-primary text-white rounded-xl text-xs font-bold shadow-card">1</button>
            <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">Sau</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionManagementPage;
