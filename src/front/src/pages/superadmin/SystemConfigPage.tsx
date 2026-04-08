import React from 'react';
import { adminService } from '../../services/api/adminService';

type ConfigState = {
  maxScore: string;
  maxFileSize: string;
  allowedFormats: string;
  reminderDays: string;
  smtpServer: string;
  systemEmail: string;
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
  smtpServer: '',
  systemEmail: '',
  notifyProgress: true,
  notifyExtension: true,
  notifyAcceptance: true,
  notifySettlement: false,
};

const NOTIFY_ITEMS: Array<{ key: 'notifyProgress' | 'notifyExtension' | 'notifyAcceptance' | 'notifySettlement'; label: string }> = [
  { key: 'notifyProgress', label: 'Nhac nho nop bao cao tien do' },
  { key: 'notifyExtension', label: 'Thong bao gia han de tai' },
  { key: 'notifyAcceptance', label: 'Thong bao nghiem thu' },
  { key: 'notifySettlement', label: 'Thong bao quyet toan' },
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
        smtpServer: byKey.get('SMTP_SERVER') ?? DEFAULT_STATE.smtpServer,
        systemEmail: byKey.get('SYSTEM_EMAIL') ?? DEFAULT_STATE.systemEmail,
        notifyProgress: (byKey.get('EMAIL_NOTIFY_PROGRESS') ?? String(DEFAULT_STATE.notifyProgress)) === 'true',
        notifyExtension: (byKey.get('EMAIL_NOTIFY_EXTENSION') ?? String(DEFAULT_STATE.notifyExtension)) === 'true',
        notifyAcceptance: (byKey.get('EMAIL_NOTIFY_ACCEPTANCE') ?? String(DEFAULT_STATE.notifyAcceptance)) === 'true',
        notifySettlement: (byKey.get('EMAIL_NOTIFY_SETTLEMENT') ?? String(DEFAULT_STATE.notifySettlement)) === 'true',
      });
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the tai cau hinh he thong.');
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
        { key: 'MAX_SCORE', value: state.maxScore, label: 'Thang diem toi da' },
        { key: 'MAX_FILE_SIZE_MB', value: state.maxFileSize, label: 'Dung luong file toi da (MB)' },
        { key: 'ALLOWED_FILE_FORMATS', value: state.allowedFormats, label: 'Dinh dang file cho phep' },
        { key: 'REMINDER_DAYS', value: state.reminderDays, label: 'So ngay nhac truoc han nop' },
        { key: 'SMTP_SERVER', value: state.smtpServer, label: 'SMTP Server' },
        { key: 'SYSTEM_EMAIL', value: state.systemEmail, label: 'Email gui di' },
        { key: 'EMAIL_NOTIFY_PROGRESS', value: String(state.notifyProgress), label: 'Thong bao tien do' },
        { key: 'EMAIL_NOTIFY_EXTENSION', value: String(state.notifyExtension), label: 'Thong bao gia han' },
        { key: 'EMAIL_NOTIFY_ACCEPTANCE', value: String(state.notifyAcceptance), label: 'Thong bao nghiem thu' },
        { key: 'EMAIL_NOTIFY_SETTLEMENT', value: String(state.notifySettlement), label: 'Thong bao quyet toan' },
      ]);
      showToast('Da luu cau hinh he thong.');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Khong the luu cau hinh.');
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
          <h1 className="text-2xl font-bold text-gray-900">Cau hinh he thong</h1>
          <p className="text-gray-500 text-sm mt-1">Quan ly tham so van hanh cua he thong NCKH</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadConfig().catch(() => undefined)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tai lai
          </button>
          <button
            type="button"
            onClick={() => saveConfig().catch(() => undefined)}
            disabled={saving || loading}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50"
          >
            {saving ? 'Dang luu...' : 'Luu cau hinh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Dang tai cau hinh...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 space-y-5">
              <h2 className="font-bold text-lg text-gray-900">Tham so chung</h2>
              <label className="block text-sm font-medium text-gray-700">
                Thang diem toi da
                <input
                  type="number"
                  value={state.maxScore}
                  onChange={(e) => updateField('maxScore', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Dung luong file toi da (MB)
                <input
                  type="number"
                  value={state.maxFileSize}
                  onChange={(e) => updateField('maxFileSize', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Dinh dang file cho phep
                <input
                  type="text"
                  value={state.allowedFormats}
                  onChange={(e) => updateField('allowedFormats', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                So ngay nhac truoc han nop bao cao
                <input
                  type="number"
                  value={state.reminderDays}
                  onChange={(e) => updateField('reminderDays', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
                />
              </label>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 space-y-5">
              <h2 className="font-bold text-lg text-gray-900">Thong bao Email</h2>
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
                Email gui di
                <input
                  type="email"
                  value={state.systemEmail}
                  onChange={(e) => updateField('systemEmail', e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 text-sm"
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
