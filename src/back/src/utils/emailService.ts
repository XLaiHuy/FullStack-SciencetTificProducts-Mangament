/**
 * Mock Email Service
 * 
 * In production: replace with NodeMailer or SendGrid.
 * Switch EMAIL_MOCK=false in .env and implement the real send logic.
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
}

const isMock = process.env.EMAIL_MOCK !== 'false';

/** Send email (or mock it) */
export const sendEmail = async (payload: EmailPayload): Promise<EmailResult> => {
  if (isMock) {
    console.log('[EMAIL MOCK]', {
      to: payload.to,
      subject: payload.subject,
      body: payload.body.substring(0, 80) + '...',
    });
    return {
      success: true,
      message: `Email (mock) sent to ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}`,
      mock: true,
      to: payload.to,
    };
  }

  // --- Real email implementation (NodeMailer) ---
  // Uncomment when EMAIL_MOCK=false:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from: process.env.EMAIL_FROM, ...payload });
  // return { success: true, message: 'Email sent', mock: false };

  return { success: false, message: 'Real email not configured', mock: false };
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
  councilCode: string
): Promise<EmailResult> =>
  sendEmail({
    to: memberEmail,
    subject: `[NCKH] Thư mời tham gia Hội đồng nghiệm thu ${councilCode}`,
    body: `
Kính gửi ${memberName},

Bạn được mời tham gia Hội đồng nghiệm thu đề tài:
"${projectTitle}"
Số quyết định: ${councilCode}

Vui lòng xác nhận tham gia bằng cách đăng nhập vào hệ thống NCKH.

Trân trọng,
Phòng Nghiên cứu Khoa học
    `.trim(),
  });
