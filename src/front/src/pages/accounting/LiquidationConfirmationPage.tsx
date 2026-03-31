import React, { useState } from 'react';
import { accountingService } from '../../services/api/accountingService';
import { settlementService } from '../../services/api/settlementService';

interface LiquidationRecord {
  id: string;
  projectCode: string;
  ownerName: string;
  amount: number;
  status: 'pending' | 'confirmed';
  notes?: string;
}

const LiquidationConfirmationPage: React.FC = () => {
  const [records, setRecords] = useState<LiquidationRecord[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const refresh = async () => {
    const docs = await accountingService.getDocuments();
    setRecords(docs.map((d) => ({
      id: d.id,
      projectCode: d.project?.code ?? d.code,
      ownerName: d.project?.owner?.name ?? '-',
      amount: Number(d.totalAmount ?? 0),
      status: d.status === 'da_xac_nhan' ? 'confirmed' : 'pending',
      notes: d.status === 'cho_bo_sung' ? 'Cần bổ sung chứng từ' : undefined,
    })));
  };

  React.useEffect(() => {
    refresh().catch(console.error);
  }, []);

  const confirmRecord = async (id: string) => {
    await settlementService.approve(id);
    await refresh();
    showToast('Đã xác nhận thanh lý thành công!');
  };

  const requestSupplement = async (id: string) => {
    setRecords((prev) => prev.map((record) => (
      record.id === id
        ? { ...record, notes: 'Da gui yeu cau bo sung chung tu thanh toan.' }
        : record
    )));
    showToast('Đã gửi yêu cầu bổ sung chứng từ.');
  };

  const viewRecordDetail = (record: LiquidationRecord) => {
    showToast(`Chi tiet ${record.projectCode}: ${record.amount.toLocaleString('vi-VN')} VNĐ.`);
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Xác nhận Thanh lý</h1>
        <p className="text-gray-500 text-sm mt-1">Xem xét và xác nhận các đề nghị thanh lý kinh phí nghiên cứu</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6">
        {[
          ['Chờ xác nhận', records.filter(r => r.status === 'pending').length.toString(), 'text-orange-600', 'border-l-orange-500'],
          ['Đã xác nhận', records.filter(r => r.status === 'confirmed').length.toString(), 'text-emerald-600', 'border-l-emerald-500'],
          ['Tổng kinh phí', records.reduce((a, r) => a + r.amount, 0).toLocaleString('vi-VN') + ' VNĐ', 'text-primary', 'border-l-primary'],
        ].map(([label, val, cls, border]) => (
          <div key={label} className={`bg-white p-6 rounded-xl border border-gray-100 shadow-card border-l-4 ${border}`}>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
            <p className={`text-2xl font-black ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Pending records */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
          Hồ sơ chờ xác nhận
        </h2>
        <div className="space-y-4">
          {records.filter(r => r.status === 'pending').map(rec => (
            <div key={rec.id} className="bg-white rounded-xl border border-orange-100 shadow-card p-6 flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded uppercase">Chờ Thanh lý</span>
                  <span className="font-bold text-sm text-gray-900">{rec.projectCode}</span>
                </div>
                <p className="text-sm text-gray-600">Chủ nhiệm: <span className="font-semibold text-gray-800">{rec.ownerName}</span></p>
                <p className="text-sm text-gray-600 mt-1">Kinh phí đề nghị: <span className="font-bold text-primary">{rec.amount.toLocaleString('vi-VN')} VNĐ</span></p>
                {rec.notes && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700">Ghi chú: {rec.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-[140px]">
                <button
                  onClick={() => confirmRecord(rec.id)}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-card hover:bg-emerald-700 text-center"
                >
                  ✓ Xác nhận thanh lý
                </button>
                <button
                  onClick={() => requestSupplement(rec.id)}
                  className="px-5 py-2 border border-red-200 text-red-600 bg-red-50 text-xs font-bold rounded-xl hover:bg-red-100 text-center"
                >
                  Yêu cầu bổ sung
                </button>
                <button
                  onClick={() => viewRecordDetail(rec)}
                  className="px-5 py-2 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 text-center"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Confirmed records */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          Đã xác nhận
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Mã đề tài', 'Chủ nhiệm', 'Kinh phí', 'Trạng thái'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.filter(r => r.status === 'confirmed').map(rec => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-primary">{rec.projectCode}</td>
                  <td className="px-6 py-4 text-gray-700">{rec.ownerName}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{rec.amount.toLocaleString('vi-VN')} VNĐ</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase">
                      Đã xác nhận
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default LiquidationConfirmationPage;
