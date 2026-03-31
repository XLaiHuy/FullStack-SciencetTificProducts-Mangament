import React, { useMemo, useRef, useState } from 'react';
import { councilService } from '../../services/api/councilService';
import { projectService } from '../../services/api/projectService';
import { templateService } from '../../services/api/templateService';
import type { Council, Template } from '../../types';

type DownloadItem =
  | { kind: 'decision'; label: string }
  | { kind: 'minutes'; label: string }
  | { kind: 'report'; label: string; reportId: string };

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const SecretaryPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [councilId, setCouncilId] = useState('');
  const [activeCouncil, setActiveCouncil] = useState<Council | null>(null);
  const [scoreRows, setScoreRows] = useState<Array<{ name: string; role: string; score?: number }>>([]);
  const [minutesContent, setMinutesContent] = useState('');
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [submittingMinutes, setSubmittingMinutes] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [memberDecisions, setMemberDecisions] = useState<Record<string, 'accepted' | 'rework'>>({});
  const minutesFileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadCouncilContext = async () => {
    setLoadingData(true);
    try {
      const list = await councilService.getAll();
      if (!list.length) {
        setActiveCouncil(null);
        return;
      }

      const id = list[0].id;
      setCouncilId(id);

      const [detail, summary, templates] = await Promise.all([
        councilService.getById(id),
        councilService.getScoreSummary(id),
        templateService.getAll().catch(() => [] as Template[]),
      ]);

      if (detail) setActiveCouncil(detail);

      const reviews = summary?.items ?? [];
      setScoreRows(
        reviews.map((r: any) => ({
          name: r.memberName ?? 'Thanh vien',
          role: r.role ?? 'Thanh vien',
          score: typeof r.score === 'number' ? r.score : undefined,
        }))
      );

      const secretaryTemplate = templates.find((t) => {
        const role = normalizeText(t.role);
        const category = normalizeText(t.category);
        const name = normalizeText(t.name);
        return role.includes('thu ky') || category.includes('thu_ky') || name.includes('bien ban');
      });
      if (secretaryTemplate) {
        setTemplateId(secretaryTemplate.id);
      }
    } catch (err) {
      console.error(err);
      showToast('Khong the tai du lieu hoi dong.');
    } finally {
      setLoadingData(false);
    }
  };

  React.useEffect(() => {
    loadCouncilContext().catch(console.error);
  }, []);

  const downloadableDocs = useMemo<DownloadItem[]>(() => {
    if (!activeCouncil) return [];

    const docs: DownloadItem[] = [
      { kind: 'decision', label: `Quyet dinh ${activeCouncil.decisionCode}.pdf` },
      { kind: 'minutes', label: `Bien ban ${activeCouncil.decisionCode}.pdf` },
    ];

    for (const report of activeCouncil.projectReports ?? []) {
      if (!report.fileUrl) continue;
      docs.push({
        kind: 'report',
        reportId: report.id,
        label: report.type === 'final' ? 'Bao cao tong ket.pdf' : 'Bao cao giua ky.pdf',
      });
    }

    return docs;
  }, [activeCouncil]);

  const handleDownloadDoc = async (doc: DownloadItem) => {
    if (!activeCouncil) {
      showToast('Chua co hoi dong de tai tep.');
      return;
    }

    try {
      if (doc.kind === 'decision') {
        await councilService.downloadDecision(activeCouncil.id, doc.label);
      } else if (doc.kind === 'minutes') {
        await councilService.downloadMinutes(activeCouncil.id, doc.label);
      } else {
        if (!activeCouncil.projectId) throw new Error('Khong xac dinh duoc de tai cua hoi dong.');
        await projectService.downloadReportFile(activeCouncil.projectId, doc.reportId, doc.label);
      }

      showToast(`Da tai: ${doc.label}`);
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : `Khong the tai ${doc.label}.`);
    }
  };

  const handleDownloadSummaryTemplate = async () => {
    if (!activeCouncil?.projectId) {
      showToast('Chua co de tai de tai bieu mau.');
      return;
    }
    if (!templateId) {
      showToast('Chua cau hinh bieu mau Thu ky tren he thong.');
      return;
    }

    try {
      await templateService.fill(templateId, activeCouncil.projectId);
      showToast('Da tai bieu mau Thu ky tu he thong.');
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : 'Khong the tai bieu mau Thu ky.');
    }
  };

  const handleUploadMinutes = async () => {
    if (!councilId) {
      showToast('Chua co hoi dong de gui bien ban.');
      return;
    }
    if (!minutesFile) {
      showToast('Vui long chon file bien ban nghiem thu.');
      return;
    }

    setSubmittingMinutes(true);
    try {
      await councilService.submitMinutes(
        councilId,
        minutesContent.trim() || 'Thu ky gui bien ban nghiem thu chinh thuc.',
        minutesFile
      );
      const updated = await councilService.getById(councilId);
      if (updated) setActiveCouncil(updated);
      showToast('Da tai len bien ban nghiem thu chinh thuc.');
      setMinutesFile(null);
    } catch (e) {
      console.error(e);
      showToast(typeof e === 'string' ? e : 'Khong the tai len bien ban nghiem thu.');
    } finally {
      setSubmittingMinutes(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Thông tin Đề tài</h2>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-400">Mã đề tài</p><p className="text-sm font-semibold">{activeCouncil?.projectCode ?? 'N/A'}</p></div>
              <div><p className="text-xs text-gray-400">Tên đề tài</p><p className="text-sm font-medium leading-relaxed">{activeCouncil?.projectTitle ?? 'Chua co du lieu'}</p></div>
              <div><p className="text-xs text-gray-400">Mã hội đồng</p><p className="text-sm font-semibold">{activeCouncil?.decisionCode ?? 'N/A'}</p></div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Kho Tài liệu</h2>
            {downloadableDocs.length ? (
              <ul className="space-y-2">
                {downloadableDocs.map((doc, idx) => (
                  <li key={`${doc.label}-${idx}`}>
                    <button onClick={() => handleDownloadDoc(doc)} className="flex items-center text-sm text-blue-600 hover:underline py-1">{doc.label}</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Chua co tai lieu san sang de tai xuong.</p>
            )}
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Biểu mẫu của tôi</h2>
            <button
              onClick={handleDownloadSummaryTemplate}
              disabled={!templateId || !activeCouncil?.projectId}
              className="w-full bg-[#EFF6FF] text-[#1E40AF] border border-blue-200 font-medium py-3 px-4 rounded-md text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              Tải Phiếu tổng hợp điểm & Biên bản
            </button>
          </section>
        </aside>

        <div className="lg:col-span-8 space-y-6">
          <header className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Bảng điều khiển Thư ký Hội đồng</h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý phiên họp nghiệm thu và tổng hợp dữ liệu đánh giá.</p>
          </header>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Bảng Tổng hợp Real-time</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Đang cập nhật</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Thành viên</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">Vai trò</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-center">Điểm số</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-right">Thao tác dữ liệu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(scoreRows.length ? scoreRows : [{ name: 'Chưa có dữ liệu', role: '-', score: undefined }]).map((row, idx) => (
                  <tr key={`${row.name}-${idx}`}>
                    <td className="px-6 py-4 text-sm font-medium">{row.name}</td><td className="px-6 py-4 text-sm text-gray-600">{row.role}</td><td className="px-6 py-4 text-sm font-bold text-center">{row.score ?? '...'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          const key = `${row.name}-${idx}`;
                          setMemberDecisions((prev) => ({ ...prev, [key]: 'accepted' }));
                          showToast(`Da xac nhan hop le cho ${row.name}`);
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                      >
                        Xác nhận hợp lệ
                      </button>
                      <button
                        onClick={() => {
                          const key = `${row.name}-${idx}`;
                          setMemberDecisions((prev) => ({ ...prev, [key]: 'rework' }));
                          showToast(`Da yeu cau ${row.name} nhap lai diem.`);
                        }}
                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        Yêu cầu nhập lại
                      </button>
                      {memberDecisions[`${row.name}-${idx}`] === 'accepted' && (
                        <span className="text-[10px] font-bold text-green-600">Đã xác nhận</span>
                      )}
                      {memberDecisions[`${row.name}-${idx}`] === 'rework' && (
                        <span className="text-[10px] font-bold text-red-600">Chờ nhập lại</span>
                      )}
                    </td>
                  </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4 text-sm font-bold text-[#1E40AF]" colSpan={2}>Điểm trung bình cộng</td>
                    <td className="px-6 py-4 text-lg font-bold text-[#1E40AF] text-center">{scoreRows.length ? (scoreRows.filter(r => typeof r.score === 'number').reduce((a, r) => a + (r.score as number), 0) / Math.max(scoreRows.filter(r => typeof r.score === 'number').length, 1)).toFixed(1) : '0.0'}</td>
                    <td className="px-6 py-4 text-sm italic text-[#1E40AF] text-right">Tự động tính toán</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Ghi chú kết luận & Yêu cầu chỉnh sửa</h3>
            <textarea
              value={minutesContent}
              onChange={(e) => setMinutesContent(e.target.value)}
              className="w-full border-gray-300 rounded-lg focus:ring-[#1E40AF] focus:border-[#1E40AF] text-sm p-4 h-48"
              placeholder="Nhập các nội dung thảo luận và yêu cầu từ hội đồng tại đây..."
            />
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-800 mb-2">Quản lý sau nghiệm thu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input
                  ref={minutesFileInputRef}
                  type="file"
                  className="hidden"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setMinutesFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => minutesFileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-[#1E40AF] cursor-pointer transition-colors bg-gray-50"
                >
                  <div className="mb-3 text-gray-400 text-3xl font-bold">+</div>
                  <p className="text-sm font-medium text-gray-700">
                    {minutesFile ? `Đã chọn: ${minutesFile.name}` : 'Tải lên Biên bản nghiệm thu chính thức'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Định dạng hỗ trợ: PDF (Max 10MB)</p>
                </button>
                <button
                  type="button"
                  onClick={handleUploadMinutes}
                  disabled={submittingMinutes || !minutesFile}
                  className="mt-3 w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-black disabled:opacity-50"
                >
                  {submittingMinutes ? 'ĐANG GỬI BIÊN BẢN...' : 'GỬI BIÊN BẢN CHÍNH THỨC'}
                </button>
                {loadingData && <p className="text-xs text-gray-400 mt-2">Dang dong bo du lieu hoi dong...</p>}
              </div>
              
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Cấp quyền xem biên bản cho Chủ nhiệm</span>
                  <button 
                    type="button" 
                    onClick={() => setPermissionGranted(!permissionGranted)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2 ${permissionGranted ? 'bg-[#1E40AF]' : 'bg-gray-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${permissionGranted ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>
                <button onClick={async () => {
                  if (!councilId) {
                    showToast('Chua co hoi dong de cap nhat trang thai.');
                    return;
                  }
                  try {
                    await councilService.updateStatus(councilId, 'da_hoan_thanh', 'secretary');
                    showToast('Đã xác nhận hoàn thành chỉnh sửa');
                  } catch (e) {
                    console.error(e);
                    showToast(typeof e === 'string' ? e : 'Khong the cap nhat trang thai hoi dong.');
                  }
                }} className="w-full bg-[#1E40AF] text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                  Xác nhận hoàn thành chỉnh sửa
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SecretaryPage;
