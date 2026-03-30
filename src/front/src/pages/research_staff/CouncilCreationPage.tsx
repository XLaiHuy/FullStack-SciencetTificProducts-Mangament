import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import type { Council, Project, CouncilMember } from '../../types';

const CouncilCreationPage: React.FC = () => {
  const [councils, setCouncils] = useState<Council[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [toast, setToast] = useState('');
  const [members, setMembers] = useState<CouncilMember[]>([{ name: 'GS.TS. Hoàng Văn E', role: 'chu_tich', email: 'hve@university.edu.vn', phone: '', affiliation: 'Đại học Quốc gia' }]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [removedMemberIndexes, setRemovedMemberIndexes] = useState<number[]>([]);
  
  const [newMember, setNewMember] = useState<CouncilMember>({ name: '', role: 'uy_vien', email: '', phone: '', affiliation: '', hocHamHocVi: '' } as any);

  useEffect(() => {
    Promise.all([councilService.getAll(), projectService.getAll()])
      .then(([cs, ps]) => {
        setCouncils(cs);
        setProjects(ps.filter(x => x.status === 'cho_nghiem_thu'));
      })
      .catch((e) => {
        console.error(e);
        setToast(typeof e === 'string' ? e : 'Không thể tải dữ liệu hội đồng.');
        setTimeout(() => setToast(''), 3000);
      });
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) {
      showToast('Vui lòng chọn đề tài cần thành lập hội đồng trước.');
      return;
    }

    setLoading(true);
    try {
      const hasConflict = await councilService.checkConflict(newMember, activeProjectId);
      if (hasConflict) {
        showToast('Không thể thêm thành viên: có xung đột lợi ích (COI).');
        return;
      }
      setMembers([...members, { ...newMember, hasConflict: false }]);
      setNewMember({ name: '', role: 'uy_vien', email: '', phone: '', affiliation: '', hocHamHocVi: '' } as any);
      setIsModalOpen(false);
      showToast('Đã thêm thành viên: ' + newMember.name);
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : 'Thêm thành viên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const handleCreateCouncil = async () => {
    if (!activeProject) {
      showToast('Vui lòng chọn đề tài cần thành lập hội đồng.');
      return;
    }
    if (members.length === 0) {
      showToast('Vui lòng thêm tối thiểu 1 thành viên hội đồng.');
      return;
    }

    setLoading(true);
    try {
      const activeMembers = members.filter((_, idx) => !removedMemberIndexes.includes(idx));
      const created = await councilService.create(activeProject.id, activeProject.title, activeMembers, 'Research Staff');
      setCouncils([created, ...councils]);
      setProjects(projects.filter(p => p.id !== activeProject.id));
      setActiveProjectId('');
      setMembers([{ name: 'GS.TS. Hoàng Văn E', role: 'chu_tich', email: 'hve@university.edu.vn', phone: '', affiliation: 'Đại học Quốc gia' }]);
      setRemovedMemberIndexes([]);
      showToast('Hội đồng đã được phê duyệt và ban hành thành công!');
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : 'Ban hành hội đồng thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thành lập Hội đồng Nghiệm thu</h1>
        <p className="text-gray-500 text-sm mt-1">Thành lập hội đồng cho các đề tài đã hoàn thành</p>
      </div>

      {/* Pending projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-full" />
            Đề tài chờ thành lập Hội đồng
          </h2>
          <span className="bg-blue-50 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-blue-100">{projects.length} cần xử lý</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-card">
          {projects.map((p, i) => (
            <div key={p.id} className={`p-6 flex items-center justify-between gap-6 border-l-4 ${i === 0 ? 'border-l-primary' : 'border-l-transparent'} border-b border-gray-50 last:border-b-0`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{p.code}</span>
                  {p.endDate < '2024-01-01' && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">HẠN: {p.endDate}</span>}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500">Chủ nhiệm: {p.owner} • Thời gian: {p.durationMonths} tháng</p>
              </div>
              <button
                onClick={() => {
                  setActiveProjectId(p.id);
                  document.getElementById('council-details-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-button hover:bg-primary-dark"
              >
                Thiết lập Hội đồng
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Proposals */}
        <div className="col-span-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight">Đề xuất từ Chủ nhiệm</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { name: 'PGS.TS. Lê Quang C', inst: 'Đại học Bách Khoa TP.HCM', role: 'PHẢN BIỆN 1', conflict: true },
                { name: 'TS. Phạm Minh D', inst: 'Viện Công nghệ Thông tin', role: 'ỦY VIÊN', conflict: false },
              ].map(m => (
                <div key={m.name} className="p-4 border border-gray-100 rounded-xl space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{m.name}</p>
                      <p className="text-[11px] text-gray-500">{m.inst}</p>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded">{m.role}</span>
                  </div>
                  {m.conflict ? (
                    <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> CẢNH BÁO: XUNG ĐỘT LỢI ÍCH (COI)
                    </div>
                  ) : (
                    <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> ĐỦ ĐIỀU KIỆN
                    </div>
                  )}
                  <button
                    disabled={m.conflict}
                    className={`w-full py-2.5 text-[11px] font-bold border rounded-xl transition-colors ${m.conflict ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-primary hover:text-white hover:border-primary'}`}
                  >
                    Chọn đề xuất
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main form */}
        <div className="col-span-8" id="council-details-section">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-card">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Chi tiết thành phần Hội đồng</h3>
            <div className="mb-6 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Đề tài đang chọn</p>
              <p className="text-sm font-bold text-gray-900">
                {activeProject ? `${activeProject.code} - ${activeProject.title}` : 'Chưa chọn đề tài'}
              </p>
              {activeProject && <p className="text-xs text-gray-500 mt-1">Chủ nhiệm: {activeProject.owner}</p>}
            </div>
            <div className="overflow-hidden border border-gray-100 rounded-xl mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Họ và Tên', 'Học hàm / Học vị', 'Vai trò', 'Email', 'Xóa'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((m, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-4"><input type="text" value={m.name} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" /></td>
                      <td className="px-4 py-4"><input type="text" value={(m as any).hocHamHocVi || ''} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" /></td>
                      <td className="px-4 py-4"><input type="text" value={m.role === 'chu_tich' ? 'Chủ tịch' : m.role === 'phan_bien_1' ? 'Phản biện 1' : m.role === 'phan_bien_2' ? 'Phản biện 2' : m.role === 'thu_ky' ? 'Thư ký' : 'Ủy viên'} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" /></td>
                      <td className="px-4 py-4"><input type="email" value={m.email || ''} readOnly className="w-full border-gray-200 bg-gray-50 rounded-xl text-sm" /></td>
                      <td className="px-4 py-4 text-center">
                        {removedMemberIndexes.includes(idx) ? (
                          <span className="text-[10px] font-bold text-red-500 uppercase">Đã gỡ</span>
                        ) : (
                          <button onClick={() => setRemovedMemberIndexes([...removedMemberIndexes, idx])} className="text-gray-400 hover:text-red-500 font-bold text-[10px] uppercase">Gỡ thành viên</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="px-4 py-4">
                      <button onClick={() => setIsModalOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-[#1E40AF] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                        + Thêm thành viên mới
                      </button>
                      <button onClick={() => alert('Xuất file thành công')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2 text-xs font-bold w-full">
                        Xuất file
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Quyết định thành lập (.pdf)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/50">
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 font-bold text-xs mb-4">UP</div>
                <button className="bg-white border border-gray-200 px-6 py-2 text-xs font-bold text-primary rounded-xl mb-2 shadow-card">Chọn tệp tin</button>
                <p className="text-[11px] text-gray-400 font-medium">hoặc kéo thả vào đây (Tối đa 10MB)</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreateCouncil}
                disabled={loading}
                className="px-8 py-3 text-xs font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark"
              >{loading ? 'ĐANG XỬ LÝ...' : 'Phê duyệt & Ban hành'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* History table */}
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
                {['Số Quyết định', 'Tên Đề tài', 'Ngày lập', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {councils.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-8 py-5 text-sm font-bold text-gray-900">{c.decisionCode}</td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-600 max-w-xs truncate">{c.projectTitle}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{c.createdDate}</td>
                  <td className="px-8 py-5"><StatusBadge status={c.status} /></td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2">
                      <button className="text-[10px] font-bold text-primary hover:underline">Xem</button>
                      <button className="text-[10px] font-bold text-primary hover:underline">Sửa</button>
                      <button className="text-[10px] font-bold text-primary hover:underline">Gửi mail</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-[500px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Thêm thành viên Hội đồng</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Họ và Tên</label><input required type="text" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="Nhập tên thành viên..." /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vai trò</label><select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as any})} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]"><option value="chu_tich">Chủ tịch</option><option value="phan_bien_1">Phản biện 1</option><option value="phan_bien_2">Phản biện 2</option><option value="thu_ky">Thư ký</option><option value="uy_vien">Ủy viên</option></select></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label><input required type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]" placeholder="email@domain.com" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Học hàm / Học vị</label><select value={(newMember as any).hocHamHocVi || ''} onChange={e => setNewMember({...newMember, hocHamHocVi: e.target.value} as any)} className="w-full border-gray-200 rounded-xl text-sm focus:ring-[#1E40AF]"><option value="">-- Chọn --</option><option value="GS">GS</option><option value="PGS">PGS</option><option value="TS">TS</option><option value="ThS">ThS</option><option value="Khác">Khác</option></select></div>
              <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold border rounded-xl text-gray-600 hover:bg-gray-50">Hủy</button><button disabled={loading} type="submit" className="px-6 py-2.5 text-sm font-bold bg-[#1E40AF] text-white rounded-xl shadow-md hover:bg-blue-800">{loading ? 'ĐANG KIỂM TRA...' : 'Lưu thành viên'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilCreationPage;
