import React from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { contractService } from '../../services/api/contractService';
import { reportService } from '../../services/api/reportService';

const ContractStatisticsPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [contracts, setContracts] = React.useState<Awaited<ReturnType<typeof contractService.getAll>>>([]);
  const [groups, setGroups] = React.useState<Array<{ status: string; count: number; totalBudget: number }>>([]);

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [contractRows, groupRows] = await Promise.all([
          contractService.getAll(),
          reportService.getContractsByStatus(),
        ]);
        setContracts(contractRows);
        setGroups(groupRows);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Không thể tải thống kê hợp đồng.');
      } finally {
        setLoading(false);
      }
    };
    run().catch(() => undefined);
  }, []);

  const countByStatus = (status: string) => groups.find((g) => g.status === status)?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Thống kê hợp đồng</h1>
        <p className="text-gray-500 text-sm mt-1">Tổng hợp trạng thái hợp đồng nghiên cứu khoa học</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          ['Tổng hợp đồng', contracts.length, 'text-gray-900'],
          ['Đã ký', countByStatus('da_ky'), 'text-emerald-600'],
          ['Chờ duyệt', countByStatus('cho_duyet'), 'text-amber-600'],
          ['Hoàn thành', countByStatus('hoan_thanh'), 'text-primary'],
        ].map(([label, val, cls]) => (
          <div key={label as string} className="bg-white p-5 rounded-xl border border-gray-100 shadow-card">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
            <p className={`text-3xl font-black ${cls}`}>{String(val)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Chi tiết hợp đồng</h2>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <tr>
                {['Mã HĐ', 'Đề tài', 'Chủ nhiệm', 'Kinh phí', 'Ngày ký', 'Trạng thái'].map((h) => (
                  <th key={h} className="px-6 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-primary">{c.code}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-[280px] truncate">{c.projectTitle}</td>
                  <td className="px-6 py-4 text-gray-500">{c.owner}</td>
                  <td className="px-6 py-4 text-gray-600">{(c.budget / 1_000_000).toFixed(0)}tr VND</td>
                  <td className="px-6 py-4 text-gray-500">{c.signedDate || '-'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-400" colSpan={6}>
                    Chưa có dữ liệu hợp đồng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ContractStatisticsPage;
