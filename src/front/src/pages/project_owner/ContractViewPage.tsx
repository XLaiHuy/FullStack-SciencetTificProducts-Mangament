import React, { useEffect, useMemo, useState } from 'react';
import { contractService } from '../../services/api/contractService';
import type { Contract } from '../../types';

const ContractViewPage: React.FC = () => {
  const [toast, setToast] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeContractId, setActiveContractId] = useState('');
  const [downloading, setDownloading] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    contractService.getAll().then((items) => {
      setContracts(items);
      if (!items.length) return;
      const preferred = items.find((item) => item.status === 'da_ky') ?? items[0];
      setActiveContractId(preferred.id);
    }).catch((err) => {
      console.error(err);
      showToast('Không thể tải dữ liệu hợp đồng.');
    });
  }, []);

  const activeContract = useMemo(
    () => contracts.find((item) => item.id === activeContractId) ?? contracts[0],
    [contracts, activeContractId]
  );

  const statusLabel = useMemo(() => {
    if (!activeContract) return 'Không có dữ liệu';
    if (activeContract.status === 'da_ky') return 'Đã ký';
    if (activeContract.status === 'cho_duyet') return 'Chờ duyệt';
    if (activeContract.status === 'hoan_thanh') return 'Hoàn thành';
    return 'Hủy';
  }, [activeContract]);

  const handleDownloadPdf = async () => {
    if (!activeContract) {
      showToast('Chưa có hợp đồng để tải.');
      return;
    }
    setDownloading(true);
    try {
      const fallbackName = `HopDong_${activeContract.code.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
      await contractService.downloadPdf(activeContract.id, fallbackName);
      showToast('Đã tải hợp đồng PDF từ hệ thống.');
    } catch (err) {
      console.error(err);
      showToast(typeof err === 'string' ? err : 'Không thể tải file hợp đồng.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Xem Hợp đồng</h1>
        <p className="text-slate-500 text-sm mt-1">Hợp đồng nghiên cứu khoa học của bạn</p>
      </div>
      {contracts.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chọn hợp đồng</label>
          <select
            value={activeContractId}
            onChange={(e) => setActiveContractId(e.target.value)}
            className="w-full rounded-lg border-slate-300 text-sm"
          >
            {contracts.map((item) => (
              <option key={item.id} value={item.id}>{item.code} - {item.projectTitle}</option>
            ))}
          </select>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{activeContract?.code ?? 'N/A'}</h2>
            <p className="text-sm text-slate-500">Ký ngày: {activeContract?.signedDate ?? 'Chưa ký'}</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase">{statusLabel}</span>
        </div>
        <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
          <div id="contract-printable" className="bg-white border border-gray-200 p-10 min-h-96 text-[11px] leading-relaxed shadow-sm max-w-2xl mx-auto">
            <div className="text-center mb-6 font-bold space-y-1">
              <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="border-b border-gray-900 w-32 mx-auto pb-1">Độc lập - Tự do - Hạnh phúc</p>
            </div>
            <div className="text-center mb-6 space-y-1">
              <p className="font-bold text-xs uppercase">HỢP ĐỒNG NGHIÊN CỨU KHOA HỌC</p>
              <p className="italic text-gray-500">Số: {activeContract?.code ?? 'N/A'}</p>
            </div>
            <div className="space-y-4">
              <div><p className="font-bold uppercase mb-1">BÊN A: Trường Đại học Mở TP. Hồ Chí Minh</p></div>
              <div>
                <p className="font-bold uppercase mb-1">BÊN B: {activeContract?.owner ?? 'N/A'}</p>
                <p><span className="inline-block w-24">Tên đề tài:</span> <span className="font-bold text-primary">{activeContract?.projectTitle ?? 'N/A'}</span></p>
                <p><span className="inline-block w-24">Kinh phí:</span> <span className="font-bold">{Number(activeContract?.budget ?? 0).toLocaleString('vi-VN')} VNĐ</span></p>
              </div>
              <div className="pt-4 border-t border-gray-100 text-gray-500 italic">{activeContract?.notes || '[Nội dung điều khoản pháp lý...]'}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || !activeContract}
            className="px-5 py-2 text-sm font-semibold text-primary bg-white border border-primary rounded-lg hover:bg-blue-50"
          >
            {downloading ? 'Đang tải...' : 'Tải xuống PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractViewPage;
