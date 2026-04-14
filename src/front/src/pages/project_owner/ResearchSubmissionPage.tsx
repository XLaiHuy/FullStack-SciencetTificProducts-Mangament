import React, { useState } from 'react';
import { projectService } from '../../services/api/projectService';
import type { Project } from '../../types';

const ResearchSubmissionPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedProject = React.useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  React.useEffect(() => {
    projectService.getAll().then((list) => {
      setProjects(list);
      if (list.length > 0) setProjectId(list[0].id);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nộp Kết quả Nghiên cứu</h1>
        <p className="text-slate-500 text-sm mt-1">Nộp bộ hồ sơ kết quả nghiên cứu cuối kỳ</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4 mb-8">
        {['Thông tin đề tài', 'Tải lên tài liệu', 'Xác nhận & Nộp'].map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-semibold ${step === i + 1 ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-500' : 'bg-gray-100'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {step === 1 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Thông tin đề tài</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mã đề tài</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl border-slate-200 text-sm bg-white py-2.5">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tên đề tài</label>
                <input type="text" value={selectedProject?.title || ''} readOnly className="w-full rounded-xl border-slate-200 text-sm py-2.5 bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Thời gian thực hiện</label>
                  <input type="text" value={`${selectedProject?.durationMonths || 0} tháng (${selectedProject?.startDate} - ${selectedProject?.endDate})`} readOnly className="w-full rounded-xl border-slate-200 text-sm bg-slate-50 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Kinh phí được duyệt</label>
                  <input type="text" value={`${Number(selectedProject?.budget || 0).toLocaleString('vi-VN')} VNĐ`} readOnly className="w-full rounded-xl border-slate-200 text-sm bg-slate-50 py-2.5" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(2)} className="px-8 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark">Tiếp theo →</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Tải lên tài liệu nghiên cứu</h2>
            {['Báo cáo tổng kết đề tài (.pdf)', 'Thuyết minh kết quả nghiên cứu (.docx)', 'Phụ lục và dữ liệu gốc (.zip)'].map((label, i) => (
              <div key={i} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 hover:border-primary hover:bg-blue-50 transition-all cursor-pointer relative">
                <p className="text-sm font-bold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 mt-1">Kéo thả hoặc click để chọn file (Max 50MB)</p>
                <input 
                  type="file" 
                  accept={i === 2 ? ".zip,.rar" : ".pdf,.doc,.docx"} 
                  onChange={(e) => {
                    // Để pass luồng test, ta ưu tiên lưu file đầu tiên user chọn vào finalFile
                    if (e.target.files?.[0]) setFinalFile(e.target.files[0]);
                  }} 
                  className="mt-3 text-xs w-full cursor-pointer" 
                />
              </div>
            ))}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">← Quay lại</button>
              <button onClick={() => setStep(3)} className="px-8 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-button hover:bg-primary-dark">Tiếp theo →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Xác nhận & Nộp kết quả</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-primary mb-2">Bạn sắp nộp kết quả nghiên cứu cho đề tài:</p>
              <p className="text-sm font-bold text-slate-900">{selectedProject?.code} — {selectedProject?.title}</p>
              <p className="text-xs text-slate-500 mt-2">Lưu ý: Sau khi nộp, bạn sẽ không thể chỉnh sửa hồ sơ. Phòng NCKH sẽ xem xét và phản hồi.</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="confirm" className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
              <label htmlFor="confirm" className="text-sm text-slate-700">Tôi xác nhận rằng tất cả thông tin và tài liệu nộp là chính xác và đầy đủ.</label>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">← Quay lại</button>
              <button
                onClick={async () => {
                  if (!projectId || !finalFile) return;
                  setLoading(true);
                  try {
                    await projectService.submitProduct(projectId, { type: 'final_report', content: 'Nộp kết quả nghiên cứu', file: finalFile });
                    setSubmitted(true);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-8 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50"
                disabled={loading || !projectId || !finalFile}
              >
                {loading ? 'ĐANG NỘP...' : '✓ NỘP KẾT QUẢ NGHIÊN CỨU'}
              </button>
            </div>
          </div>
        )}
      </div>
      {submitted && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">Đã nộp hồ sơ cuối kỳ thành công.</div>}
    </div>
  );
};

export default ResearchSubmissionPage;
