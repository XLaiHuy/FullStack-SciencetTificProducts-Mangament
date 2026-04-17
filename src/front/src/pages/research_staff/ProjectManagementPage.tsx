import React from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService, type ProjectOwnerOption } from '../../services/api/projectService';

const defaultForm = {
  title: '',
  ownerId: '',
  ownerTitle: '',
  department: '',
  field: '',
  startDate: '',
  endDate: '',
  durationMonths: 12,
  budget: 0,
  advancedAmount: 0,
};

const ProjectManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [owners, setOwners] = React.useState<ProjectOwnerOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [form, setForm] = React.useState(defaultForm);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  React.useEffect(() => {
    const loadOwners = async () => {
      setLoading(true);
      setError('');
      try {
        const projectOwners = await projectService.getOwners();
        setOwners(projectOwners);
        setForm((current) => ({
          ...current,
          ownerId: current.ownerId || projectOwners[0]?.id || '',
        }));
      } catch (e) {
        setOwners([]);
        setForm((current) => ({ ...current, ownerId: '' }));
        setError(typeof e === 'string' ? e : 'Không thể tải danh sách chủ nhiệm đề tài.');
      } finally {
        setLoading(false);
      }
    };

    loadOwners().catch(() => undefined);
  }, []);

  const updateField = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const canSubmit =
    !loading &&
    owners.length > 0 &&
    form.title.trim().length >= 5 &&
    Boolean(form.ownerId) &&
    form.department.trim() &&
    form.field.trim() &&
    form.startDate.trim() &&
    form.endDate.trim() &&
    form.durationMonths > 0 &&
    form.budget > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await projectService.create({
        title: form.title.trim(),
        ownerId: form.ownerId,
        ownerTitle: form.ownerTitle.trim() || undefined,
        department: form.department.trim(),
        field: form.field.trim(),
        startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${form.endDate}T23:59:59.999Z`).toISOString(),
        durationMonths: Number(form.durationMonths),
        budget: Number(form.budget),
        advancedAmount: Number(form.advancedAmount) || 0,
      });
      showToast(`Đã tạo đề tài ${created.code}.`);
      navigate('/research-staff/dashboard');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Tạo đề tài thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tạo đề tài mới</h1>
          <p className="mt-1 text-sm text-gray-500">Tạo đề tài và gán cho chủ nhiệm từ dữ liệu người dùng trong hệ thống.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/research-staff/dashboard')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Quay lại dashboard
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-gray-700">Tên đề tài</span>
            <input
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
              placeholder="Nhập tên đề tài"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Chủ nhiệm</span>
            <select
              value={form.ownerId}
              onChange={(event) => updateField('ownerId', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
              disabled={loading}
            >
              <option value="">{loading ? 'Đang tải chủ nhiệm...' : owners.length > 0 ? 'Chọn chủ nhiệm' : 'Không có dữ liệu chủ nhiệm'}</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} - {owner.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Học hàm / chức danh</span>
            <input
              value={form.ownerTitle}
              onChange={(event) => updateField('ownerTitle', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
              placeholder="Ví dụ: TS., PGS.TS., ThS."
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Khoa / đơn vị</span>
            <input
              value={form.department}
              onChange={(event) => updateField('department', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
              placeholder="Nhập khoa hoặc đơn vị"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Lĩnh vực</span>
            <input
              value={form.field}
              onChange={(event) => updateField('field', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
              placeholder="Ví dụ: Công nghệ thông tin"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Ngày bắt đầu</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => updateField('startDate', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Ngày kết thúc</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => updateField('endDate', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Thời hạn (tháng)</span>
            <input
              type="number"
              min={1}
              value={form.durationMonths}
              onChange={(event) => updateField('durationMonths', Number(event.target.value || 0))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Kinh phí</span>
            <input
              type="number"
              min={0}
              value={form.budget}
              onChange={(event) => updateField('budget', Number(event.target.value || 0))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Đã tạm ứng</span>
            <input
              type="number"
              min={0}
              value={form.advancedAmount}
              onChange={(event) => updateField('advancedAmount', Number(event.target.value || 0))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={() => navigate('/research-staff/dashboard')}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-button transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang tạo...' : loading ? 'Đang tải dữ liệu...' : 'Tạo đề tài'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectManagementPage;