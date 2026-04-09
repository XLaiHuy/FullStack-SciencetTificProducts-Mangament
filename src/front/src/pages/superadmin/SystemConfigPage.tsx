import React from 'react';
import { adminService } from '../../services/api/adminService';

type ConfigState = {
  maxScore: string;
  maxFileSize: string;
  allowedFormats: string;
  reminderDays: string;
  emailMock: boolean;
  smtpServer: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
  emailRetryCount: string;
  emailRetryDelayMs: string;
  systemEmail: string;
  councilDefaultPassword: string;
  notifyProgress: boolean;
  notifyExtension: boolean;
  notifyAcceptance: boolean;
  notifySettlement: boolean;
};

const DEFAULT_STATE: ConfigState = {
  maxScore: '100',
  maxFileSize: '20',
  allowedFormats: '.pdf,.docx,.xlsx',
  reminderDays: '7',
  emailMock: false,
  smtpServer: '',
  smtpPort: '587',
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  emailFrom: '',
  emailRetryCount: '3',
  emailRetryDelayMs: '1000',
  systemEmail: '',
  councilDefaultPassword: '',
  notifyProgress: true,
  notifyExtension: true,
  notifyAcceptance: true,
  notifySettlement: false,
};

const NOTIFY_ITEMS: Array<{ key: 'notifyProgress' | 'notifyExtension' | 'notifyAcceptance' | 'notifySettlement'; label: string }> = [
  { key: 'notifyProgress', label: 'Nhắc nhở nộp báo cáo tiến độ' },
  { key: 'notifyExtension', label: 'Thông báo gia hạn đề tài' },
  { key: 'notifyAcceptance', label: 'Thông báo nghiệm thu' },
  { key: 'notifySettlement', label: 'Thông báo quyết toán' },
];

