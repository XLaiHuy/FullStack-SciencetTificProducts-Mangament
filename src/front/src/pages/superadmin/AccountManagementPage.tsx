import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  adminService,
  type AdminCouncilRole,
  type AdminUser,
  type AdminUserRole,
} from '../../services/api/adminService';

const PAGE_SIZE = 40;

const ROLE_LABELS: Record<AdminUserRole, string> = {
  research_staff: 'Phong NCKH',
  project_owner: 'Chủ nhiệm',
  council_member: 'Hội đồng',
  accounting: 'Kế toán',
  archive_staff: 'Lưu trữ',
  report_viewer: 'Báo cáo',
  superadmin: 'Superadmin',
};

const COUNCIL_ROLE_LABELS: Record<AdminCouncilRole, string> = {
  chairman: 'Chủ tịch',
  reviewer: 'Phản biện',
  secretary: 'Thư ký',
  member: 'Ủy viên',
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
  const [page, setPage] = React.useState(1);

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
      setError(typeof e === 'string' ? e : 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  React.useEffect(() => {
    loadUsers().catch(() => undefined);
  }, [loadUsers]);

  React.useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = React.useMemo(
    () => users.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [users, safePage],
  );

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
      setError('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
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
      showToast('Đã tạo tài khoản mới.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Tạo tài khoản thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitUpdate = async () => {
    if (!editingUser) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên và email.');
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
      showToast('Đã cập nhật thông tin tài khoản.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Cập nhật tài khoản thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitResetPassword = async () => {
    if (!resettingUser) return;
    if (!temporaryPassword.trim() || temporaryPassword.trim().length < 6) {
      setError('Mật khẩu tạm thời phải tối thiểu 6 ký tự.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await adminService.resetPassword(resettingUser.id, temporaryPassword.trim());
      closeAllModals();
      await loadUsers();
      showToast('Đã đặt mật khẩu tạm thời và bắt buộc đổi mật khẩu.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Đặt lại mật khẩu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (user: AdminUser) => {
    setError('');
    try {
      const result = await adminService.toggleLock(user.id);
      await loadUsers();
      showToast(result.isLocked ? `Đã khóa tài khoản ${user.name}.` : `Đã mở khóa tài khoản ${user.name}.`);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể cập nhật trạng thái khóa tài khoản.');
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
            Hủy
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý toàn bộ người dùng trong hệ thống</p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-button hover:bg-primary-dark"
        >
          + Tạo tài khoản mới
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
          placeholder="Tìm theo tên, email..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-primary focus:border-primary outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as AdminUserRole | '')}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
        >
          <option value="">Tất cả vai trò</option>
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
          Tải lại
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Danh sách tài khoản ({users.length}{users.length > 0 ? ` • Trang ${safePage}/${totalPages}` : ''})</h2>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Họ tên', 'Email', 'Vai trò', 'Phòng/Ban', 'Trạng thái', 'Thao tác'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedUsers.map((u) => (
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
                      {u.isLocked ? 'Bị khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-[11px] font-bold text-primary hover:underline">
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          setResettingUser(u);
                          setTemporaryPassword('');
                          setError('');
                        }}
                        className="text-[11px] font-bold text-gray-500 hover:text-primary"
                      >
                        Đặt lại MK
                      </button>
                      <button
                        onClick={() => handleToggleLock(u).catch(() => undefined)}
                        className={`text-[11px] font-bold ${u.isLocked ? 'text-emerald-600 hover:text-emerald-700' : 'text-rose-500 hover:text-rose-700'}`}
                      >
                        {u.isLocked ? 'Mở khóa' : 'Khóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedUsers.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-400" colSpan={6}>
                    Chưa có tài khoản phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {users.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Trang trước
          </button>
          <span className="text-xs font-semibold text-gray-600 px-3">{safePage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage === totalPages}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      )}

      {(createOpen || editingUser) &&
        renderModal(
          createOpen ? 'Tạo tài khoản mới' : 'Cập nhật tài khoản',
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Họ tên
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
                Mật khẩu ban đầu
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-1 w-full rounded-lg border-gray-200 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Người dùng sẽ bị bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Vai trò
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
                Vai trò hội đồng
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
              Học hàm / Chức danh
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Đơn vị
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
            {submitting ? 'Đang lưu...' : createOpen ? 'Tạo tài khoản' : 'Lưu thay đổi'}
          </button>,
        )}

      {resettingUser &&
        renderModal(
          'Đặt lại mật khẩu tạm thời',
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Tài khoản: <span className="font-semibold">{resettingUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700">
              Mật khẩu tạm thời mới
              <input
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-200 text-sm"
                placeholder="Tối thiểu 6 ký tự"
              />
            </label>
            <p className="text-xs text-gray-500">
              Sau thao tác này, user phải đổi mật khẩu ở lần đăng nhập tiếp theo.
            </p>
          </div>,
          <button
            type="button"
            onClick={() => submitResetPassword().catch(() => undefined)}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Đang cập nhật...' : 'Xác nhận đặt mật khẩu'}
          </button>,
        )}
    </div>
  );
};

export default AccountManagementPage;
