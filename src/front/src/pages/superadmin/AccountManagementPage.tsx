import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  adminService,
  type AdminCouncilRole,
  type AdminUser,
  type AdminUserRole,
} from '../../services/api/adminService';

const ROLE_LABELS: Record<AdminUserRole, string> = {
  research_staff: 'Phong NCKH',
  project_owner: 'Chu nhiem',
  council_member: 'Hoi dong',
  accounting: 'Ke toan',
  archive_staff: 'Luu tru',
  report_viewer: 'Bao cao',
  superadmin: 'Superadmin',
};

const COUNCIL_ROLE_LABELS: Record<AdminCouncilRole, string> = {
  chairman: 'Chu tich',
  reviewer: 'Phan bien',
  secretary: 'Thu ky',
  member: 'Uy vien',
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  councilRole: AdminCouncilRole;
  title: string;
  department: string;
};

const DEFAULT_FORM: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'project_owner',
  councilRole: 'member',
  title: '',
  department: '',
};

const AccountManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<AdminUserRole | ''>('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [users, setUsers] = React.useState<AdminUser[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null);
  const [resettingUser, setResettingUser] = React.useState<AdminUser | null>(null);
  const [form, setForm] = React.useState<UserFormState>(DEFAULT_FORM);
  const [temporaryPassword, setTemporaryPassword] = React.useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getUsers({ search: search || undefined, role: roleFilter || undefined, limit: 200 });
      setUsers(res.items);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai danh sach tai khoan.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  React.useEffect(() => {
    loadUsers().catch(() => undefined);
  }, [loadUsers]);

  React.useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setCreateOpen(true);
      setForm(DEFAULT_FORM);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const closeAllModals = () => {
    setCreateOpen(false);
    setEditingUser(null);
    setResettingUser(null);
    setTemporaryPassword('');
    setForm(DEFAULT_FORM);
    setSubmitting(false);
  };

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setCreateOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      councilRole: user.councilRole ?? 'member',
      title: user.title ?? '',
      department: user.department ?? '',
    });
  };

  const submitCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Vui long nhap day du ho ten, email va mat khau.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await adminService.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        role: form.role,
        councilRole: form.role === 'council_member' ? form.councilRole : undefined,
        title: form.title.trim() || undefined,
        department: form.department.trim() || undefined,
      });
      closeAllModals();
      await loadUsers();
      showToast('Da tao tai khoan moi.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Tao tai khoan that bai.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitUpdate = async () => {
    if (!editingUser) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Vui long nhap day du ho ten va email.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await adminService.updateUser(editingUser.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        councilRole: form.role === 'council_member' ? form.councilRole : undefined,
        title: form.title.trim(),
        department: form.department.trim(),
      });
      closeAllModals();
      await loadUsers();
      showToast('Da cap nhat thong tin tai khoan.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Cap nhat tai khoan that bai.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitResetPassword = async () => {
    if (!resettingUser) return;
    if (!temporaryPassword.trim() || temporaryPassword.trim().length < 6) {
      setError('Mat khau tam thoi phai toi thieu 6 ky tu.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await adminService.resetPassword(resettingUser.id, temporaryPassword.trim());
      closeAllModals();
      await loadUsers();
      showToast('Da dat mat khau tam thoi va bat buoc doi mat khau.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Dat lai mat khau that bai.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (user: AdminUser) => {
    setError('');
    try {
      const result = await adminService.toggleLock(user.id);
      await loadUsers();
      showToast(result.isLocked ? `Da khoa tai khoan ${user.name}.` : `Da mo khoa tai khoan ${user.name}.`);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the cap nhat trang thai khoa tai khoan.');
    }
  };

  const renderModal = (
    title: string,
    content: React.ReactNode,
    actions: React.ReactNode,
  ) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button type="button" onClick={closeAllModals} className="text-gray-400 hover:text-rose-500 font-bold">
            x
          </button>
        </div>
        <div className="p-6 space-y-4">{content}</div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" onClick={closeAllModals} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">
            Huy
          </button>
          {actions}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quan ly tai khoan</h1>
          <p className="text-gray-500 text-sm mt-1">Quan ly toan bo nguoi dung trong he thong</p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark"
        >
          + Tao tai khoan moi
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="text"
          placeholder="Tim theo ten, email..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as AdminUserRole | '')}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
        >
          <option value="">Tat ca vai tro</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => loadUsers().catch(() => undefined)}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black"
        >
          Tai lai
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Danh sach tai khoan ({users.length})</h2>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-gray-500">Dang tai du lieu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Ho ten', 'Email', 'Vai tro', 'Phong/Ban', 'Trang thai', 'Thao tac'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20 uppercase">
                      {ROLE_LABELS[u.role]}
                      {u.role === 'council_member' && u.councilRole ? ` / ${COUNCIL_ROLE_LABELS[u.councilRole]}` : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{u.department || '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        u.isLocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {u.isLocked ? 'Bi khoa' : 'Hoat dong'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-[11px] font-bold text-primary hover:underline">
                        Sua
                      </button>
                      <button
                        onClick={() => {
                          setResettingUser(u);
                          setTemporaryPassword('');
                          setError('');
                        }}
                        className="text-[11px] font-bold text-gray-500 hover:text-primary"
                      >
                        Dat lai MK
                      </button>
                      <button
                        onClick={() => handleToggleLock(u).catch(() => undefined)}
                        className={`text-[11px] font-bold ${u.isLocked ? 'text-emerald-600 hover:text-emerald-700' : 'text-rose-500 hover:text-rose-700'}`}
                      >
                        {u.isLocked ? 'Mo khoa' : 'Khoa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(createOpen || editingUser) &&
        renderModal(
          createOpen ? 'Tao tai khoan moi' : 'Cap nhat tai khoan',
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Ho ten
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Email
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
              />
            </label>
            {createOpen && (
              <label className="block text-sm font-medium text-gray-700 md:col-span-2">
                Mat khau ban dau
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-1 w-full rounded-lg border-gray-200 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Nguoi dung se bi bat buoc doi mat khau o lan dang nhap dau tien.</p>
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Vai tro
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as AdminUserRole }))}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {form.role === 'council_member' && (
              <label className="block text-sm font-medium text-gray-700">
                Vai tro hoi dong
                <select
                  value={form.councilRole}
                  onChange={(e) => setForm((prev) => ({ ...prev, councilRole: e.target.value as AdminCouncilRole }))}
                  className="mt-1 w-full rounded-lg border-gray-200 text-sm"
                >
                  {Object.entries(COUNCIL_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Hoc ham / Chuc danh
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Don vi
              <input
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
              />
            </label>
          </div>,
          <button
            type="button"
            onClick={() => (createOpen ? submitCreate() : submitUpdate()).catch(() => undefined)}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Dang luu...' : createOpen ? 'Tao tai khoan' : 'Luu thay doi'}
          </button>,
        )}

      {resettingUser &&
        renderModal(
          'Dat lai mat khau tam thoi',
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Tai khoan: <span className="font-semibold">{resettingUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700">
              Mat khau tam thoi moi
              <input
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
                placeholder="Toi thieu 6 ky tu"
              />
            </label>
            <p className="text-xs text-gray-500">
              Sau thao tac nay, user phai doi mat khau o lan dang nhap tiep theo.
            </p>
          </div>,
          <button
            type="button"
            onClick={() => submitResetPassword().catch(() => undefined)}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Dang cap nhat...' : 'Xac nhan dat mat khau'}
          </button>,
        )}
    </div>
  );
};

export default AccountManagementPage;
