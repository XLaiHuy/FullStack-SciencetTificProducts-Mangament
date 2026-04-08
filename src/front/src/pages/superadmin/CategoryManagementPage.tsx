import React from 'react';
import { adminService, type AdminCategory } from '../../services/api/adminService';

const CategoryManagementPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [years, setYears] = React.useState<AdminCategory[]>([]);
  const [fields, setFields] = React.useState<AdminCategory[]>([]);
  const [newYear, setNewYear] = React.useState('');
  const [newField, setNewField] = React.useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadCategories = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [yearRows, fieldRows] = await Promise.all([
        adminService.getCategories('academic_year'),
        adminService.getCategories('field'),
      ]);
      setYears(yearRows);
      setFields(fieldRows);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai danh muc.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories().catch(() => undefined);
  }, [loadCategories]);

  const addYear = async () => {
    if (!newYear.trim()) return;
    setSaving(true);
    setError('');
    try {
      await adminService.createCategory({
        type: 'academic_year',
        value: newYear.trim(),
        label: `Nam hoc ${newYear.trim()}`,
        sortOrder: years.length,
      });
      setNewYear('');
      await loadCategories();
      showToast('Da them nam hoc moi.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the them nam hoc.');
    } finally {
      setSaving(false);
    }
  };

  const addField = async () => {
    if (!newField.trim()) return;
    setSaving(true);
    setError('');
    try {
      await adminService.createCategory({
        type: 'field',
        value: newField.trim(),
        label: newField.trim(),
        sortOrder: fields.length,
      });
      setNewField('');
      await loadCategories();
      showToast('Da them linh vuc nghien cuu.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the them linh vuc.');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (row: AdminCategory) => {
    setSaving(true);
    setError('');
    try {
      await adminService.deleteCategory(row.id);
      await loadCategories();
      showToast(`Da an danh muc ${row.label}.`);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the cap nhat danh muc.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quan ly danh muc</h1>
          <p className="text-gray-500 text-sm mt-1">Cau hinh danh muc nam hoc va linh vuc nghien cuu</p>
        </div>
        <button
          type="button"
          onClick={() => loadCategories().catch(() => undefined)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Tai lai
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Dang tai danh muc...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Danh muc nam hoc</h2>
            <div className="flex gap-2 mb-4">
              <input
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="VD: 2025-2026"
                className="flex-1 rounded-xl border-gray-200 text-sm"
              />
              <button
                type="button"
                onClick={() => addYear().catch(() => undefined)}
                disabled={saving}
                className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50"
              >
                Them
              </button>
            </div>
            <div className="space-y-3">
              {years.map((row) => (
                <div key={row.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-sm text-gray-800">{row.value}</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => removeCategory(row).catch(() => undefined)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 disabled:opacity-50"
                  >
                    An
                  </button>
                </div>
              ))}
              {years.length === 0 && <p className="text-sm text-gray-400">Chua co nam hoc nao.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Linh vuc nghien cuu</h2>
            <div className="flex gap-2 mb-4">
              <input
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                placeholder="Nhap linh vuc moi..."
                className="flex-1 rounded-xl border-gray-200 text-sm"
              />
              <button
                type="button"
                onClick={() => addField().catch(() => undefined)}
                disabled={saving}
                className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50"
              >
                Them
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((row) => (
                <span
                  key={row.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold"
                >
                  {row.label}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => removeCategory(row).catch(() => undefined)}
                    className="text-primary/40 hover:text-rose-500 font-bold disabled:opacity-50"
                  >
                    x
                  </button>
                </span>
              ))}
              {fields.length === 0 && <p className="text-sm text-gray-400">Chua co linh vuc nao.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementPage;
