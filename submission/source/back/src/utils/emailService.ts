import nodemailer, { type Transporter } from 'nodemailer';
import prisma from '../prisma';

/**
 * Email service with SMTP (real) + mock mode fallback.
 * Supports retry and writes delivery logs to email_logs.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string[];
}

export interface EmailResult {
  success: boolean;
  message: string;
  mock: boolean;
  to?: string | string[];
  attempts?: number;
  messageId?: string;
}

export interface CouncilInvitationOptions {
  loginEmail?: string;
  temporaryPassword?: string;
  isNewAccount?: boolean;
}

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey = '';

type EmailRuntimeConfig = {
  isMock: boolean;
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from?: string;
  retryCount: number;
  retryDelayMs: number;
};

const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeRecipients = (value: string | string[]) =>
  (Array.isArray(value) ? value : [value])
    .map((item) => item.trim())
    .filter(Boolean);

const safeBodyPreview = (body: string) => body.slice(0, 1000);

const toBoolean = (raw: string | undefined, fallback: boolean) => {
  if (raw === undefined) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
};

const toNumber = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRuntimeEmailConfig = async (): Promise<EmailRuntimeConfig> => {
  const keys = [
    'EMAIL_MOCK',
    'SMTP_HOST',
    'SMTP_SERVER',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM',
    'EMAIL_RETRY_COUNT',
    'EMAIL_RETRY_DELAY_MS',
  ];

  let configMap = new Map<string, string>();
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    configMap = new Map(rows.map((row) => [row.key, row.value]));
  } catch (error) {
    // Fallback to .env when DB config table is not ready or unavailable.
    console.error('[EMAIL CONFIG WARNING] Fallback to env:', error);
  }

  const read = (key: string): string | undefined => {
    const fromDb = configMap.get(key)?.trim();
    if (fromDb) return fromDb;
    const fromEnv = process.env[key]?.trim();
    return fromEnv || undefined;
  };

  const port = toNumber(read('SMTP_PORT'), 587);
  const host = read('SMTP_HOST') || read('SMTP_SERVER');

  return {
    isMock: toBoolean(read('EMAIL_MOCK'), true),
    host,
    port,
    secure: toBoolean(read('SMTP_SECURE'), port === 465),
    user: read('SMTP_USER'),
    pass: read('SMTP_PASS'),
    from: read('EMAIL_FROM') || read('SMTP_USER'),
    retryCount: Math.max(1, toNumber(read('EMAIL_RETRY_COUNT'), 3)),
    retryDelayMs: Math.max(0, toNumber(read('EMAIL_RETRY_DELAY_MS'), 1000)),
  };
};

const writeEmailLog = async (params: {
  toAddress: string;
  ccAddress?: string;
  subject: string;
  bodyPreview?: string;
  provider: string;
  isMock: boolean;
  status: string;
  attempts: number;
  messageId?: string;
  errorMessage?: string;
  sentAt?: Date;
}) => {
  try {
    await prisma.emailLog.create({
      data: {
        toAddress: params.toAddress,
        ccAddress: params.ccAddress,
        subject: params.subject,
        bodyPreview: params.bodyPreview,
        provider: params.provider,
        isMock: params.isMock,
        status: params.status,
        attempts: params.attempts,
        messageId: params.messageId,
        errorMessage: params.errorMessage,
        sentAt: params.sentAt,
      },
    });
  } catch (error) {
    // Never break business flow because logging failed.
    console.error('[EMAIL LOG ERROR]', error);
  }
};

const getTransporter = (config: EmailRuntimeConfig): Transporter => {
  const host = config.host;
  const port = config.port;
  const user = config.user;
  const pass = config.pass;
  const secure = config.secure;

  if (!host || !user || !pass) {
    throw new Error('SMTP chưa được cấu hình đầy đủ (SMTP_HOST/SMTP_USER/SMTP_PASS).');
  }

  const cacheKey = `${host}|${port}|${secure}|${user}|${pass}`;
  if (cachedTransporter && cachedTransporterKey === cacheKey) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  cachedTransporterKey = cacheKey;

  return cachedTransporter;
};

/** Send email (or mock it) */
export const sendEmail = async (payload: EmailPayload): Promise<EmailResult> => {
  const runtimeConfig = await getRuntimeEmailConfig();
  const originalRecipients = normalizeRecipients(payload.to);
  const ccRecipients = payload.cc ? normalizeRecipients(payload.cc) : [];
  const toAddress = originalRecipients.join(', ');
  const ccAddress = ccRecipients.length ? ccRecipients.join(', ') : undefined;
  const bodyPreview = safeBodyPreview(payload.body);

  if (!originalRecipients.length) {
    throw new Error('Không có email người nhận hợp lệ.');
  }

  // EMAIL_OVERRIDE_TO: redirect ALL emails to one address (demo/testing mode)
  const overrideTo = process.env.EMAIL_OVERRIDE_TO?.trim();
  const actualRecipients = overrideTo ? [overrideTo] : originalRecipients;
  const overrideNote = overrideTo
    ? `\n\n--- [DEMO MODE] Thư gốc gửi tới: ${toAddress} ---\n`
    : '';

  if (runtimeConfig.isMock) {
    console.log('[EMAIL MOCK]', {
      to: actualRecipients,
      subject: payload.subject,
      body: payload.body.substring(0, 80) + '...',
    });

    await writeEmailLog({
      toAddress,
      ccAddress,
      subject: payload.subject,
      bodyPreview,
      provider: 'mock',
      isMock: true,
      status: 'sent',
      attempts: 1,
      sentAt: new Date(),
    });

    return {
      success: true,
      message: `Email (mock) sent to ${toAddress}`,
      mock: true,
      to: actualRecipients,
      attempts: 1,
    };
  }

  const from = runtimeConfig.from;
  if (!from) {
    await writeEmailLog({
      toAddress,
      ccAddress,
      subject: payload.subject,
      bodyPreview,
      provider: 'smtp',
      isMock: false,
      status: 'failed',
      attempts: 0,
      errorMessage: 'EMAIL_FROM hoặc SMTP_USER chưa cấu hình.',
    });
    throw new Error('EMAIL_FROM hoặc SMTP_USER chưa cấu hình.');
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= runtimeConfig.retryCount; attempt += 1) {
    try {
      const transporter = getTransporter(runtimeConfig);
      const info = await transporter.sendMail({
        from,
        to: actualRecipients,
        cc: ccRecipients.length ? ccRecipients : undefined,
        subject: payload.subject,
        text: payload.body + overrideNote,
      });

      await writeEmailLog({
        toAddress,
        ccAddress,
        subject: payload.subject,
        bodyPreview,
        provider: 'smtp',
        isMock: false,
        status: 'sent',
        attempts: attempt,
        messageId: info.messageId,
        sentAt: new Date(),
      });

      return {
        success: true,
        message: `Email sent to ${toAddress}`,
        mock: false,
        to: actualRecipients,
        attempts: attempt,
        messageId: info.messageId,
      };
    } catch (error) {
      lastError = error;
      if (attempt < runtimeConfig.retryCount) {
        await sleep(runtimeConfig.retryDelayMs);
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : 'Unknown SMTP error';

  await writeEmailLog({
    toAddress,
    ccAddress,
    subject: payload.subject,
    bodyPreview,
    provider: 'smtp',
    isMock: false,
    status: 'failed',
    attempts: runtimeConfig.retryCount,
    errorMessage: reason,
  });

  throw new Error(`Gửi email thất bại sau ${runtimeConfig.retryCount} lần thử: ${reason}`);
};

/** Helper: supplement request notification */
export const sendSupplementRequest = async (
  ownerEmail: string,
  ownerName: string,
  settlementCode: string,
  reasons: string[]
): Promise<EmailResult> =>
  sendEmail({
    to: ownerEmail,
    subject: `[NCKH] Yêu cầu bổ sung hồ sơ quyết toán ${settlementCode}`,
    body: `
Kính gửi ${ownerName},

Hồ sơ quyết toán ${settlementCode} cần được bổ sung với các lý do sau:
${reasons.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

Vui lòng nộp bổ sung trong vòng 5 ngày làm việc.

Trân trọng,
Phòng Nghiên cứu Khoa học
    `.trim(),
  });

/** Helper: council invitation */
export const sendCouncilInvitation = async (
  memberEmail: string,
  memberName: string,
  projectTitle: string,
  councilCode: string,
  options?: CouncilInvitationOptions
): Promise<EmailResult> =>
  sendEmail({
    to: memberEmail,
    subject: `[NCKH] Thư mời tham gia Hội đồng nghiệm thu ${councilCode}`,
    body: `
Kính gửi ${memberName},

Bạn được mời tham gia Hội đồng nghiệm thu đề tài:
"${projectTitle}"
Số quyết định: ${councilCode}

${options?.loginEmail ? `Tài khoản đăng nhập: ${options.loginEmail}` : ''}
${options?.temporaryPassword ? `Mật khẩu tạm thời: ${options.temporaryPassword}` : ''}

${options?.isNewAccount
  ? 'Lưu ý: Đây là tài khoản mới được hệ thống tạo tự động. Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.'
  : 'Vui lòng đăng nhập bằng tài khoản hiện có để xác nhận tham gia.'}

Vui lòng xác nhận tham gia bằng cách đăng nhập vào hệ thống NCKH.

Trân trọng,
Phòng Nghiên cứu Khoa học
    `.trim(),
  });
