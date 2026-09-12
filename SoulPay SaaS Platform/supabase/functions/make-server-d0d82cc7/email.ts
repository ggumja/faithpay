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
