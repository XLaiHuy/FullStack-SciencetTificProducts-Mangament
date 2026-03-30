import React, { useState } from 'react';

const CategoryManagementPage: React.FC = () => {
  const [years] = useState(['2023-2024', '2022-2023', '2021-2022', '2020-2021']);
  const [fields, setFields] = useState(['Khoa học Tự nhiên', 'Khoa học Xã hội', 'Kỹ thuật & Công nghệ', 'Y Dược', 'Nông nghiệp & Sinh học', 'Kinh tế & Quản trị']);
  const [newField, setNewField] = useState('');
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const addField = () => {
    if (newField.trim()) {
      setFields(prev => [...prev, newField.trim()]);
      setNewField('');
      showToast(`Đã thêm lĩnh vực "${newField.trim()}"`);
    }
  };

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Danh mục</h1>
        <p className="text-gray-500 text-sm mt-1">Cấu hình danh mục năm học và lĩnh vực nghiên cứu</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Academic years */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Danh mục Năm học</h2>
            <button onClick={() => showToast('Đã thêm năm học mới!')} className="text-primary text-sm font-bold hover:underline">+ Thêm mới</button>
          </div>
          <div className="space-y-3">
            {years.map((y, i) => (
              <div key={y} className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                <span className="font-semibold text-sm text-gray-800">{y}</span>
                <div className="flex items-center gap-3">
                  {i === 0 && <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Hiện tại</span>}
                  {i > 0 && <span className="text-xs text-gray-400 font-medium">Lưu trữ</span>}
                  <button className="text-xs font-bold text-gray-400 hover:text-red-500">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Research fields */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Lĩnh vực nghiên cứu</h2>
            <span className="text-xs text-gray-400 font-medium">{fields.length} lĩnh vực</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {fields.map(f => (
              <span key={f} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
                {f}
                <button onClick={() => { setFields(prev => prev.filter(x => x !== f)); showToast(`Đã xóa lĩnh vực "${f}"`); }} className="text-primary/40 hover:text-red-500 font-bold">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newField}
              onChange={e => setNewField(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addField()}
              type="text"
              placeholder="Tên lĩnh vực mới..."
              className="flex-1 rounded-xl border-gray-200 text-sm py-2.5 focus:ring-primary"
            />
            <button onClick={addField} className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark">Thêm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementPage;