const SystemConfigPage: React.FC = () => {
  const [state, setState] = React.useState<ConfigState>(DEFAULT_STATE);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const [error, setError] = React.useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await adminService.getConfig();
      const byKey = new Map(rows.map((row) => [row.key, row.value]));
      setState({
        maxScore: byKey.get('MAX_SCORE') ?? DEFAULT_STATE.maxScore,
        maxFileSize: byKey.get('MAX_FILE_SIZE_MB') ?? DEFAULT_STATE.maxFileSize,
        allowedFormats: byKey.get('ALLOWED_FILE_FORMATS') ?? DEFAULT_STATE.allowedFormats,
        reminderDays: byKey.get('REMINDER_DAYS') ?? DEFAULT_STATE.reminderDays,
        emailMock: (byKey.get('EMAIL_MOCK') ?? String(DEFAULT_STATE.emailMock)) === 'true',
        smtpServer: byKey.get('SMTP_SERVER') ?? DEFAULT_STATE.smtpServer,
        smtpPort: byKey.get('SMTP_PORT') ?? DEFAULT_STATE.smtpPort,
        smtpSecure: (byKey.get('SMTP_SECURE') ?? String(DEFAULT_STATE.smtpSecure)) === 'true',
        smtpUser: byKey.get('SMTP_USER') ?? DEFAULT_STATE.smtpUser,
        smtpPass: byKey.get('SMTP_PASS') ?? DEFAULT_STATE.smtpPass,
        emailFrom: byKey.get('EMAIL_FROM') ?? DEFAULT_STATE.emailFrom,
        emailRetryCount: byKey.get('EMAIL_RETRY_COUNT') ?? DEFAULT_STATE.emailRetryCount,
        emailRetryDelayMs: byKey.get('EMAIL_RETRY_DELAY_MS') ?? DEFAULT_STATE.emailRetryDelayMs,
        systemEmail: byKey.get('SYSTEM_EMAIL') ?? DEFAULT_STATE.systemEmail,
        councilDefaultPassword: byKey.get('COUNCIL_DEFAULT_PASSWORD') ?? DEFAULT_STATE.councilDefaultPassword,
        notifyProgress: (byKey.get('EMAIL_NOTIFY_PROGRESS') ?? String(DEFAULT_STATE.notifyProgress)) === 'true',
        notifyExtension: (byKey.get('EMAIL_NOTIFY_EXTENSION') ?? String(DEFAULT_STATE.notifyExtension)) === 'true',
        notifyAcceptance: (byKey.get('EMAIL_NOTIFY_ACCEPTANCE') ?? String(DEFAULT_STATE.notifyAcceptance)) === 'true',
        notifySettlement: (byKey.get('EMAIL_NOTIFY_SETTLEMENT') ?? String(DEFAULT_STATE.notifySettlement)) === 'true',
      });
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể tải cấu hình hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadConfig().catch(() => undefined);
  }, [loadConfig]);

  const saveConfig = async () => {
    setSaving(true);
    setError('');
    try {
      await adminService.saveConfig([
        { key: 'MAX_SCORE', value: state.maxScore, label: 'Thang điểm tối đa' },
        { key: 'MAX_FILE_SIZE_MB', value: state.maxFileSize, label: 'Dung lượng file tối đa (MB)' },
        { key: 'ALLOWED_FILE_FORMATS', value: state.allowedFormats, label: 'Định dạng file cho phép' },
        { key: 'REMINDER_DAYS', value: state.reminderDays, label: 'Số ngày nhắc trước hạn nộp' },
        { key: 'SMTP_SERVER', value: state.smtpServer, label: 'SMTP Server' },
        { key: 'SMTP_PORT', value: state.smtpPort, label: 'SMTP Port' },
        { key: 'SMTP_SECURE', value: String(state.smtpSecure), label: 'SMTP Secure' },
        { key: 'SMTP_USER', value: state.smtpUser, label: 'SMTP User' },
        { key: 'SMTP_PASS', value: state.smtpPass, label: 'SMTP Password' },
        { key: 'EMAIL_FROM', value: state.emailFrom, label: 'Email From' },
        { key: 'EMAIL_MOCK', value: String(state.emailMock), label: 'Email Mock' },
        { key: 'EMAIL_RETRY_COUNT', value: state.emailRetryCount, label: 'Email Retry Count' },
        { key: 'EMAIL_RETRY_DELAY_MS', value: state.emailRetryDelayMs, label: 'Email Retry Delay (ms)' },
        { key: 'SYSTEM_EMAIL', value: state.systemEmail, label: 'Email gửi đi' },
        { key: 'COUNCIL_DEFAULT_PASSWORD', value: state.councilDefaultPassword, label: 'Mật khẩu tạm mặc định hội đồng' },
        { key: 'EMAIL_NOTIFY_PROGRESS', value: String(state.notifyProgress), label: 'Thông báo tiến độ' },
        { key: 'EMAIL_NOTIFY_EXTENSION', value: String(state.notifyExtension), label: 'Thông báo gia hạn' },
        { key: 'EMAIL_NOTIFY_ACCEPTANCE', value: String(state.notifyAcceptance), label: 'Thông báo nghiệm thu' },
        { key: 'EMAIL_NOTIFY_SETTLEMENT', value: String(state.notifySettlement), label: 'Thông báo quyết toán' },
      ]);
      showToast('Đã lưu cấu hình hệ thống.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Không thể lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof ConfigState>(key: K, value: ConfigState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cấu hình hệ thống</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý tham số vận hành của hệ thống NCKH</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadConfig().catch(() => undefined)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tải lại
          </button>
          <button
            type="button"
            onClick={() => saveConfig().catch(() => undefined)}
            disabled={saving || loading}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải cấu hình...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 space-y-5">
              <h2 className="font-bold text-lg text-gray-900">Tham số chung</h2>
              <label className="block text-sm font-medium text-gray-700">
                Thang điểm tối đa
                <input
                  type="number"
                  value={state.maxScore}
                  onChange={(e) => updateField('maxScore', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Dung lượng file tối đa (MB)
                <input
                  type="number"
                  value={state.maxFileSize}
                  onChange={(e) => updateField('maxFileSize', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Định dạng file cho phép
                <input
                  type="text"
                  value={state.allowedFormats}
                  onChange={(e) => updateField('allowedFormats', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Số ngày nhắc trước hạn nộp báo cáo
                <input
                  type="number"
                  value={state.reminderDays}
                  onChange={(e) => updateField('reminderDays', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 space-y-5">
              <h2 className="font-bold text-lg text-gray-900">Thông báo Email</h2>
              <label className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Bật chế độ giả lập email (EMAIL_MOCK)</span>
                <input
                  type="checkbox"
                  checked={state.emailMock}
                  onChange={(e) => updateField('emailMock', e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                SMTP Server
                <input
                  type="text"
                  value={state.smtpServer}
                  onChange={(e) => updateField('smtpServer', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                SMTP Port
                <input
                  type="number"
                  value={state.smtpPort}
                  onChange={(e) => updateField('smtpPort', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">SMTP Secure</span>
                <input
                  type="checkbox"
                  checked={state.smtpSecure}
                  onChange={(e) => updateField('smtpSecure', e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                SMTP User (email đăng nhập)
                <input
                  type="text"
                  value={state.smtpUser}
                  onChange={(e) => updateField('smtpUser', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                SMTP Password / App Password
                <input
                  type="password"
                  value={state.smtpPass}
                  onChange={(e) => updateField('smtpPass', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                EMAIL_FROM
                <input
                  type="text"
                  value={state.emailFrom}
                  onChange={(e) => updateField('emailFrom', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Số lần retry email
                  <input
                    type="number"
                    min={1}
                    value={state.emailRetryCount}
                    onChange={(e) => updateField('emailRetryCount', e.target.value)}
                    className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Delay retry (ms)
                  <input
                    type="number"
                    min={0}
                    value={state.emailRetryDelayMs}
                    onChange={(e) => updateField('emailRetryDelayMs', e.target.value)}
                    className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Email gửi đi
                <input
                  type="email"
                  value={state.systemEmail}
                  onChange={(e) => updateField('systemEmail', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu tạm mặc định cho thành viên hội đồng mới
                <input
                  type="password"
                  value={state.councilDefaultPassword}
                  onChange={(e) => updateField('councilDefaultPassword', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                  placeholder="Để trống để hệ thống tự random"
                />
              </label>
              <div className="space-y-3">
                {NOTIFY_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={state[item.key]}
                      onChange={(e) => updateField(item.key, e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemConfigPage;
