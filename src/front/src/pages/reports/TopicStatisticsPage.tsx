import React from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProjects } from '../../mock/mockData';
import { StatusBadge } from '../../components/StatusBadge';

const TopicStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [schoolYear, setSchoolYear] = React.useState('');
  const [fieldFilter, setFieldFilter] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [rows, setRows] = React.useState(mockProjects);
  const [toast, setToast] = React.useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const applyFilter = () => {
    const normalizedField = fieldFilter.trim().toLowerCase();
    const normalizedDepartment = departmentFilter.trim().toLowerCase();
    const filtered = mockProjects.filter((p) => {
      if (schoolYear) {
        const year = schoolYear.split('-')[0];
        if (!p.code.includes(year)) return false;
      }
      if (normalizedField && !p.field.toLowerCase().includes(normalizedField)) return false;
      if (normalizedDepartment && !p.department.toLowerCase().includes(normalizedDepartment)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
    setRows(filtered);
    showToast(`Da loc ${filtered.length}/${mockProjects.length} de tai.`);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thống kê Đề tài</h1>
          <p className="text-gray-500 text-sm mt-1">Chi tiết thống kê theo lĩnh vực, khoa/viện và trạng thái</p>
        </div>
        <button onClick={() => navigate('/reports/export')} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark">Xuất báo cáo</button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex gap-3">
        <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
          <option value="">Tất cả Năm học</option>
          <option value="2023-2024">2023-2024</option>
          <option value="2022-2023">2022-2023</option>
        </select>
        <input
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          placeholder="Lọc theo lĩnh vực"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white"
        />
        <input
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          placeholder="Lọc theo khoa/viện"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-primary bg-white">
          <option value="">Tất cả Trạng thái</option>
          <option value="dang_thuc_hien">Đang thực hiện</option>
          <option value="tre_han">Trễ hạn</option>
          <option value="cho_nghiem_thu">Chờ nghiệm thu</option>
          <option value="da_nghiem_thu">Đã nghiệm thu</option>
        </select>
        <button onClick={applyFilter} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl">Lọc</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
          <h2 className="font-bold text-gray-800">Danh sách đề tài theo bộ lọc</h2>
          <span className="text-xs text-gray-400">{rows.length} kết quả</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <tr>
              {['Mã', 'Tên đề tài', 'Chủ nhiệm', 'Lĩnh vực', 'Ngân sách', 'Trạng thái'].map(h => (
                <th key={h} className="px-6 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-primary">{p.code}</td>
                <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{p.title}</td>
                <td className="px-6 py-4 text-gray-500">{p.owner}</td>
                <td className="px-6 py-4 text-gray-500">{p.field}</td>
                <td className="px-6 py-4 text-gray-600">{(p.budget / 1000000).toFixed(0)}tr VNĐ</td>
                <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopicStatisticsPage;
