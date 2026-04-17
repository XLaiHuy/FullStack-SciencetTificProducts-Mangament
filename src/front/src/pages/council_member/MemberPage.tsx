import React, { useRef, useState } from 'react';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { templateService } from '../../services/api/templateService';
import type { Council, Template } from '../../types';

type DownloadItem =
  | { kind: 'decision'; label: string }
  | { kind: 'minutes'; label: string }
  | { kind: 'report'; label: string; reportId: string };

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MemberPage: React.FC = () => {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [councilId, setCouncilId] = useState('');
  const [activeCouncil, setActiveCouncil] = useState<Council | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [opinion, setOpinion] = useState('');
  const [opinionSubmitted, setOpinionSubmitted] = useState(false);
  const [submittingOpinion, setSubmittingOpinion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    const bootstrap = async () => {
      try {
        const list = await councilService.getMine();
        if (!list.length) return;
        const id = list[0].id;
        setCouncilId(id);
        const [detail, templates] = await Promise.all([
          councilService.getById(id),
          templateService.getAll().catch(() => [] as Template[]),
        ]);
        if (detail) setActiveCouncil(detail);
        const memberTemplate = templates.find((t) => {
          const role = normalizeText(t.role);
          const category = normalizeText(t.category);
          const name = normalizeText(t.name);
          return role.includes('uy vien') || category.includes('uy_vien') || name.includes('cham diem');
        });
        if (memberTemplate) setTemplateId(memberTemplate.id);
      } catch (err) {
        console.error(err);
        showToast('Không thể tải dữ liệu hội đồng.', 'error');
      }
    };
    bootstrap().catch(console.error);
  }, []);

  const availableDocs = React.useMemo<DownloadItem[]>(() => {
    if (!activeCouncil) return [];
    const docs: DownloadItem[] = [
      { kind: 'decision', label: `Quyết định ${activeCouncil.decisionCode}.pdf` },
      { kind: 'minutes', label: `Biên bản ${activeCouncil.decisionCode}.pdf` },
    ];
    for (const report of activeCouncil.projectReports ?? []) {
      if (!report.fileUrl) continue;
      docs.push({
        kind: 'report',
        reportId: report.id,
        label: report.type === 'final' ? 'Báo cáo tổng kết.pdf' : 'Báo cáo giữa kỳ.pdf',
      });
    }
    return docs;
  }, [activeCouncil]);

  const handleDownloadDoc = async (doc: DownloadItem) => {
    if (!activeCouncil) { showToast('Chưa có hội đồng được phân công.', 'error'); return; }
    try {
      if (doc.kind === 'decision') {
        await councilService.downloadDecision(activeCouncil.id, doc.label);
      } else if (doc.kind === 'minutes') {
        await councilService.downloadMinutes(activeCouncil.id, doc.label);
      } else {
        if (!activeCouncil.projectId) throw new Error('Thiếu projectId từ hội đồng.');
        await projectService.downloadReportFile(activeCouncil.projectId, doc.reportId, doc.label);
      }
      showToast(`Đã tải: ${doc.label}`);
    } catch (err) {
      showToast(typeof err === 'string' ? err : `Không thể tải ${doc.label}.`, 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    if (!templateId || !activeCouncil?.projectId) {
      showToast('Chưa có biểu mẫu ủy viên trên hệ thống.', 'error');
      return;
    }
    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Đang tải biểu mẫu ủy viên...');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Không thể tải biểu mẫu ủy viên.', 'error');
    }
  };

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
    showToast('Đã mở Google Meet trong tab mới. Vui lòng copy link phòng họp và chia sẻ cho các thành viên.');
  };

  const handleSubmitOpinion = async () => {
    if (!councilId || !opinion.trim()) {
      showToast('Vui lòng nhập ý kiến trước khi gửi.', 'error');
      return;
    }
    setSubmittingOpinion(true);
    try {
      // Submit opinion as a council review/comment
      await councilService.submitScore(councilId, 0, opinion.trim());
      setOpinionSubmitted(true);
      showToast('Đã gửi ý kiến thành công!');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Không thể gửi ý kiến.', 'error');
    } finally {
      setSubmittingOpinion(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      {toast && (
        <div className={`fixed top-24 right-4 text-white px-6 py-4 rounded-xl shadow-lg z-[9999] text-sm font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Không gian làm việc Ủy viên Hội đồng</h2>
          <p className="text-sm text-slate-500 mt-1">Xem tài liệu, theo dõi cuộc họp và gửi ý kiến đánh giá.</p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold uppercase">
          Đang hoạt động
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 space-y-6 flex-shrink-0">
          {/* Project info */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Thông tin đề tài</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-sm">
              <p className="font-bold text-[#1e40af] leading-tight">
                {activeCouncil?.projectTitle ?? 'Chưa có đề tài được phân công'}
              </p>
              <div className="flex gap-2 text-slate-500">
                <span className="w-24 shrink-0">Mã đề tài:</span>
                <span className="font-medium text-slate-800">{activeCouncil?.projectCode ?? 'N/A'}</span>
              </div>
              <div className="flex gap-2 text-slate-500">
                <span className="w-24 shrink-0">Mã hội đồng:</span>
                <span className="font-medium text-slate-800">{activeCouncil?.decisionCode ?? 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Kho tài liệu</h3>
            <div className="space-y-2">
              {availableDocs.length > 0 ? availableDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-md">
                  <span className="text-sm font-medium truncate pr-2 w-3/4 text-slate-700">{doc.label}</span>
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    disabled={!activeCouncil}
                    className="text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded uppercase font-bold hover:bg-black transition-colors shrink-0 disabled:opacity-50"
                  >
                    Tải
                  </button>
                </div>
              )) : (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có tài liệu sẵn sàng.</p>
              )}
            </div>
          </div>

          {/* Templates */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Biểu mẫu của tôi</h3>
            <button
              onClick={handleDownloadTemplate}
              disabled={!templateId || !activeCouncil?.projectId}
              className="w-full flex items-center justify-start p-3 bg-[#eff6ff] text-[#1e40af] border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium text-left disabled:opacity-50"
            >
              <span className="mr-3 font-bold">[DOC]</span> Biểu mẫu nghiệp vụ ủy viên
            </button>
          </div>
        </aside>

        {/* Main workspace */}
        <div className="flex-1 space-y-6">
          {/* Google Meet */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Cuộc họp trực tuyến</h3>
                <p className="text-xs text-slate-500">Tạo phòng Google Meet cho buổi nghiệm thu</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateMeet}
                className="flex-1 bg-[#1e40af] text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Tạo phòng Google Meet
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Sau khi tạo phòng, hãy copy link và chia sẻ với các thành viên hội đồng.</p>
          </div>

          {/* Nhiệm vụ ủy viên */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Nhiệm vụ của Ủy viên</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: '📄', title: 'Đọc tài liệu', desc: 'Nghiên cứu báo cáo và tài liệu của đề tài trước buổi họp' },
                { icon: '🤝', title: 'Tham dự cuộc họp', desc: 'Có mặt đầy đủ tại buổi họp nghiệm thu hội đồng' },
                { icon: '✍️', title: 'Gửi ý kiến', desc: 'Đóng góp ý kiến đánh giá vào biên bản nghiệm thu' },
              ].map(item => (
                <div key={item.title} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="font-bold text-sm text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-700">
                ℹ️ Lưu ý: Ủy viên không tham gia chấm điểm. Việc chấm điểm thuộc về Chủ tịch, Phản biện 1 và Phản biện 2.
              </p>
            </div>
          </div>

          {/* Form ý kiến */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-1">Gửi ý kiến Ủy viên</h3>
            <p className="text-sm text-slate-500 mb-4">Ý kiến của bạn sẽ được ghi vào biên bản nghiệm thu hội đồng.</p>

            {opinionSubmitted ? (
              <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <p className="font-bold text-emerald-800">Đã gửi ý kiến thành công!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Ý kiến của bạn đã được ghi nhận vào hệ thống.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value)}
                  rows={5}
                  disabled={!activeCouncil}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-[#1e40af] focus:border-[#1e40af] disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder={activeCouncil ? 'Nhập ý kiến, nhận xét của bạn về đề tài...' : 'Chưa có hội đồng được phân công...'}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitOpinion}
                    disabled={submittingOpinion || !activeCouncil || !opinion.trim()}
                    className="px-6 py-2.5 bg-[#1e40af] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md disabled:opacity-50 transition-all"
                  >
                    {submittingOpinion ? 'Đang gửi...' : 'Gửi ý kiến'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberPage;
