/**
 * email.ts — SoulPay 이메일 발송 유틸리티 (Resend API)
 *
 * 환경변수 (Supabase Dashboard > Edge Functions > Secrets):
 *   RESEND_API_KEY=re_xxxxxxxxxxxx
 *
 * RESEND_API_KEY 미설정 시: silent skip (결제/재설정은 정상 처리)
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@soulpay.kr';
const FROM_NAME = 'SoulPay';

interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY 미설정. 이메일 발송 skip.');
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!params.to || !emailRegex.test(params.to)) {
    console.warn(`[Email] 유효하지 않은 수신 이메일: "${params.to}". 발송 skip.`);
    return { ok: false, error: 'Invalid recipient email' };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[Email] Resend API 오류:', res.status, data);
      return { ok: false, error: data?.message || `HTTP ${res.status}` };
    }

    console.log(`[Email] 발송 성공 → ${params.to} | id: ${data?.id}`);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error('[Email] 발송 실패 (네트워크):', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

// ────────────────────────────────────────────────────
// 결제 완료 영수증 이메일
// ────────────────────────────────────────────────────

export interface DonationReceiptParams {
  to: string;
  donorName: string;
  tenantName: string;
  itemName: string;
  amount: number;
  transactionId?: string;
  approveNo?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  receiptUrl?: string;
  paidAt?: string;
}

export async function sendDonationReceiptEmail(params: DonationReceiptParams): Promise<SendEmailResult> {
  const {
    to, donorName, tenantName, itemName, amount,
    transactionId, approveNo, paymentMethod, isRecurring,
    receiptUrl, paidAt,
  } = params;

  const kstDate = paidAt
    ? new Date(new Date(paidAt).getTime() + 9 * 60 * 60 * 1000)
    : new Date(Date.now() + 9 * 60 * 60 * 1000);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${kstDate.getUTCFullYear()}. ${pad2(kstDate.getUTCMonth() + 1)}. ${pad2(kstDate.getUTCDate())} ${pad2(kstDate.getUTCHours())}:${pad2(kstDate.getUTCMinutes())} (KST)`;

  const amountStr = amount.toLocaleString('ko-KR');
  const recurringBadge = isRecurring
    ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;margin-left:6px;">정기결제</span>`
    : '';

  const subject = `[SoulPay] ${tenantName} ${itemName} 결제가 완료되었습니다`;

  const detailRows = [
    { label: '헌금 항목', value: itemName },
    { label: '결제 일시', value: dateStr },
    ...(paymentMethod ? [{ label: '결제 수단', value: paymentMethod }] : []),
    ...(approveNo ? [{ label: '승인번호', value: approveNo, mono: true }] : []),
    ...(transactionId ? [{ label: '거래번호', value: transactionId, mono: true }] : []),
  ];

  const detailHtml = detailRows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
      <td style="padding:11px 16px;color:#6b7280;font-size:13px;font-weight:600;width:35%;border-bottom:1px solid #e5e7eb;">${r.label}</td>
      <td style="padding:11px 16px;color:#111827;font-size:13px;${(r as any).mono ? 'font-family:monospace;' : ''}border-bottom:1px solid #e5e7eb;">${r.value}</td>
    </tr>`).join('');

  const receiptBtn = receiptUrl
    ? `<div style="text-align:center;margin-top:24px;">
        <a href="${receiptUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">📄 PG 영수증 확인</a>
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
      <div style="color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">SOULPAY</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px 0;">결제 완료 안내</h1>
      <p style="color:#bfdbfe;font-size:13px;margin:0;">${tenantName}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#374151;font-size:15px;margin:0 0 24px 0;">
        안녕하세요, <strong>${donorName}</strong> 님.${recurringBadge}<br/>
        아래와 같이 결제가 완료되었습니다.
      </p>
      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
        <p style="color:#6b7280;font-size:12px;margin:0 0 6px 0;">결제 금액</p>
        <p style="color:#1e3a8a;font-size:28px;font-weight:900;margin:0;">₩ ${amountStr} 원</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${detailHtml}</table>
      ${receiptBtn}
      <p style="color:#9ca3af;font-size:12px;margin:28px 0 0 0;line-height:1.7;">
        본 메일은 ${tenantName}의 결제 완료 자동 발송 메일입니다.<br/>
        문의사항이 있으시면 단체 담당자에게 연락하여 주세요.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        Powered by <strong>SoulPay</strong> · 금융보안원 보안 규격 준수<br/>
        <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}

// ────────────────────────────────────────────────────
// 파트너 임시 비밀번호 이메일
// ────────────────────────────────────────────────────

export interface PasswordResetParams {
  to: string;
  partnerName: string;
  tenantName: string;
  tempPassword: string;
  loginUrl?: string;
}

export async function sendPasswordResetEmail(params: PasswordResetParams): Promise<SendEmailResult> {
  const { to, partnerName, tenantName, tempPassword, loginUrl } = params;

  const subject = `[SoulPay] ${tenantName} 관리자 임시 비밀번호 안내`;

  const loginBtn = loginUrl
    ? `<div style="text-align:center;margin-top:20px;">
        <a href="${loginUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">🔑 관리자 페이지 로그인</a>
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 40px;text-align:center;">
      <div style="color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">SOULPAY</div>
      <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">임시 비밀번호 안내</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px 0;">
        안녕하세요, <strong>${partnerName}</strong> 님.<br/>
        <strong>${tenantName}</strong> 관리자 계정의 비밀번호가 재설정되었습니다.
      </p>
      <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:20px;">
        <p style="color:#9a3412;font-size:12px;font-weight:600;margin:0 0 8px 0;">임시 비밀번호</p>
        <p style="color:#c2410c;font-size:26px;font-weight:900;margin:0;font-family:monospace;letter-spacing:3px;">${tempPassword}</p>
      </div>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:20px;">
        <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">
          ⚠️ 로그인 후 <strong>비밀번호를 즉시 변경</strong>해 주세요.<br/>
          임시 비밀번호를 그대로 사용하지 마세요.
        </p>
      </div>
      ${loginBtn}
      <p style="color:#9ca3af;font-size:12px;margin:28px 0 0 0;line-height:1.7;">
        본인이 요청하지 않은 경우 즉시 단체 관리자에게 연락하여 주세요.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        Powered by <strong>SoulPay</strong> · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}

// ────────────────────────────────────────────────────
// 단체/파트너 신청 접수 확인 이메일 (신청자 → 수신)
// ────────────────────────────────────────────────────

export interface ApplicationReceivedParams {
  to: string;
  applicantName: string;
  applicationType: '단체' | '파트너';
  orgName?: string; // 단체명 (단체 신청 시)
}

export async function sendApplicationReceivedEmail(params: ApplicationReceivedParams): Promise<SendEmailResult> {
  const { to, applicantName, applicationType, orgName } = params;
  const subject = `[SoulPay] ${applicationType} 신청이 접수되었습니다`;
  const displayName = orgName ? `${orgName} (담당자: ${applicantName})` : applicantName;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 40px;text-align:center;">
      <div style="color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">SOULPAY</div>
      <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">${applicationType} 신청 접수 완료</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px 0;">
        안녕하세요, <strong>${displayName}</strong> 님.<br/>
        SoulPay <strong>${applicationType} 신청</strong>이 정상 접수되었습니다.
      </p>
      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
        <p style="color:#1e40af;font-size:14px;font-weight:700;margin:0 0 8px 0;">📋 신청 접수 안내</p>
        <ul style="color:#374151;font-size:13px;margin:0;padding-left:18px;line-height:1.8;">
          <li>담당자 검토 후 <strong>영업일 기준 1~3일 내</strong> 심사 결과를 이메일로 안내드립니다.</li>
          <li>추가 서류 또는 정보가 필요한 경우 별도 연락드릴 수 있습니다.</li>
          <li>문의사항은 <a href="mailto:support@soulpay.kr" style="color:#2563eb;">support@soulpay.kr</a>로 연락해 주세요.</li>
        </ul>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.7;">
        본 메일은 신청 접수 확인을 위한 자동 발송 메일입니다.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        Powered by <strong>SoulPay</strong> · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}

// ────────────────────────────────────────────────────
// 관리자 알림 이메일 (새 신청 접수 시 → support@soulpay.kr)
// ────────────────────────────────────────────────────

export interface AdminNewApplicationParams {
  applicationType: '단체' | '파트너';
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  orgName?: string;      // 단체명
  region?: string;       // 지역
  memo?: string;         // 메모/소개
}

export async function sendAdminNewApplicationEmail(params: AdminNewApplicationParams): Promise<SendEmailResult> {
  const { applicationType, applicantName, applicantEmail, applicantPhone, orgName, region, memo } = params;
  const adminEmail = 'support@soulpay.kr';
  const subject = `[SoulPay 관리자] 새 ${applicationType} 신청 접수 — ${orgName || applicantName}`;

  const rows = [
    { label: '신청 유형', value: applicationType },
    ...(orgName ? [{ label: '단체명', value: orgName }] : []),
    { label: '담당자', value: applicantName },
    { label: '이메일', value: applicantEmail },
    { label: '연락처', value: applicantPhone },
    ...(region ? [{ label: '지역', value: region }] : []),
    ...(memo ? [{ label: '소개/메모', value: memo }] : []),
    { label: '접수 시각', value: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) + ' (KST)' },
  ];

  const rowsHtml = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
      <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:600;width:30%;border-bottom:1px solid #e5e7eb;">${r.label}</td>
      <td style="padding:10px 16px;color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${r.value}</td>
    </tr>`).join('');

  const reviewUrl = applicationType === '단체'
    ? 'https://ops.soulpay.kr/system/admin/tenants/pending'
    : 'https://ops.soulpay.kr/system/admin/partners';

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:24px 40px;text-align:center;">
      <div style="color:#ddd6fe;font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:6px;">SOULPAY ADMIN</div>
      <h1 style="color:#ffffff;font-size:18px;font-weight:800;margin:0;">새 ${applicationType} 신청 접수</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 40px;">
      <p style="color:#374151;font-size:14px;margin:0 0 16px 0;">새로운 <strong>${applicationType} 신청</strong>이 접수되었습니다. 아래 내용을 확인하고 심사를 진행해 주세요.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${rowsHtml}</table>
      <div style="text-align:center;margin-top:24px;">
        <a href="${reviewUrl}" target="_blank" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">🔍 관리자 페이지에서 심사하기</a>
      </div>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">SoulPay 자동 알림 · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return sendEmail({ to: adminEmail, subject, html });
}

// ────────────────────────────────────────────────────
// 단체/파트너 심사 결과 이메일 (승인 or 거절)
// ────────────────────────────────────────────────────

export interface ApplicationResultParams {
  to: string;
  applicantName: string;
  applicationType: '단체' | '파트너';
  orgName?: string;
  approved: boolean;
  rejectReason?: string;  // 거절 사유 (거절 시)
  loginUrl?: string;      // 승인 시 로그인 URL
  tempPassword?: string;  // 승인 시 초기 비밀번호
}

export async function sendApplicationResultEmail(params: ApplicationResultParams): Promise<SendEmailResult> {
  const { to, applicantName, applicationType, orgName, approved, rejectReason, loginUrl, tempPassword } = params;
  const displayName = orgName ? `${orgName} (${applicantName})` : applicantName;
  const subject = approved
    ? `[SoulPay] ${applicationType} 신청이 승인되었습니다 🎉`
    : `[SoulPay] ${applicationType} 신청 심사 결과 안내`;

  const approvedContent = `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <p style="color:#166534;font-size:16px;font-weight:800;margin:0 0 6px 0;">🎉 신청이 승인되었습니다!</p>
      <p style="color:#15803d;font-size:13px;margin:0;">SoulPay ${applicationType}로 정식 등록되셨습니다.</p>
    </div>
    ${tempPassword ? `
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:16px 24px;margin-bottom:20px;">
      <p style="color:#9a3412;font-size:12px;font-weight:600;margin:0 0 6px 0;">초기 비밀번호</p>
      <p style="color:#c2410c;font-size:22px;font-weight:900;margin:0;font-family:monospace;letter-spacing:3px;">${tempPassword}</p>
      <p style="color:#92400e;font-size:12px;margin:8px 0 0 0;">⚠️ 로그인 후 즉시 비밀번호를 변경해 주세요.</p>
    </div>` : ''}
    ${loginUrl ? `<div style="text-align:center;margin-top:20px;">
      <a href="${loginUrl}" target="_blank" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">🚀 지금 시작하기</a>
    </div>` : ''}`;

  const rejectedContent = `
    <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
      <p style="color:#991b1b;font-size:15px;font-weight:700;margin:0 0 8px 0;">아쉽게도 이번 심사에서 승인이 어렵습니다.</p>
      ${rejectReason ? `<p style="color:#7f1d1d;font-size:13px;margin:0;line-height:1.7;"><strong>사유:</strong> ${rejectReason}</p>` : ''}
    </div>
    <p style="color:#374151;font-size:13px;margin:0 0 16px 0;line-height:1.7;">
      자세한 내용 또는 재신청 문의는 <a href="mailto:support@soulpay.kr" style="color:#2563eb;">support@soulpay.kr</a>로 연락해 주세요.
    </p>`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,${approved ? '#166534 0%,#16a34a' : '#991b1b 0%,#dc2626'} 100%);padding:28px 40px;text-align:center;">
      <div style="color:${approved ? '#bbf7d0' : '#fca5a5'};font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">SOULPAY</div>
      <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">${applicationType} 심사 결과 안내</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px 0;">
        안녕하세요, <strong>${displayName}</strong> 님.<br/>
        SoulPay ${applicationType} 신청 심사 결과를 안내드립니다.
      </p>
      ${approved ? approvedContent : rejectedContent}
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0 0;line-height:1.7;">
        본 메일은 자동 발송 메일입니다. 문의: <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        Powered by <strong>SoulPay</strong> · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}

// ─── 일일 결제 리포트 이메일 ────────────────────────────────────────────────
// 매일 오전 9시 자동 발송 (pg_cron → Edge Function)
export async function sendDailyReportEmail(params: {
  reportDate: string;           // 예: '2026-09-12 (금)'
  totalAmount: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  recurringCount: number;
  tenantBreakdown: Array<{ name: string; count: number; amount: number }>;
}): Promise<SendEmailResult> {
  const { reportDate, totalAmount, totalCount, successCount, failedCount, recurringCount, tenantBreakdown } = params;
  const to = 'support@soulpay.kr';
  const subject = `[SoulPay] 일일 결제 리포트 — ${reportDate}`;

  const fmtAmt = (n: number) => n.toLocaleString('ko-KR') + '원';
  const failRate = totalCount > 0 ? ((failedCount / totalCount) * 100).toFixed(1) : '0.0';
  const statusColor = failedCount > 0 ? '#ef4444' : '#10b981';
  const statusIcon = failedCount > 0 ? '⚠️' : '✅';

  const tenantRows = tenantBreakdown.length > 0
    ? tenantBreakdown.map(t => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${t.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${t.count}건</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-weight:600;">${fmtAmt(t.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#9ca3af;">결제 내역 없음</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

  <!-- 헤더 -->
  <tr>
    <td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:28px 40px;">
      <p style="margin:0;color:rgba(255,255,255,.8);font-size:12px;letter-spacing:.5px;text-transform:uppercase;">SoulPay 운영 리포트</p>
      <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:700;">일일 결제 현황</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px;">${reportDate}</p>
    </td>
  </tr>

  <!-- 주요 지표 -->
  <tr>
    <td style="padding:28px 40px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="30%" style="padding:0 6px 0 0;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">총 결제금액</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;">${fmtAmt(totalAmount)}</p>
            </div>
          </td>
          <td width="23%" style="padding:0 6px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#2563eb;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">총 건수</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;">${successCount}건</p>
            </div>
          </td>
          <td width="23%" style="padding:0 6px;">
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#ea580c;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">정기결제</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;">${recurringCount}건</p>
            </div>
          </td>
          <td width="24%" style="padding:0 0 0 6px;">
            <div style="background:#${failedCount > 0 ? 'fef2f2;border:1px solid #fecaca' : 'f0fdf4;border:1px solid #bbf7d0'};border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${statusColor};font-weight:600;text-transform:uppercase;letter-spacing:.5px;">${statusIcon} 실패</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;">${failedCount}건</p>
              <p style="margin:2px 0 0;font-size:10px;color:#6b7280;">실패율 ${failRate}%</p>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- 단체별 상세 -->
  <tr>
    <td style="padding:20px 40px 8px;">
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;">단체별 결제 현황</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">단체명</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">건수</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">금액</th>
          </tr>
        </thead>
        <tbody>${tenantRows}</tbody>
      </table>
    </td>
  </tr>

  <!-- 바로가기 -->
  <tr>
    <td style="padding:20px 40px 28px;text-align:center;">
      <a href="https://app.soulpay.kr/admin" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">관리자 대시보드 바로가기</a>
    </td>
  </tr>

  <!-- 푸터 -->
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        Powered by <strong>SoulPay</strong> · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}

// ─── 문의 이메일 ─────────────────────────────────────────────────────────────
// 테넌트 관리자가 문의 폼 제출 시:
//   1) support@soulpay.kr 에 문의 내용 발송
//   2) 문의자에게 자동 접수 확인 회신
export async function sendSupportInquiryEmail(params: {
  senderName: string;
  senderEmail: string;
  tenantName: string;
  category: string;
  subject: string;
  message: string;
}): Promise<{ notifyOk: boolean; autoReplyOk: boolean }> {
  const { senderName, senderEmail, tenantName, category, subject, message } = params;
  const submittedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  // ── 운영팀 수신 이메일 ──────────────────────────────────────────────────────
  const notifyHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px 36px;">
      <p style="margin:0;color:rgba(255,255,255,.8);font-size:12px;">SoulPay 고객 문의</p>
      <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:700;">[${category}] ${subject}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;width:90px;">단체명</td>
          <td style="padding:10px 16px;font-size:14px;color:#111827;">${tenantName}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;">문의자</td>
          <td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #f3f4f6;">${senderName}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;">이메일</td>
          <td style="padding:10px 16px;border-top:1px solid #f3f4f6;"><a href="mailto:${senderEmail}" style="color:#4f46e5;font-size:14px;">${senderEmail}</a></td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;">접수 시각</td>
          <td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #f3f4f6;">${submittedAt}</td>
        </tr>
      </table>
      <h3 style="margin:0 0 10px;font-size:14px;font-weight:600;color:#374151;">문의 내용</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message}</div>
      <div style="margin-top:20px;text-align:center;">
        <a href="mailto:${senderEmail}?subject=Re: [${category}] ${subject}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:600;">답장하기</a>
      </div>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 36px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">Powered by <strong>SoulPay</strong> · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  // ── 자동 접수 확인 회신 ────────────────────────────────────────────────────
  const autoReplyHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px 36px;">
      <p style="margin:0;color:rgba(255,255,255,.8);font-size:12px;">SoulPay 고객지원</p>
      <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:700;">문의가 접수되었습니다 ✅</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 36px;">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;">안녕하세요, <strong>${senderName}</strong>님.</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
        문의 내용이 정상적으로 접수되었습니다.<br>
        영업일 기준 <strong>1~2일 이내</strong>에 <strong>${senderEmail}</strong>로 답변 드리겠습니다.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:600;">접수 문의</p>
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">[${category}] ${subject}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">${submittedAt}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
        긴급 문의는 <a href="mailto:support@soulpay.kr" style="color:#4f46e5;">support@soulpay.kr</a>로 직접 연락해 주세요.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 36px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">Powered by <strong>SoulPay</strong> · <a href="mailto:support@soulpay.kr" style="color:#6b7280;">support@soulpay.kr</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const [notifyResult, autoReplyResult] = await Promise.allSettled([
    sendEmail({ to: 'support@soulpay.kr', subject: `[문의][${category}] ${subject} — ${tenantName}`, html: notifyHtml }),
    sendEmail({ to: senderEmail, subject: `[SoulPay] 문의가 접수되었습니다: ${subject}`, html: autoReplyHtml }),
  ]);

  return {
    notifyOk: notifyResult.status === 'fulfilled' && notifyResult.value.ok,
    autoReplyOk: autoReplyResult.status === 'fulfilled' && autoReplyResult.value.ok,
  };
}
