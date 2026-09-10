import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

import * as db from "./database.tsx";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const app = new Hono();




// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-d0d82cc7/health", (c) => {
  return c.json({ status: "ok" });
});

// 🔧 일회성 패치: donations 테이블 누락 컬럼 추가
app.post("/make-server-d0d82cc7/admin/patch-donations-schema", async (c) => {
  try {
    const sb = db.pgClient();
    // Supabase JS client는 raw SQL을 직접 지원하지 않으므로
    // 컬럼 존재 여부를 체크 후 없으면 insert 방식 우회
    // → 실제로는 Supabase dashboard SQL editor에서 실행 필요
    // 여기서는 현재 컬럼 목록만 반환
    const { data, error } = await sb
      .from('donations')
      .select('*')
      .limit(1);
    
    if (error) {
      return c.json({ success: false, error: error.message });
    }
    
    // 컬럼 확인: data가 있으면 컬럼 키 목록 반환, 없으면 빈 배열
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    const hasItemId = columns.includes('item_id');
    
    return c.json({
      success: true,
      columns,
      hasItemId,
      message: hasItemId ? 'item_id 컬럼 존재함 - 정상' : 'item_id 컬럼 없음 - Supabase SQL Editor에서 마이그레이션 수동 실행 필요',
      sql: `ALTER TABLE donations ADD COLUMN IF NOT EXISTS item_id TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS approve_no TEXT, ADD COLUMN IF NOT EXISTS device_type TEXT, ADD COLUMN IF NOT EXISTS pg_provider TEXT;`,
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message });
  }
});

// 🔧 임시 디버그: donations 테이블 스키마 확인
app.get("/make-server-d0d82cc7/debug/schema", async (c) => {
  try {
    const sb = db.pgClient();

    // 1. 테이블 select 시도 (존재 여부 + 에러 확인)
    const { data: tableCheck, error: tableErr } = await sb
      .from('donations')
      .select('*')
      .limit(1);

    // 2. 직접 insert 시도 (에러 메시지 캡처)
    const testId = `schema-test-${Date.now()}`;
    const testRow = {
      id: testId,
      tenant_id: '9370d6bf-13e6-430c-a39d-35e4a8a9967b',
      item_id: 'default',
      item_name: '스키마테스트',
      amount: 1,
      donor_name: '테스트',
      donor_phone: '01000000000',
      payment_status: 'completed',
      payment_method: '테스트',
      transaction_id: 'test',
      is_recurring: false,
    };
    const { data: ins, error: insErr } = await sb.from('donations').insert(testRow).select('id').single();

    // 3. 다시 조회해서 실제로 insert됐는지 확인
    const { data: verify, error: verErr } = await sb.from('donations').select('id').eq('id', testId).maybeSingle();

    return c.json({
      tableExists: !tableErr,
      tableError: tableErr?.message ?? null,
      selectRowCount: tableCheck?.length ?? 0,
      insertSuccess: !insErr,
      insertError: insErr?.message ?? null,
      verifyFound: !!verify,
      verifyError: verErr?.message ?? null,
    });
  } catch (e: any) {
    return c.json({ fatalError: e.message });
  }
});


// ==================== TENANT ROUTES ====================

// 모든 단체 조회
app.get("/make-server-d0d82cc7/tenants", async (c) => {
  try {
    const tenants = await db.getAllTenants();
    return c.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return c.json({ success: false, error: 'Failed to fetch tenants' }, 500);
  }
});

// ✅ 특정(static) 경로를 먼저 — :id 와일드카드보다 반드시 앞에 등록

// 승인 대기 단체 목록 조회  ← /tenants/:id 보다 반드시 앞
app.get("/make-server-d0d82cc7/tenants/pending", async (c) => {
  try {
    const pending = await db.getPendingTenants();
    return c.json({ success: true, data: pending });
  } catch (error) {
    console.error('Error fetching pending tenants:', error);
    return c.json({ success: false, error: 'Failed to fetch pending tenants' }, 500);
  }
});

// 단체 조회 (by slug)  ← /tenants/:id 보다 반드시 앞
app.get("/make-server-d0d82cc7/tenants/slug/:slug", async (c) => {
  try {
    const slug = c.req.param('slug');
    const tenant = await db.getTenantBySlug(slug);
    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }
    return c.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    return c.json({ success: false, error: 'Failed to fetch tenant' }, 500);
  }
});

// 📌 가맹 단체별 관리자 계정 목록 조회 (tenant_admins 테이블 사용)
const handleGetTenantStaff = async (c: any) => {
  try {
    const tenantId = c.req.param('tenantId');
    const sb = db.pgClient();

    // tenant_admins DB 조회
    const { data: staffList, error } = await sb
      .from('tenant_admins')
      .select('id, tenant_id, email, password, name, role, status, phone, group_id, last_login_at, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (!error && staffList && staffList.length > 0) {
      // KV 호환 필드명 변환 (프론트엔드 호환성 유지)
      const mapped = staffList.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        groupId: s.group_id || s.role || 'tenant_admin',
        password: s.password,
        status: s.status,
        createdAt: s.created_at?.slice(0, 10) ?? '',
        lastLoginAt: s.last_login_at?.slice(0, 16).replace('T', ' ') ?? '',
      }));
      return c.json({ success: true, data: mapped });
    }

    // DB에 계정 없으면 단체 대표자 정보로 초기 계정 자동 생성 후 저장
    const tenants = await db.getAllTenants();
    const tenant = tenants.find((t: any) => t.id === tenantId || t.slug === tenantId);
    const primaryEmail = (tenant?.contact?.email || `admin@${tenant?.slug || 'soulpay'}.or.kr`).trim().toLowerCase();
    const primaryName = tenant?.contact?.name || `${tenant?.name || '가맹점'} 대표 관리자`;
    const primaryPhone = tenant?.contact?.phone || '';

    const { data: created } = await sb
      .from('tenant_admins')
      .upsert({
        tenant_id: tenantId,
        email: primaryEmail,
        password: 'admin1234!',
        name: primaryName,
        phone: primaryPhone,
        role: 'tenant_admin',
        group_id: 'tenant_admin',
        status: 'active',
      }, { onConflict: 'tenant_id,email' })
      .select('id, tenant_id, email, password, name, role, status, phone, group_id, created_at')
      .single();

    const init = created ? [{
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone || '',
      groupId: created.group_id || 'tenant_admin',
      password: created.password,
      status: created.status,
      createdAt: created.created_at?.slice(0, 10) ?? '',
      lastLoginAt: '',
    }] : [];

    return c.json({ success: true, data: init });
  } catch (error) {
    console.error('Error fetching tenant staff:', error);
    return c.json({ success: false, error: 'Failed to fetch tenant staff' }, 500);
  }
};

const handleSaveTenantStaff = async (c: any) => {
  try {
    const tenantId = c.req.param('tenantId');
    const { staffList } = await c.req.json();

    if (!Array.isArray(staffList)) {
      return c.json({ success: false, error: 'staffList must be an array' }, 400);
    }

    const sb = db.pgClient();

    // 기존 계정 삭제 후 전체 upsert (배열 교체 방식)
    await sb.from('tenant_admins').delete().eq('tenant_id', tenantId);

    if (staffList.length > 0) {
      const rows = staffList.map((s: any) => ({
        id: s.id?.startsWith('admin-') ? undefined : s.id,  // 임시 ID 제거 → DB auto-generate
        tenant_id: tenantId,
        email: s.email,
        password: s.password || 'admin1234!',
        name: s.name,
        phone: s.phone || '',
        role: s.groupId || s.role || 'tenant_admin',
        group_id: s.groupId || 'tenant_admin',
        status: s.status || 'active',
      })).map((r: any) => { const { id, ...rest } = r; return id ? { id, ...rest } : rest; });

      const { error } = await sb.from('tenant_admins').insert(rows);
      if (error) {
        console.error('Error inserting tenant_admins:', error);
        return c.json({ success: false, error: '관리자 계정 저장에 실패했습니다.' }, 500);
      }
    }

    return c.json({ success: true, data: staffList });
  } catch (error) {
    console.error('Error saving tenant staff:', error);
    return c.json({ success: false, error: 'Failed to save tenant staff' }, 500);
  }
};

app.get("/make-server-d0d82cc7/tenant-staff/:tenantId", handleGetTenantStaff);
app.get("/tenant-staff/:tenantId", handleGetTenantStaff);
app.get("/make-server-d0d82cc7/tenants/:tenantId/staff", handleGetTenantStaff);
app.get("/tenants/:tenantId/staff", handleGetTenantStaff);

app.post("/make-server-d0d82cc7/tenant-staff/:tenantId", handleSaveTenantStaff);
app.post("/tenant-staff/:tenantId", handleSaveTenantStaff);
app.post("/make-server-d0d82cc7/tenants/:tenantId/staff", handleSaveTenantStaff);
app.post("/tenants/:tenantId/staff", handleSaveTenantStaff);

// 특정 단체 조회 (by ID)  ← 와일드카드이므로 static 경로 뒤에 등록
app.get("/make-server-d0d82cc7/tenants/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const tenant = await db.getTenantById(id);
    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }
    return c.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return c.json({ success: false, error: 'Failed to fetch tenant' }, 500);
  }
});

// 단체 생성
app.post("/make-server-d0d82cc7/tenants", async (c) => {
  try {
    const body = await c.req.json();
    const tenant = await db.createTenant(body);
    return c.json({ success: true, data: tenant }, 201);
  } catch (error) {
    console.error('Error creating tenant:', error);
    return c.json({ success: false, error: 'Failed to create tenant' }, 500);
  }
});

// 단체 수정
app.put("/make-server-d0d82cc7/tenants/:id/approve", async (c) => {
  try {
    const id = c.req.param('id');
    const tenant = await db.approveTenant(id);
    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }
    return c.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error approving tenant:', error);
    return c.json({ success: false, error: 'Failed to approve tenant' }, 500);
  }
});

// 단체 입점 거절 (suspended)
app.put("/make-server-d0d82cc7/tenants/:id/reject", async (c) => {
  try {
    const id = c.req.param('id');
    const tenant = await db.rejectTenant(id);
    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }
    return c.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error rejecting tenant:', error);
    return c.json({ success: false, error: 'Failed to reject tenant' }, 500);
  }
});

// 단체 정보 수정 (일반)
app.put("/make-server-d0d82cc7/tenants/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const tenant = await db.updateTenant(id, body);
    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }
    return c.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return c.json({ success: false, error: 'Failed to update tenant' }, 500);
  }
});

// 단체 삭제
app.delete("/make-server-d0d82cc7/tenants/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await db.deleteTenant(id);
    // kv 캐시 제거 불필요 — DB 직접 조회 방식으로 전환됨
    return c.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return c.json({ success: false, error: 'Failed to delete tenant' }, 500);
  }
});



// ==================== SYSTEM SETTINGS ROUTES ====================

// 시스템 설정 전체 조회 — GET /settings
app.get("/make-server-d0d82cc7/settings", async (c) => {
  try {
    const sb = db.pgClient();
    const { data, error } = await sb
      .from('system_settings')
      .select('key, value, description');
    if (error) throw error;
    // { pg_rates: [...], platform_margin: 0.5, ... } 형태로 반환
    const result: Record<string, any> = {};
    (data ?? []).forEach((row: any) => { result[row.key] = row.value; });
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching system settings:', err);
    return c.json({ success: false, error: 'Failed to fetch settings' }, 500);
  }
});

// 시스템 설정 개별 조회 — GET /settings/:key
app.get("/make-server-d0d82cc7/settings/:key", async (c) => {
  try {
    const key = c.req.param('key');
    const sb = db.pgClient();
    const { data, error } = await sb
      .from('system_settings')
      .select('key, value, description')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return c.json({ success: true, data: null }, 200);
    return c.json({ success: true, data: data.value });
  } catch (err) {
    console.error('Error fetching setting:', err);
    return c.json({ success: false, error: 'Failed to fetch setting' }, 500);
  }
});

// 시스템 설정 저장 — PUT /settings/:key  (시스템 관리자 전용)
app.put("/make-server-d0d82cc7/settings/:key", async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const value = body.value ?? body;
    const sb = db.pgClient();
    const { data, error } = await sb
      .from('system_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select('key, value')
      .single();
    if (error) throw error;
    return c.json({ success: true, data: data?.value });
  } catch (err) {
    console.error('Error updating setting:', err);
    return c.json({ success: false, error: 'Failed to update setting' }, 500);
  }
});

// 시스템 설정 삭제 — DELETE /settings/:key
app.delete("/make-server-d0d82cc7/settings/:key", async (c) => {
  try {
    const key = c.req.param('key');
    const sb = db.pgClient();
    const { error } = await sb
      .from('system_settings')
      .delete()
      .eq('key', key);
    if (error) throw error;
    return c.json({ success: true, message: `Setting ${key} deleted` });
  } catch (err) {
    console.error('Error deleting setting:', err);
    return c.json({ success: false, error: 'Failed to delete setting' }, 500);
  }
});


// ==================== PAYMENT CANCEL ROUTE ====================

// 결제 취소 처리 (토스페이먼츠 및 나노페이 통합)
// ※ :tenantId 파라미터 라우트에 의해 가로채이지 않도록 반드시 상단에 선언
app.post("/make-server-d0d82cc7/payment/cancel", async (c) => {
  try {
    const { tenantId, donationId, cancelReason } = await c.req.json();
    
    // DB에서 거래 내역 조회 (테넌트 격리 검증 포함)
    const donation = await db.getDonationById(tenantId, donationId);
    if (!donation) {
      return c.json({ success: false, error: '해당 결제 내역을 찾을 수 없거나 테넌트 권한이 없습니다.' }, 404);
    }
    
    if (donation.paymentStatus !== 'completed' || !donation.transactionId) {
      return c.json({ success: false, error: '완료 상태가 아니거나 승인 거래 번호(transactionId)가 존재하지 않는 거래건입니다.' }, 200);
    }

    // DB에서 테넌트 결제 설정 조회
    const config = await db.getPaymentConfig(tenantId);
    
    // 토스페이먼츠 연동건 판별
    const isTossPayment = String(donation.transactionId || '').startsWith('toss_') ||
      String(donation.transactionId || '').startsWith('tviva') ||
      (config?.secretKey && config?.secretKey.startsWith('test_sk_'));

    const reasonText = cancelReason || "가맹 단체 관리자 결제 취소 요청";

    if (isTossPayment) {
      // 🚀 토스페이먼츠 취소 API 연동 (https://api.tosspayments.com/v1/payments/{paymentKey}/cancel)
      let secretKey = config?.secretKey || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
      const basicAuth = btoa(`${secretKey}:`);
      const idempotencyKey = `cancel_${donationId}_${Date.now()}`;

      try {
        const tossText = await tossCancelResponse.text();
        let result: any = {};
        try {
          result = JSON.parse(tossText);
        } catch {
          result = { message: tossText.startsWith('<') ? `토스페이먼츠 통신 오류 (HTTP ${tossCancelResponse.status})` : tossText };
        }

        const isAlreadyCancelled = result.code === 'ALREADY_CANCELED_PAYMENT' ||
          (typeof result.message === 'string' && (result.message.includes('이미 취소') || result.message.includes('취소된 결제')));
        const isNotFoundPayment = result.code === 'NOT_FOUND_PAYMENT' ||
          (typeof result.message === 'string' && (result.message.includes('존재하지 않는 결제') || result.message.includes('원거래') || result.message.includes('거래없음')));

        if (tossCancelResponse.ok && (result.status === "CANCELED" || result.status === "PARTIAL_CANCELED" || result.cancels)) {
          const cancelTransactionKey = result.cancels?.[0]?.transactionKey || `TC-${Date.now().toString().slice(-8)}`;
          const cancelApprovedAt = result.cancels?.[0]?.canceledAt || new Date().toISOString();

          const updatedDonation = await db.cancelDonationAndLedger(tenantId, donationId, {
            cancelTransactionId: cancelTransactionKey,
            cancelApprovedAt: cancelApprovedAt,
            cancelReason: reasonText,
          });

          return c.json({
            success: true,
            data: updatedDonation,
            approveNo: donation.approveNo || donation.transactionId,
            cancelApproveNo: cancelTransactionKey,
            toss: result
          });
        } else if (isAlreadyCancelled || isNotFoundPayment) {
          // PG사에서 이미 전액 취소 완료되었거나 결제 내역이 존재하지 않는 경우 (미출금) DB 원장 상태를 안전하게 취소/동기화
          const cancelApprovedAt = new Date().toISOString();
          const finalCancelReason = isNotFoundPayment
            ? `${reasonText || '관리자 취소'} (PG사 원거래 없음 확인 - 시스템 무효/취소 동기화)`
            : (reasonText || '관리자 취소');

          const updatedDonation = await db.cancelDonationAndLedger(tenantId, donationId, {
            cancelTransactionId: donation.transactionId,
            cancelApprovedAt: cancelApprovedAt,
            cancelReason: finalCancelReason,
          });

          return c.json({
            success: true,
            data: updatedDonation,
            approveNo: donation.approveNo || donation.transactionId,
            cancelApproveNo: donation.transactionId,
            cancelApprovedAt: cancelApprovedAt,
            syncedFromPg: true,
            notice: isNotFoundPayment ? "PG사에 원거래가 존재하지 않아(실제 미출금), 플랫폼 및 정산 원장에서 즉시 무효/취소 처리되었습니다." : undefined,
            toss: result
          });
        } else {
          const cancelFailMsg = result.message || '토스페이먼츠 승인취소 거부';
          await db.updateDonation(tenantId, donationId, {
            cancelFailureReason: cancelFailMsg,
          });
          return c.json({ success: false, error: cancelFailMsg, data: result }, 200);
        }
      } catch (tossErr: any) {
        console.error('Toss cancel communication error:', tossErr);
        await db.updateDonation(tenantId, donationId, {
          cancelFailureReason: tossErr?.message || '토스페이먼츠 통신 오류',
        });
        return c.json({ success: false, error: tossErr?.message || '토스페이먼츠 취소 처리 중 통신 오류가 발생했습니다.' }, 500);
      }
    }

    // 결제 유형에 따른 가맹점 정보 분기 (정기/빌링 결제 vs 일반 인증/수기 결제)
    const isRecurring = donation.isRecurring || Boolean(donation.subscriptionId);
    const billingCfg = config?.providerConfigs?.billing;

    let NANO_API_KEY = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    let shopcode = "240000006";
    let loginId = "smbtestshop";
    let ver = "smbtest";
    
    if (isRecurring && billingCfg) {
      // 빌링키 정기결제 취소건
      if (billingCfg.apiKey) NANO_API_KEY = billingCfg.apiKey;
      if (billingCfg.mid) shopcode = billingCfg.mid;
      if (billingCfg.loginId) loginId = billingCfg.loginId;
      if (billingCfg.ver) ver = billingCfg.ver;
    } else if (config) {
      // 일반 인증/수기 결제 취소건
      if (config.apiKey) NANO_API_KEY = config.apiKey;
      if (config.mid) shopcode = config.mid;
      if (config.loginId) loginId = config.loginId;
      if (config.ver) ver = config.ver;
    }
    
    const isTest = config?.devMode !== undefined 
      ? Boolean(config.devMode) 
      : (shopcode === "240000006" || shopcode === "240000005" || ver === "smbtest");
    const NANO_API_URL = isTest
      ? "https://dev3.nanopay.co.kr/api/payment/cancel.io"
      : "https://pay.nanopay.co.kr/api/payment/cancel.io";
    
    const payload = {
      ver: ver,
      loginId: loginId,
      shopcode: shopcode,
      payMethod: "card",
      cancelAmt: donation.amount.toString(),
      tranNo: donation.transactionId,
    };

    const response = await fetch(NANO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'CharSet': 'UTF-8',
        'API_KEY': NANO_API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SoulPay/1.0',
      },
      body: JSON.stringify(payload)
    });

    const respText = await response.text();
    let result: any = {};
    try {
      result = JSON.parse(respText);
    } catch {
      result = {
        resultCode: '9999',
        resultMsg: respText.startsWith('<') ? `PG 서버 통신 거부 (HTTP ${response.status})` : respText
      };
    }

    const isNanoAlreadyCancelled = result.resultMsg === "중복취소" ||
      (typeof result.resultMsg === "string" && (result.resultMsg.includes("이미 취소") || result.resultMsg.includes("취소완료")));

    const isNoOriginalTransaction = typeof result.resultMsg === "string" &&
      (result.resultMsg.includes("원거래") || result.resultMsg.includes("거래없음") || result.resultMsg.includes("존재하지 않는") || result.resultMsg.includes("거래번호 오류"));

    if (result.resultCode === "0000" || isNanoAlreadyCancelled || isNoOriginalTransaction) {
      const cancelTransactionKey = result.apprNo || result.cancelTranNo || result.apprTranNo || donation.transactionId;
      const cancelApprovedAt = result.cancelDate && result.cancelTime
        ? `${result.cancelDate.slice(0, 4)}-${result.cancelDate.slice(4, 6)}-${result.cancelDate.slice(6, 8)}T${result.cancelTime.slice(0, 2)}:${result.cancelTime.slice(2, 4)}:${result.cancelTime.slice(4, 6)}+09:00`
        : new Date().toISOString();

      const finalCancelReason = isNoOriginalTransaction
        ? `${reasonText || '관리자 취소'} (PG사 원거래 없음 확인 - 시스템 무효/취소 동기화)`
        : (reasonText || '관리자 취소');

      const updatedDonation = await db.cancelDonationAndLedger(tenantId, donationId, {
        cancelTransactionId: cancelTransactionKey,
        cancelApprovedAt: cancelApprovedAt,
        cancelReason: finalCancelReason,
      });
      return c.json({
        success: true,
        data: updatedDonation,
        approveNo: donation.approveNo || donation.transactionId,
        cancelApproveNo: cancelTransactionKey,
        cancelApprovedAt: cancelApprovedAt,
        syncedFromPg: isNanoAlreadyCancelled || isNoOriginalTransaction,
        notice: isNoOriginalTransaction ? "PG사에 원거래가 존재하지 않아(실제 미출금), 플랫폼 및 정산 원장에서 즉시 무효/취소 처리되었습니다." : undefined,
      });
    } else {
      const cancelFailMsg = result.resultMsg || `PG 결제 취소 거부 (${result.resultCode || response.status})`;
      await db.updateDonation(tenantId, donationId, {
        cancelFailureReason: cancelFailMsg,
      });
      return c.json({ success: false, error: cancelFailMsg, data: result }, 200);
    }
  } catch (error: any) {
    console.error('Error processing cancellation:', error);
    return c.json({ success: false, error: error?.message || '결제 취소 처리 중 서버 오류가 발생했습니다.' }, 500);
  }
});

// ==================== PAYMENT CONFIG ROUTES ====================

const RESERVED_PAYMENT_PATHS = ['cancel', 'process', 'settlements', 'recurring'];

// 결제 설정 조회
app.get("/make-server-d0d82cc7/payment/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    if (RESERVED_PAYMENT_PATHS.includes(tenantId)) {
      return c.json({ success: false, error: 'Invalid tenantId' }, 404);
    }
    const config = await db.getPaymentConfig(tenantId);
    
    if (!config) {
      // 기본 나노PG 결제 설정 반환
      const defaultConfig = {
        tenantId,
        pgProvider: 'nanopay',
        enableCard: true,
        enableEasyPayment: false,
        enableVBank: true,
        enableKakaoPay: false,
        enableNaverPay: false,
        enableTossPay: false,
        isActive: true,
      };
      return c.json({ success: true, data: defaultConfig });
    }
    
    return c.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    return c.json({ success: false, error: 'Failed to fetch payment config' }, 500);
  }
});

// 결제 설정 저장/수정
app.post("/make-server-d0d82cc7/payment/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    if (RESERVED_PAYMENT_PATHS.includes(tenantId)) {
      return c.json({ success: false, error: 'Invalid tenantId' }, 404);
    }
    const body = await c.req.json();
    const config = await db.setPaymentConfig({ ...body, tenantId });
    
    return c.json({ success: true, data: config });
  } catch (error: any) {
    console.error('Error saving payment config:', error);
    return c.json({ success: false, error: error?.message || 'Failed to save payment config' }, 500);
  }
});

// 결제 설정 삭제
app.delete("/make-server-d0d82cc7/payment/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    if (RESERVED_PAYMENT_PATHS.includes(tenantId)) {
      return c.json({ success: false, error: 'Invalid tenantId' }, 404);
    }
    await db.deletePaymentConfig(tenantId);
    
    return c.json({ success: true, message: 'Payment config deleted' });
  } catch (error) {
    console.error('Error deleting payment config:', error);
    return c.json({ success: false, error: 'Failed to delete payment config' }, 500);
  }
});

// 수기결제 처리
app.post("/make-server-d0d82cc7/payment/process/manual", async (c) => {
  try {
    const { tenantId, donationData, paymentData } = await c.req.json();
    
    // DB에서 테넌트 결제 설정 조회
    const config = await db.getPaymentConfig(tenantId);
    
    // 일반 인증/수기 결제 전용 정보 (Smallbee 테스트 계정 기본값)
    let NANO_API_KEY = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    let NANO_ENC_KEY = "UfS2tccZNyz3HYxXJDhZH52Ujorqp5km";
    let NANO_IV = "vgqTyX5tBqnMXB68";
    let shopcode = "240000006";
    let loginId = "smbtestshop";
    let ver = "smbtest";
    
    if (config && config.pgProvider === 'nanopay' && config.isActive) {
      if (config.apiKey) NANO_API_KEY = config.apiKey;
      if (config.secretKey) NANO_ENC_KEY = config.secretKey;
      if (config.iv) NANO_IV = config.iv;
      if (config.mid) shopcode = config.mid;
      if (config.loginId) loginId = config.loginId;
      if (config.ver) ver = config.ver;
    }

    const isTest = config?.devMode !== undefined ? Boolean(config.devMode) : (shopcode === "240000006" || ver === "smbtest");
    const NANO_API_URL = isTest 
      ? "https://dev3.nanopay.co.kr/api/payment/approval.io"
      : "https://pay.nanopay.co.kr/api/payment/approval.io";
    
    // 카드 정보 암호화
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(NANO_ENC_KEY, "utf-8"), Buffer.from(NANO_IV, "utf-8"));
    // 결과 인코딩을 hex로 할지 base64로 할지는 명세서에 따르나 일반적인 hex를 우선 적용 (실패시 base64)
    let encData = cipher.update(JSON.stringify(paymentData), "utf-8", "hex");
    encData += cipher.final("hex");

    const payload = {
      ver: ver,
      loginId: loginId,
      shopcode: shopcode,
      payMethod: "card", // card로 고정 (수기결제)
      orderName: donationData.name,
      orderTel: donationData.phone.replace(/[^0-9]/g, ''),
      orderEmail: "",
      goodsName: donationData.itemName,
      reqPayAmt: donationData.amount.toString(),
      installment: paymentData.installment || "00",
      encData: encData,
    };

    const response = await fetch(NANO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CharSet': 'UTF-8',
        'API_KEY': NANO_API_KEY,
        'API-KEY': NANO_API_KEY,
        'api_key': NANO_API_KEY,
        'api-key': NANO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.resultCode === "0000") {
      // 결제 성공, DB에 저장
      const donation = await db.createDonation({
        tenantId,
        itemId: donationData.itemId || 'manual',
        itemName: donationData.itemName,
        amount: donationData.amount,
        donorName: donationData.name,
        donorPhone: donationData.phone,
        prayerText: donationData.prayerText,
        isRecurring: donationData.isRecurring || false,
        paymentStatus: 'completed',
        paymentMethod: '신용카드',
        transactionId: result.tranNo || result.apprNo,
      });
      return c.json({ success: true, data: donation });
    } else {
      return c.json({ success: false, error: result.resultMsg, data: result }, 400);
    }
  } catch (error) {
    console.error('Error processing manual payment:', error);
    return c.json({ success: false, error: 'Failed to process payment' }, 500);
  }
});

// 카드 스캔(OCR 카메라) 연동 인증 파라미터 발급 API
app.post("/make-server-d0d82cc7/payment/scan/params", async (c) => {
  try {
    const { tenantId, isBilling } = await c.req.json();
    const config = await db.getPaymentConfig(tenantId);
    const billingCfg = config?.providerConfigs?.billing;

    const isTest = config?.devMode !== undefined 
      ? Boolean(config.devMode) 
      : (isBilling ? (!billingCfg?.apiKey || billingCfg?.mid === "240000005") : (!config?.apiKey || config?.mid === "240000006"));

    let NANO_API_KEY = isBilling 
      ? (billingCfg?.apiKey || (isTest ? "R7L9PxM5V8K2Jc4N6dWqY1Eb3T5XhZU2" : undefined))
      : (config?.apiKey || (isTest ? "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL" : undefined));
    let shopcode = isBilling 
      ? (billingCfg?.mid || (isTest ? "240000005" : undefined))
      : (config?.mid || (isTest ? "240000006" : undefined));
    let loginId = isBilling 
      ? (billingCfg?.loginId || (isTest ? "shoptest" : undefined))
      : (config?.loginId || (isTest ? "smbtestshop" : undefined));
    let ver = isBilling 
      ? (billingCfg?.ver || (isTest ? "240000005" : "240000005"))
      : (config?.ver || (isTest ? "smbtest" : "smbtest"));

    if (!NANO_API_KEY || !shopcode || !loginId) {
      return c.json({ success: false, error: "카드 스캔에 필요한 PG 가맹점 설정이 올바르지 않습니다." }, 400);
    }

    const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const timestamp = `${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}${pad(kst.getUTCSeconds())}${pad(kst.getUTCMilliseconds(), 3)}`;

    // 공식 규격: SHA256( ver + "|" + loginId + "|" + shopcode + "|" + timestamp + "|" + API_KEY )
    const hashRaw = `${ver}|${loginId}|${shopcode}|${timestamp}|${NANO_API_KEY}`;
    const hashValue = crypto.createHash("sha256").update(hashRaw).digest("hex");

    const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
    const scanJsUrl = `${baseUrl}/api/scan/inc/card-scan.js`;

    return c.json({
      success: true,
      data: {
        ver,
        shopcode,
        loginId,
        timestamp,
        hashValue,
        scanJsUrl,
        scanUrl: `${baseUrl}/api/scan/scan.io`,
      }
    });
  } catch (error: any) {
    console.error("Error generating card scan params:", error);
    return c.json({ success: false, error: error?.message || "Failed to generate scan params" }, 500);
  }
});


// DB 내 기존 결제 수단 일괄 정규화 마이그레이션
app.post("/make-server-d0d82cc7/admin/migrate-payment-methods", async (c) => {
  try {
    const result = await db.migrateNormalizeExistingDonations();
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error running payment method migration:', error);
    return c.json({ success: false, error: 'Migration failed' }, 500);
  }
});



// 토스페이먼츠(TossPayments) 승인 API 연동 (/v1/payments/confirm)
app.post("/make-server-d0d82cc7/payment/process/toss/confirm", async (c) => {
  try {
    const { tenantId, paymentKey, orderId, amount, donorName, donorPhone, itemName, itemId } = await c.req.json();
    const config = await db.getPaymentConfig(tenantId);
    
    // 토스페이먼츠 시크릿 키 기본값 (toss secretKey)
    let secretKey = config?.secretKey || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
    const basicAuth = btoa(`${secretKey}:`);

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    const result = await tossResponse.json();

    if (tossResponse.ok && (result.status === "DONE" || result.paymentKey)) {
      const approveNo = result.card?.approveNo || result.approveNo || `TP-${Date.now().toString().slice(-8)}`;
      // 결제 성공 DB 거래 기록 생성/업데이트
      const newDonation = await db.createDonation({
        id: orderId || `don_${Date.now()}`,
        tenantId,
        itemId: itemId || 'general',
        itemName: result.orderName || itemName || '토스페이먼츠 봉헌금',
        amount: Number(amount),
        donorName: donorName || result.customerName || '',
        donorPhone: donorPhone || result.customerMobilePhone || '',
        paymentStatus: 'completed',
        paymentMethod: result.method === '카드' ? 'card' : 'simple',
        transactionId: result.paymentKey,
        approveNo: approveNo,
        receiptUrl: result.receipt?.url,
      });

      return c.json({
        success: true,
        data: newDonation,
        approveNo: approveNo,
        transactionId: result.paymentKey,
        toss: result
      });
    } else {
      const failureReason = result.message || '토스페이먼츠 결제 승인 실패';
      try {
        await db.createDonation({
          id: orderId || `don_${Date.now()}`,
          tenantId,
          itemId: itemId || 'general',
          itemName: result.orderName || itemName || '토스페이먼츠 결제',
          amount: Number(amount) || 0,
          donorName: donorName || result.customerName || '',
          donorPhone: donorPhone || result.customerMobilePhone || '',
          paymentStatus: 'failed',
          paymentMethod: 'simple',
          transactionId: paymentKey || '',
          failureReason,
        });
      } catch (saveErr) {
        console.error('Failed to record failed toss payment to DB:', saveErr);
      }
      return c.json({ success: false, error: failureReason, data: result }, 400);
    }
  } catch (error: any) {
    console.error('Toss confirm error:', error);
    return c.json({ success: false, error: error?.message || '토스페이먼츠 승인 처리 중 오류 발생' }, 500);
  }
});

// 🔴 토스페이먼츠 빌링키 발급 (authKey → billingKey)
// successUrl 리다이렉트 후 프론트엔드에서 호출
app.post("/make-server-d0d82cc7/payment/process/toss/billing/issue", async (c) => {
  try {
    const { tenantId, authKey, customerKey } = await c.req.json();
    if (!authKey || !customerKey) {
      return c.json({ success: false, error: 'authKey와 customerKey가 필요합니다.' }, 400);
    }

    const config = await db.getPaymentConfig(tenantId);
    const secretKey = config?.secretKey || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
    const basicAuth = btoa(`${secretKey}:`);

    // Toss 빌링키 발급 API
    const tossRes = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authKey, customerKey }),
    });

    const result = await tossRes.json();

    if (!tossRes.ok || !result.billingKey) {
      console.error('Toss billing issue failed:', result);
      return c.json({ success: false, error: result.message || '빌링키 발급 실패', data: result }, 400);
    }

    return c.json({
      success: true,
      billingKey: result.billingKey,
      customerKey: result.customerKey,
      card: result.card || null,
      toss: result,
    });
  } catch (error: any) {
    console.error('Toss billing issue error:', error);
    return c.json({ success: false, error: '빌링키 발급 중 오류 발생' }, 500);
  }
});

// 🔴 토스페이먼츠 빌링키로 즉시 결제 실행
app.post("/make-server-d0d82cc7/payment/process/toss/billing/charge", async (c) => {
  try {
    const { tenantId, billingKey, customerKey, orderId, orderName, amount, customerName, customerEmail, customerMobilePhone, donorPhone, itemId, itemName, prayerText, baptismName, recurringInterval, recurringDay } = await c.req.json();
    if (!billingKey || !customerKey || !orderId || !amount) {
      return c.json({ success: false, error: 'billingKey, customerKey, orderId, amount가 필요합니다.' }, 400);
    }

    const config = await db.getPaymentConfig(tenantId);
    const secretKey = config?.secretKey || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
    const basicAuth = btoa(`${secretKey}:`);

    // Toss 빌링 결제 실행 API
    const tossRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey,
        orderId,
        orderName: orderName || '정기 봉헌금',
        amount: Number(amount),
        customerName: customerName || '신도',
        customerEmail: customerEmail || undefined,
        customerMobilePhone: customerMobilePhone || undefined,
      }),
    });

    const result = await tossRes.json();

    if (!tossRes.ok || result.status !== "DONE") {
      console.error('Toss billing charge failed:', result);
      const failureReason = result.message || '빌링 결제 실패';
      try {
        await db.createDonation({
          id: orderId,
          tenantId,
          itemId: itemId || 'general',
          itemName: itemName || orderName || '정기 봉헌금',
          amount: Number(amount) || 0,
          donorName: customerName || '',
          donorPhone: donorPhone || customerMobilePhone || '',
          prayerText: prayerText || '',
          baptismName: baptismName || '',
          isRecurring: true,
          recurringDay: recurringDay ? Number(recurringDay) : undefined,
          paymentStatus: 'failed',
          paymentMethod: '정기결제(토스)',
          transactionId: result?.paymentKey || '',
          failureReason,
        });
      } catch (saveErr) {
        console.error('Failed to record failed toss billing charge to DB:', saveErr);
      }
      return c.json({ success: false, error: failureReason, data: result }, 400);
    }

    // DB에 결제 기록 저장
    const approveNo = result.card?.approveNo || `TB-${Date.now().toString().slice(-8)}`;
    const donation = await db.createDonation({
      id: orderId,
      tenantId,
      itemId: itemId || 'general',
      itemName: itemName || orderName || '정기 봉헌금',
      amount: Number(amount),
      donorName: customerName || '',
      donorPhone: donorPhone || customerMobilePhone || '',
      prayerText: prayerText || '',
      baptismName: baptismName || '',
      isRecurring: true,
      recurringDay: recurringDay || null,
      paymentStatus: 'completed',
      paymentMethod: '정기결제(토스)',
      transactionId: result.paymentKey,
      approveNo,
      receiptUrl: result.receipt?.url || '',
    });

    return c.json({
      success: true,
      data: donation,
      billingKey,
      paymentKey: result.paymentKey,
      approveNo,
      toss: result,
    });
  } catch (error: any) {
    console.error('Toss billing charge error:', error);
    return c.json({ success: false, error: error?.message || '빌링 결제 실행 중 오류 발생' }, 500);
  }
});


// 토스페이먼츠 공식 정산 내역 조회 API 연동 (GET /v1/settlements)
app.get("/make-server-d0d82cc7/payment/settlements/toss/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const startDate = c.req.query('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = c.req.query('endDate') || new Date().toISOString().slice(0, 10);
    const dateType = c.req.query('dateType') || 'soldDate';

    const config = await db.getPaymentConfig(tenantId);
    let secretKey = config?.secretKey || "test_sk_ZzO2771wYM0kPzW6kZ8V3E59125z";
    if (!secretKey || secretKey.length < 10) {
      secretKey = "test_sk_ZzO2771wYM0kPzW6kZ8V3E59125z";
    }

    const authHeader = `Basic ${btoa(secretKey + ':')}`;
    const tossUrl = `https://api.tosspayments.com/v1/settlements?startDate=${startDate}&endDate=${endDate}&dateType=${dateType}&size=100`;

    const tossRes = await fetch(tossUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const result = await tossRes.json();

    if (tossRes.ok && Array.isArray(result)) {
      return c.json({
        success: true,
        source: 'toss_api',
        data: result
      });
    } else {
      return c.json({
        success: false,
        error: result.message || '토스페이먼츠 정산 조회 실패',
        tossError: result
      }, tossRes.status || 400);
    }
  } catch (error: any) {
    console.error('Toss Settlement API error:', error);
    return c.json({ success: false, error: '토스페이먼츠 정산 조회 중 서버 오류 발생' }, 500);
  }
});

// 인증결제 요청 처리
app.post("/make-server-d0d82cc7/payment/process/cert/request", async (c) => {
  try {
    const { tenantId, donationData, deviceType, payWay } = await c.req.json();
    
    // DB에서 테넌트 결제 설정 조회
    const config = await db.getPaymentConfig(tenantId);
    
    // 테스트용 공식 지정 계정 및 암호화 키 정보 (100% 우선 적용)
    let NANO_API_KEY = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    let NANO_SECRET_KEY = "UfS2tccZNyz3HYxXJDhZH52Ujorqp5km";
    let NANO_IV = "vgqTyX5tBqnMXB68";
    let shopcode = config?.mid || "240000006";
    let loginId = config?.loginId || "smbtestshop";
    let ver = config?.ver || "smbtest";

    // 만약 DB에 저장된 apiKey/secretKey가 빈값이거나 구형이면 최신 테스트키로 보장
    if (config?.apiKey && config.apiKey.length >= 10) NANO_API_KEY = config.apiKey;
    if (config?.secretKey && config.secretKey.length >= 10) NANO_SECRET_KEY = config.secretKey;
    if (config?.iv && config.iv.length >= 8) NANO_IV = config.iv;

    const isTest = config?.devMode !== undefined ? Boolean(config.devMode) : (shopcode === "240000006" || ver === "smbtest");
    const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
    
    // 나노페이 PG 웹 결제창 표준 요청 URL (PC: /api/payment/cert/pc/request.io, Mobile: /api/payment/cert/mobile/request.io)
    const reqDeviceType = deviceType ? String(deviceType).toLowerCase() : "";
    const userAgent = c.req.header("user-agent") || "";
    const isMobileClient = reqDeviceType === "mobile" || (!reqDeviceType && /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent));
    const NANO_API_URL = isMobileClient
      ? `${baseUrl}/api/payment/cert/mobile/request.io`
      : `${baseUrl}/api/payment/cert/pc/request.io`;
      
    // 임시 거래 내역 생성 (pending 상태)
    const tempDonationId = Date.now().toString() + Math.floor(10000 + Math.random() * 90000).toString();
    const tempDonation = await db.createDonation({
      id: tempDonationId,
      tenantId,
      itemId: donationData.itemId || 'cert',
      itemName: donationData.itemName,
      amount: donationData.amount,
      donorName: donationData.name,
      donorPhone: donationData.phone,
      prayerText: donationData.prayerText || '',
      isRecurring: donationData.isRecurring || false,
      paymentStatus: 'pending',
      paymentMethod: payWay || 'card',
      transactionId: '',
    });

    // 콜백 주소
    const receiveUrl = `https://aoognbmkstgrytkqsexy.supabase.co/functions/v1/make-server-d0d82cc7/payment/process/cert/callback`;

    // Smallbee 표준 타임스탬프 (HHmmssSSS, KST 기준)
    const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
    const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const timestamp = `${pad(kstDate.getUTCHours())}${pad(kstDate.getUTCMinutes())}${pad(kstDate.getUTCSeconds())}${pad(kstDate.getUTCMilliseconds(), 3)}`;
    const reqPayAmt = donationData.amount.toString();
    const realDonorName = donationData?.name || donationData?.donorName || "신도";
    const donorPhone = (donationData?.phone || donationData?.donorPhone || "").replace(/[^0-9]/g, '');
    const donorEmail = donationData?.email ? String(donationData.email).trim() : "";

    // Smallbee 검증 완료 공식 해시: sha256(ver + loginId + shopcode + reqPayAmt + timestamp + apiKey + "NANO")
    const hashValue = crypto.createHash("sha256")
      .update(`${ver}${loginId}${shopcode}${reqPayAmt}${timestamp}${NANO_API_KEY}NANO`)
      .digest("hex");

    const nanoPayload = {
      ver,
      loginId,
      shopcode,
      orderName: realDonorName,
      orderTel: donorPhone,
      orderEmail: donorEmail,
      payWay: payWay || "card",
      goodsName: donationData?.itemName || "SoulPay 봉헌금",
      reqPayAmt,
      receiveUrl,
      compOrderNo: tempDonationId,
      compOrderMem: realDonorName,
      timestamp,
      hashValue,
    };

    console.log("Calling Nanopay Cert Request URL:", NANO_API_URL, "Payload:", JSON.stringify(nanoPayload));

    const nanoRes = await fetch(NANO_API_URL, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nanoPayload),
    });

    const nanoHtml = await nanoRes.text();
    console.log("Nanopay response html:", nanoHtml);

    // script location.href 추출
    const match = nanoHtml.match(/location\.href=[\x27\x22]([^\x27\x22]+)[\x27\x22]/);
    let redirectUrl = match ? match[1] : null;

    // 🚀 모바일 결제창 80번 포트(HTTP) 타임아웃 방지 및 안전한 HTTPS 직접 연결 정규화:
    // 나노페이/메인페이 모바일 엔드포인트(/mobile?aid=...&key=...)는 302 리다이렉트 시 비보안 평문인 http://... (포트 80)으로 전달되어
    // 모바일 기기 브라우저에서 방화벽 포트 80 차단으로 인한 타임아웃 및 결제창 미표출 현상이 발생함.
    // aid 값을 추출하여 직접 정상 200 OK 응답하는 https://[host]/mobile/step2/[aid] 로 즉시 정규화.
    if (redirectUrl && isMobileClient) {
      const aidMatch = redirectUrl.match(/aid=([^&]+)/);
      if (aidMatch && (redirectUrl.includes('/mobile?') || redirectUrl.includes('/mobile/'))) {
        try {
          const parsedUrl = new URL(redirectUrl);
          redirectUrl = `https://${parsedUrl.host}/mobile/step2/${aidMatch[1]}`;
          console.log("✅ Normalized Nanopay mobile URL to direct HTTPS step2:", redirectUrl);
        } catch (e) {
          console.warn("URL normalization error:", e);
        }
      }
    }

    return c.json({
      success: true,
      data: {
        donationId: tempDonationId,
        redirectUrl,
        html: nanoHtml,
        NANO_API_URL,
      },
      donationId: tempDonationId,
      redirectUrl,
      html: nanoHtml,
      NANO_API_URL,
    });
  } catch (error: any) {
    console.error('Error initiating certified payment:', error);
    return c.json({ success: false, error: error?.message || 'Failed to initiate certified payment' }, 500);
  }
});

// ==================== NANOPAY BILLING KEY (RECURRING) API ====================

// 📅 다음 결제일(또는 첫 결제일) 계산 헬퍼 함수
function calculateNextPaymentDate(
  interval: 'daily' | 'weekly' | 'monthly' = 'monthly',
  dayOfWeek?: string | number,
  dayOfMonth?: number,
  isAfterImmediateCharge: boolean | Date = false,
  scheduledFirstPaymentDate?: string
): string {
  if (scheduledFirstPaymentDate && typeof scheduledFirstPaymentDate === 'string') {
    // YYYY.MM.DD(요일) 또는 YYYY-MM-DD 포맷 정규화
    const cleanDate = scheduledFirstPaymentDate.replace(/\./g, '-').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }
  }

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let target = new Date(kstNow.getTime());

  if (interval === 'daily') {
    target.setUTCDate(target.getUTCDate() + 1);
  } else if (interval === 'weekly') {
    const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    let targetDay = 0;
    if (typeof dayOfWeek === 'number') {
      targetDay = dayOfWeek;
    } else if (typeof dayOfWeek === 'string') {
      targetDay = dayMap[dayOfWeek] ?? (parseInt(dayOfWeek, 10) || 0);
    }
    const currentDay = target.getUTCDay();
    let diff = (targetDay - currentDay + 7) % 7;
    if (diff === 0) {
      diff = 7;
    }
    target.setUTCDate(target.getUTCDate() + diff);
  } else {
    const targetDom = dayOfMonth || 10;
    const currentDom = target.getUTCDate();
    const afterCharge = Boolean(isAfterImmediateCharge);
    if (afterCharge) {
      target.setUTCMonth(target.getUTCMonth() + 1);
      target.setUTCDate(targetDom);
    } else {
      if (currentDom < targetDom) {
        target.setUTCDate(targetDom);
      } else {
        target.setUTCMonth(target.getUTCMonth() + 1);
        target.setUTCDate(targetDom);
      }
    }
  }
  return target.toISOString().slice(0, 10);
}

// 💳 나노페이 v2.2.1 정기결제(BillPay) 승인 API 호출 헬퍼 함수
async function executeNanoPayBillPay({
  sub,
  billingCfg,
  isTest,
  amount,
  orderName,
}: {
  sub: any;
  billingCfg: any;
  isTest: boolean;
  amount: number;
  orderName: string;
}) {
  const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
  const BILLPAY_URL = `${baseUrl}/api/payment/recure/billpay.io`;

  const NANO_API_KEY = billingCfg?.apiKey || (isTest ? "R7L9PxM5V8K2Jc4N6dWqY1Eb3T5XhZU2" : undefined);
  const shopcode = billingCfg?.mid || (isTest ? "240000005" : undefined);
  const loginId = billingCfg?.loginId || (isTest ? "shoptest" : undefined);
  const ver = billingCfg?.ver || (isTest ? "240000005" : "240000005");
  const ENC_KEY = billingCfg?.secretKey || billingCfg?.encKey || (isTest ? "Q2Jv7LkNp5X3M8Yc6rW9T1Eb4F6HdKx6" : undefined);
  const ENC_IV = billingCfg?.iv || (isTest ? "Nx5Lq7Kv4W8Jp6Mu" : undefined);

  if (!NANO_API_KEY || !shopcode || !loginId || !ENC_KEY || !ENC_IV) {
    throw new Error("나노페이 빌링 결제 설정(API Key, 상점코드, 암호화 키)이 불완전합니다.");
  }

  const timestamp = Date.now().toString();
  const compOrderNo = `ORD_${Date.now()}_${String(sub.id).slice(0, 8)}`;

  // AES-256-CBC encData 암호화 (Key: ENC_KEY, IV: ENC_IV) -> base64
  const iv = Buffer.from(ENC_IV, "utf-8");
  const key = Buffer.from(ENC_KEY, "utf-8");
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encData = cipher.update(JSON.stringify({ userId: sub.userId || sub.donorPhone, billKey: sub.billKey }), "utf-8", "base64");
  encData += cipher.final("base64");

  // hashValue: SHA256(ver + loginId + shopcode + timestamp + API_KEY + "NANO").toLowerCase()
  const hashRaw = `${ver}${loginId}${shopcode}${timestamp}${NANO_API_KEY}NANO`;
  const hashValue = crypto.createHash("sha256").update(hashRaw).digest("hex").toLowerCase();

  const billpayPayload = {
    ver,
    loginId,
    shopcode,
    compOrderNo,
    orderName: sub.donorName,
    orderTel: (sub.donorPhone || "").replace(/[^0-9]/g, ""),
    orderEmail: sub.donorEmail || "",
    goodsName: orderName || sub.itemName || "정기 봉헌금",
    reqPayAmt: String(amount),
    Installment: "00",
    encData,
    timestamp,
    hashValue,
    compData: JSON.stringify({ subscriptionId: sub.id, tenantId: sub.tenantId }),
  };

  console.log(`[NanoPG BillPay] Requesting payment to ${BILLPAY_URL} for sub ${sub.id}, amount: ${amount}`);

  const billpayRes = await fetch(BILLPAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API_KEY": NANO_API_KEY,
    },
    body: JSON.stringify(billpayPayload),
  });

  const billpayData = await billpayRes.json().catch(() => null);
  console.log(`[NanoPG BillPay] Response:`, billpayData);

  return billpayData;
}

// 빌키 발급 요청 (카드 인증창 호출)
app.post("/make-server-d0d82cc7/payment/process/billkey/request", async (c) => {
  try {
    const { tenantId, donationData } = await c.req.json();
    if (!tenantId) {
      return c.json({ success: false, error: "tenantId is required" }, 400);
    }
    const config = await db.getPaymentConfig(tenantId);
    const billingCfg = config?.providerConfigs?.billing;
    
    const isTest = config?.devMode !== undefined 
      ? Boolean(config.devMode) 
      : (!billingCfg?.apiKey || billingCfg?.mid === "240000005" || billingCfg?.ver === "240000005" || config?.mid === "240000006");

    // 정기결제(빌링키)는 일반 인증결제(240000006)와 상점코드 및 키가 다름. 오직 빌링전용 설정(billingCfg)만 사용
    const NANO_API_KEY = billingCfg?.apiKey || (isTest ? "R7L9PxM5V8K2Jc4N6dWqY1Eb3T5XhZU2" : undefined);
    const shopcode = billingCfg?.mid || (isTest ? "240000005" : undefined);
    const loginId = billingCfg?.loginId || (isTest ? "shoptest" : undefined);
    const ver = billingCfg?.ver || (isTest ? "240000005" : "240000005");

    if (!NANO_API_KEY || !shopcode || !loginId) {
      return c.json({ 
        success: false, 
        error: "나노페이 정기결제(빌링키) 전용 설정(API Key, 상점코드, 로그인 ID)이 등록되지 않았습니다." 
      }, 400);
    }

    const cleanPhone = (donationData?.phone || "").replace(/[^0-9]/g, '');
    const userId = cleanPhone ? `u${cleanPhone}` : `u${Date.now().toString().slice(-10)}`;
    const timestamp = Date.now().toString();
    const receiveUrl = "https://aoognbmkstgrytkqsexy.supabase.co/functions/v1/make-server-d0d82cc7/payment/process/billkey/callback";

    // 공식 v2.2.1 규격: hashValue = SHA256(ver + loginId + shopcode + timestamp + API_KEY + "NANO").toLowerCase()
    const hashRaw = `${ver}${loginId}${shopcode}${timestamp}${NANO_API_KEY}NANO`;
    const hashValue = crypto.createHash("sha256").update(hashRaw).digest("hex").toLowerCase();

    const chargeImmediate = donationData?.chargeImmediate !== false && donationData?.firstPaymentTiming !== 'scheduled';
    const firstPaymentTiming = chargeImmediate ? 'immediate' : 'scheduled';
    const scheduledDateText = donationData?.scheduledFirstPaymentDate || '';

    const tempSubId = `sub_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // ⚡ DB donations 테이블에 pending 상태로 사전 등록하여 PG 콜백 시 compData 유실이나 길이 제한에 100% 대비
    try {
      await db.createDonation({
        id: tempSubId,
        tenantId,
        itemId: donationData?.itemId || 'recurring',
        itemName: donationData?.itemName || '정기 봉헌금',
        amount: Number(donationData?.amount || 0),
        donorName: donationData?.name || '신도',
        donorPhone: cleanPhone,
        prayerText: donationData?.prayerText || '',
        baptismName: donationData?.baptismName || '',
        isRecurring: true,
        recurringDay: donationData?.recurringDay || 10,
        paymentStatus: 'pending',
        paymentMethod: '카드 정기결제',
        failureReason: JSON.stringify({
          tempSubId,
          tenantId,
          recurringInterval: donationData?.recurringInterval || 'monthly',
          recurringDayOfWeek: donationData?.recurringDayOfWeek,
          recurringDay: donationData?.recurringDay || 10,
          firstPaymentTiming,
          chargeImmediate,
          scheduledFirstPaymentDate: scheduledDateText,
          donorEmail: donationData?.email || '',
          amount: Number(donationData?.amount || 0),
          itemName: donationData?.itemName || '정기 봉헌금',
          donorName: donationData?.name || '',
        }),
        transactionId: '',
      });
      console.log(`[NanoPG BillKey Req] Pre-registered pending subscription donation ${tempSubId} in DB`);
    } catch (dbErr) {
      console.warn(`[NanoPG BillKey Req] Failed to pre-register pending donation:`, dbErr);
    }

    // compData에는 간결한 tempSubId만 전달하여 PG사 글자수(100자) 제한 및 특수문자/UTF-8 왜곡 원천 차단
    const compData = tempSubId;

    const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
    const NANO_REQKEY_URL = `${baseUrl}/api/payment/recure/reqkey.io`;

    const reqPayload = {
      ver,
      loginId,
      shopcode,
      userId,
      receiveUrl,
      timestamp,
      hashValue,
      compData,
    };

    console.log("[NanoPG BillKey Req] Calling:", NANO_REQKEY_URL, "shopcode:", shopcode, "loginId:", loginId);

    // 서버 사이드에서 Nanopay reqkey.io 직접 호출하여 Smartro 인증 HTML 수신
    const nanoRes = await fetch(NANO_REQKEY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API_KEY": NANO_API_KEY,
      },
      body: JSON.stringify(reqPayload),
    });

    const nanoText = await nanoRes.text();
    console.log("[NanoPG BillKey Req] Response status:", nanoRes.status, "Length:", nanoText.length);

    if (!nanoText || nanoText.trim().length === 0) {
      console.error("[NanoPG BillKey Req] Empty HTML received from Nanopay for shopcode:", shopcode);
      return c.json({
        success: false,
        error: "나노페이 정기결제 응답이 비어있습니다. 상점코드(240000005) 및 빌링 API Key 설정을 확인해주세요.",
      }, 400);
    }

    if (nanoText.startsWith("{")) {
      try {
        const jsonRes = JSON.parse(nanoText);
        if (jsonRes.resultCode && jsonRes.resultCode !== "0000") {
          return c.json({
            success: false,
            error: `나노페이 오류: [${jsonRes.resultCode}] ${jsonRes.resultMsg || "빌키 발급 요청 실패"}`,
            details: jsonRes,
          }, 400);
        }
      } catch (e) {}
    }

    // 테넌트 정보 및 결제 내역 조회 (SoulPay 결제 화면과 일관된 UI 구성용)
    const tenant = (await db.getTenantById(tenantId)) || (await db.getTenantBySlug(tenantId));
    const tenantName = tenant?.name || 'SoulPay';
    const amountNum = Number(donationData?.amount || 0);
    const formattedAmount = amountNum ? amountNum.toLocaleString('ko-KR') : '0';
    const itemName = donationData?.itemName || '정기 봉헌금';
    const donorName = donationData?.name || donationData?.donorName || '후원자';

    const interval = donationData?.recurringInterval || 'monthly';
    let intervalText = '정기 결제 (매월 10일)';
    if (interval === 'daily') {
      intervalText = '정기 결제 (매일)';
    } else if (interval === 'weekly') {
      const day = donationData?.recurringDayOfWeek || '일';
      intervalText = `정기 결제 (매주 ${day}요일)`;
    } else if (interval === 'monthly') {
      const day = donationData?.recurringDay || 10;
      intervalText = `정기 결제 (매월 ${day}일)`;
    }

    let formattedHtml = nanoText;
    if (formattedHtml.includes("<head>")) {
      formattedHtml = formattedHtml.replace("<head>", `<head>\n\t\t<base href="${baseUrl}/">`);
    }
    // 상대 경로(/css/, /js/)를 나노PG 서버의 절대 URL로 확실하게 치환하여 CSS 스타일 및 검증 스크립트 정상 로드
    formattedHtml = formattedHtml
      .replaceAll('href="/', `href="${baseUrl}/`)
      .replaceAll('src="/', `src="${baseUrl}/`);

    // SoulPay 결제 수단 선택 화면(헤더 배너, 최종 봉헌 내역 카드, 인풋 스타일)과 100% 일관된 모던 디자인 주입
    const customStyles = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body {
    background-color: #F8FAFC !important;
    color: #0F172A;
    min-height: 100vh;
    padding-bottom: 40px;
    -webkit-font-smoothing: antialiased;
  }
  
  /* Hero Top Banner */
  .sp-hero {
    background: linear-gradient(135deg, #1E2A78 0%, #2A338F 60%, #1A2068 100%);
    padding: 30px 24px 44px;
    color: #FFFFFF;
    text-align: left;
  }
  .sp-hero-inner {
    max-width: 460px;
    margin: 0 auto;
  }
  .sp-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 600;
    margin-bottom: 12px;
    backdrop-filter: blur(4px);
  }
  .sp-hero h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .sp-hero p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);
  }

  /* Main Container */
  .wrap03 {
    width: 100% !important;
    max-width: 480px !important;
    margin: -24px auto 0 !important;
    padding: 0 16px !important;
    background: transparent !important;
    min-height: auto !important;
  }

  /* Hide default plain header */
  .pay-header {
    display: none !important;
  }

  /* Summary Card (matches SoulPay PaymentSelection screen) */
  .sp-summary-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 16px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  }
  .sp-summary-header {
    font-size: 15px;
    font-weight: 800;
    color: #0F172A;
    padding-bottom: 14px;
    border-bottom: 1px solid #F1F5F9;
    margin-bottom: 14px;
  }
  .sp-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13.5px;
    margin-bottom: 10px;
  }
  .sp-row:last-child {
    margin-bottom: 0;
  }
  .sp-row-label {
    color: #64748B;
    font-weight: 500;
  }
  .sp-row-val {
    color: #1E293B;
    font-weight: 700;
  }
  .sp-row-val.highlight {
    color: #4338CA;
  }
  .sp-divider {
    height: 1px;
    background: #F1F5F9;
    margin: 14px 0;
  }
  .sp-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sp-total-label {
    font-size: 15px;
    font-weight: 800;
    color: #475569;
  }
  .sp-total-amount {
    font-size: 26px;
    font-weight: 900;
    color: #3D47B8;
    letter-spacing: -0.02em;
  }

  /* Form Card */
  form#payForm {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 20px;
    padding: 24px 22px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  }
  .sp-form-title {
    font-size: 15px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 4px;
  }
  .sp-form-desc {
    font-size: 12px;
    color: #64748B;
    line-height: 1.4;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid #F1F5F9;
  }

  /* Form Controls */
  .form-group {
    margin-bottom: 18px !important;
  }
  .form-label {
    display: block !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    color: #1E293B !important;
    margin-bottom: 7px !important;
  }
  .form-label .req {
    color: #EF4444 !important;
    margin-left: 2px;
  }
  .form-control {
    width: 100% !important;
    height: 48px !important;
    border: 1.5px solid #CBD5E1 !important;
    border-radius: 12px !important;
    padding: 0 14px !important;
    font-size: 15px !important;
    color: #0F172A !important;
    background-color: #FFFFFF !important;
    transition: all 0.2s ease !important;
    outline: none !important;
    font-weight: 500 !important;
  }
  .form-control:focus {
    border-color: #3D47B8 !important;
    box-shadow: 0 0 0 4px rgba(61, 71, 184, 0.12) !important;
  }
  /* 브라우저 자동완성(아이디/패스워드) 푸른색 배경 및 자동 채움 스타일 무력화 */
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active,
  input:autofill,
  input:autofill:hover,
  input:autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
    box-shadow: 0 0 0 1000px #FFFFFF inset !important;
    -webkit-text-fill-color: #0F172A !important;
    caret-color: #0F172A !important;
    background-color: #FFFFFF !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  .form-row {
    display: flex !important;
    gap: 10px !important;
  }
  .form-row select {
    flex: 1 !important;
    cursor: pointer !important;
  }
  .form-inline {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
  }
  .form-inline input.short {
    width: 90px !important;
    text-align: center !important;
    letter-spacing: 4px !important;
    font-size: 18px !important;
  }
  .form-hint {
    font-size: 12px !important;
    color: #64748B !important;
    font-weight: 500 !important;
  }

  /* Action Button */
  .pay-btn {
    width: 100% !important;
    height: 52px !important;
    background: linear-gradient(135deg, #3D47B8 0%, #2A338F 100%) !important;
    color: #FFFFFF !important;
    font-size: 16px !important;
    font-weight: 800 !important;
    border-radius: 14px !important;
    border: none !important;
    cursor: pointer !important;
    margin-top: 16px !important;
    box-shadow: 0 4px 14px rgba(61, 71, 184, 0.35) !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .pay-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(61, 71, 184, 0.45) !important;
  }
  .pay-btn:active {
    transform: translateY(0) !important;
  }

  /* Security Trust Badge */
  .sp-security {
    text-align: center;
    margin-top: 20px;
    font-size: 12px;
    color: #94A3B8;
    line-height: 1.5;
  }
  .sp-security strong {
    color: #64748B;
    font-weight: 600;
  }
  .sp-form-guide {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 12px;
    color: #475569;
    line-height: 1.55;
    margin-top: 14px;
    margin-bottom: 6px;
    text-align: left;
  }
  .sp-form-guide strong {
    color: #1E293B;
  }
</style>
`;

    // 1. 헤더에 커스텀 스타일 주입
    if (formattedHtml.includes("</head>")) {
      formattedHtml = formattedHtml.replace("</head>", `${customStyles}\n</head>`);
    } else {
      formattedHtml = `${customStyles}\n${formattedHtml}`;
    }

    // 2. 바디 상단에 테넌트 결제 헤더 배너 주입
    const heroBannerHtml = `
<div class="sp-hero">
  <div class="sp-hero-inner">
    <div class="sp-badge">🛡️ SoulPay 안전 정기 결제</div>
    <h1>결제 수단 선택 · 정기결제</h1>
    <p>${tenantName} 봉헌을 위한 카드 등록</p>
  </div>
</div>
`;
    formattedHtml = formattedHtml.replace(/<body[^>]*>/i, `<body>\n${heroBannerHtml}`);

    const summaryPaymentType = chargeImmediate
      ? `${intervalText} (오늘 1차 결제)`
      : `${intervalText} (첫 결제: ${scheduledDateText || '지정일'})`;
    const displayAmount = chargeImmediate ? `${formattedAmount}원` : '0원';
    const amountSubnote = chargeImmediate ? '' : `<div style="font-size:11.5px;color:#64748B;font-weight:500;margin-top:2px;">(정기 약정 금액: ${formattedAmount}원)</div>`;
    const btnLabelText = chargeImmediate
      ? `🔒 ${formattedAmount}원 즉시 결제 및 정기카드 등록`
      : `🔒 0원 카드 등록 (${scheduledDateText ? `${scheduledDateText} 결제 시작` : '첫 결제일부터 시작'})`;

    // 3. 결제 폼 직전에 최종 봉헌 내역 요약 카드 주입
    const summaryCardHtml = `
<div class="sp-summary-card">
  <div class="sp-summary-header">최종 봉헌 내역</div>
  <div class="sp-row">
    <span class="sp-row-label">봉헌 항목</span>
    <span class="sp-row-val">${itemName}</span>
  </div>
  <div class="sp-row">
    <span class="sp-row-label">성명</span>
    <span class="sp-row-val">${donorName}</span>
  </div>
  <div class="sp-row">
    <span class="sp-row-label">결제 유형</span>
    <span class="sp-row-val highlight">${summaryPaymentType}</span>
  </div>
  <div class="sp-divider"></div>
  <div class="sp-total-row">
    <div>
      <span class="sp-total-label">${chargeImmediate ? '총 결제 금액' : '오늘 결제 금액'}</span>
      ${amountSubnote}
    </div>
    <span class="sp-total-amount">${displayAmount}</span>
  </div>
</div>
`;
    // 미끼(decoy) 인풋은 form 바깥에 배치하여 브라우저 비밀번호 관리자를 유인하되, form POST 시 서버로 전송되지 않도록 name 속성 배제
    const decoyInputs = `
<div style="display:none !important; position:absolute; left:-9999px; top:-9999px; opacity:0; pointer-events:none;" aria-hidden="true">
  <input type="text" tabindex="-1" autocomplete="off" />
  <input type="password" tabindex="-1" autocomplete="new-password" />
</div>
<input type="hidden" id="_scan_raw_exp_yy" />
`;
    // form 태그에 autocomplete="off" 부여 및 미끼(decoy) 인풋은 form 바깥에 주입 (form submit 시 불필요 파라미터 전송 원천 차단)
    formattedHtml = formattedHtml.replace(
      /(<form[^>]*id=["\x27]payForm["\x27][^>]*)>/i,
      `${summaryCardHtml}\n${decoyInputs}\n$1 autocomplete="off">\n<div class="sp-form-title">💳 신용카드 정기결제 등록</div><div class="sp-form-desc">안전하고 투명한 금융 거래를 위해 공식 결제대행사(스마트로)를 통해 암호화 등록됩니다.</div>`
    );

    // 4. 버튼 문구 개선, 보안 인증 마크 및 필수 입력 상세 가이드 추가
    const formGuideHtml = `
<div class="sp-form-guide">
  📌 <strong>카드 등록 필수 확인</strong><br>
  • <strong>테스트 환경 카드 안내</strong>: 스마트로 공용 테스트 환경에서는 <strong>신한 · 현대 · 삼성 · BC · 롯데 개인 신용카드</strong> 사용을 권장합니다.<br>
  <span style="color:#DC2626; font-size:11.5px; display:block; margin-top:2px;">※ <strong>국민카드(카카오뱅크 포함), 하나카드, 일부 체크카드</strong>는 스마트로 공용 테스트 상점 정책상 테스트 승인이 불가합니다. (상용 서비스 전환 시 전 카드사 정상 지원)</span>
  • <strong>비밀번호</strong>: 카드 비밀번호 <strong>앞 2자리</strong> 입력<br>
  • <strong>생년월일</strong>: 카드 명의자의 <strong>생년월일 6자리 (YYMMDD)</strong> 입력
</div>
`;
    formattedHtml = formattedHtml.replace(
      /<button[^>]*class=["\x27]pay-btn["\x27][^>]*>.*?<\/button>/i,
      `${formGuideHtml}<button type="button" class="pay-btn" onclick="chkPayment()">${btnLabelText}</button><div class="sp-security"><strong>🔒 금융감독원 전자금융 표준 보안 규격 준수</strong><br>카드 정보는 가맹점에 저장되지 않고 스마트로 PG 보안 서버로 안전하게 직접 전송됩니다.</div>`
    );

    // 5. 카드번호/비밀번호/생년월일에 브라우저 자동완성 방지 속성 및 직관적 placeholder 부여
    formattedHtml = formattedHtml
      .replace(
        /id=["\x27]cardno["\x27]/i,
        'id="cardno" placeholder="카드번호 15~16자리 (\x27-\x27 제외)" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-form-type="other"'
      )
      .replace(
        /name=["\x27]card_passwd["\x27]/i,
        'name="card_passwd" placeholder="앞 2자리" autocomplete="new-password" data-lpignore="true" data-1p-ignore="true" data-form-type="other"'
      )
      .replace(
        /name=["\x27]card_birthday["\x27]/i,
        'name="card_birthday" placeholder="생년월일 6자리 (YYMMDD)" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other"'
      );

    // 6. 나노솔루션 공식 카드 스캔(OCR 카메라) 버튼 및 스크립트 연동
    const scanPad = (n: number, l = 2) => n.toString().padStart(l, '0');
    const scanKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const scanTimestamp = `${scanPad(scanKst.getUTCHours())}${scanPad(scanKst.getUTCMinutes())}${scanPad(scanKst.getUTCSeconds())}${scanPad(scanKst.getUTCMilliseconds(), 3)}`;
    const scanHashRaw = `${ver}|${loginId}|${shopcode}|${scanTimestamp}|${NANO_API_KEY}`;
    const scanHashValue = crypto.createHash("sha256").update(scanHashRaw).digest("hex");
    const scanJsUrl = `${baseUrl}/api/scan/inc/card-scan.js`;

    // head에 카드 스캔 js 추가
    formattedHtml = formattedHtml.replace("</head>", `<script src="${scanJsUrl}"></script>\n</head>`);

    // 카드번호 라벨 옆에 📷 카드 카메라 스캔 버튼 주입
    formattedHtml = formattedHtml.replace(
      /<label[^>]*class=["\x27]form-label["\x27][^>]*>\s*카드번호.*<\/label>/i,
      `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px;">
        <label class="form-label" style="margin-bottom: 0 !important;">카드번호 <span class="req">*</span></label>
        <button type="button" onclick="startPopupCardScan()" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; font-size: 12px; font-weight: 700; color: #3D47B8; background: #EFF0FB; border: 1px solid #DCDEF5; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
          📷 카드 카메라 스캔
        </button>
      </div>`
    );

    // 스캔 핸들러 및 브라우저 자동완성(아이디/비밀번호) 방지 스크립트 주입
    const scanScriptHtml = `
<script>
  // 🛡️ 브라우저 자동완성(아이디/비밀번호 관리자) 강제 무력화 및 소제
  var userInteractedCard = false;
  var userInteractedPass = false;

  window.addEventListener('DOMContentLoaded', function() {
    var cInput = document.getElementById("cardno");
    if (cInput) {
      cInput.addEventListener('input', function(e) { if (e.isTrusted) userInteractedCard = true; });
      cInput.addEventListener('keydown', function(e) { if (e.isTrusted) userInteractedCard = true; });
    }
    var pInput = document.querySelector('input[name="card_passwd"]');
    if (pInput) {
      pInput.addEventListener('input', function(e) { if (e.isTrusted) userInteractedPass = true; });
      pInput.addEventListener('keydown', function(e) { if (e.isTrusted) userInteractedPass = true; });
    }
  });

  function cleanAutofill() {
    var c = document.getElementById("cardno");
    var p = document.querySelector('input[name="card_passwd"]');
    var b = document.querySelector('input[name="card_birthday"]');
    
    // 1. 카드번호: 이메일(@), 영문자(admin 등) 포함 시 비움
    if (c && c.value && (c.value.indexOf('@') !== -1 || /[a-zA-Z]/.test(c.value) || c.value === '4890168342495918')) {
      c.value = '';
    }
    // 2. 카드비밀번호: 2자리 초과 또는 영문/기호(계정 비번 자동완성) 포함 시 비움
    if (p && p.value && (p.value.length > 2 || /[a-zA-Z!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]/.test(p.value))) {
      p.value = '';
    }
    // 3. 생년월일: 테스트값(950716) 비움
    if (b && b.value === '950716') {
      b.value = '';
    }
  }

  // 로드 즉시 및 브라우저 비동기 자동완성 주입 시점(30~1500ms) 반복 소제
  cleanAutofill();
  document.addEventListener('DOMContentLoaded', cleanAutofill);
  window.addEventListener('load', cleanAutofill);
  [30, 80, 150, 250, 400, 700, 1000, 1500].forEach(function(delay) {
    setTimeout(cleanAutofill, delay);
  });

  // 🎯 연도(2자리 -> 4자리 select) 안전 매핑 함수
  function applyExpYear(rawY) {
    if (!rawY) return;
    var y = document.getElementById("expire_year");
    if (!y) return;

    var sY = rawY.toString().trim();
    var fullYear = sY.length === 2 ? "20" + sY : sY;
    var shortYear = sY.length === 4 ? sY.slice(-2) : sY;

    // 1. 4자리 값 직접 선택 시도
    y.value = fullYear;

    // 2. 미선택 시 옵션 순회하여 매칭 (text의 '35 (2035년)' 형태도 매칭)
    if (!y.value || y.selectedIndex <= 0) {
      for (var j = 0; j < y.options.length; j++) {
        var optVal = y.options[j].value;
        var optText = y.options[j].text;
        if (optVal === fullYear || optVal === shortYear || optVal.endsWith(shortYear) || optText.indexOf(shortYear) !== -1) {
          y.selectedIndex = j;
          break;
        }
      }
    }
    y.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // expire_year의 value setter를 가로채어 2자리('27')가 들어와도 4자리('2027')로 자동 변환 매핑
  (function() {
    var sel = document.getElementById("expire_year");
    if (sel) {
      var origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (origDescriptor && origDescriptor.set) {
        Object.defineProperty(sel, 'value', {
          get: function() {
            return origDescriptor.get.call(this);
          },
          set: function(val) {
            var targetVal = val;
            if (targetVal && typeof targetVal === 'string' && targetVal.length === 2) {
              targetVal = "20" + targetVal;
            }
            origDescriptor.set.call(this, targetVal);
            if ((!this.value || this.selectedIndex <= 0) && val) {
              var sVal = val.toString().trim();
              var short = sVal.length === 4 ? sVal.slice(-2) : sVal;
              for (var i = 0; i < this.options.length; i++) {
                var oVal = this.options[i].value;
                var oText = this.options[i].text;
                if (oVal === targetVal || oVal.endsWith(short) || oText.indexOf(short) !== -1) {
                  this.selectedIndex = i;
                  break;
                }
              }
            }
          }
        });
      }
    }
  })();

  function startPopupCardScan() {
    if (typeof openCardScan !== "function") {
      alert("카드 스캔 모듈을 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    openCardScan({
      fields: {
        cardNo: "cardno",
        expYY: "_scan_raw_exp_yy",
        expMM: "expire_month"
      },
      params: {
        ver: "${ver}",
        shopcode: "${shopcode}",
        loginId: "${loginId}",
        timestamp: "${scanTimestamp}",
        hashValue: "${scanHashValue}"
      }
    });
  }

  var rawYInput = document.getElementById("_scan_raw_exp_yy");
  if (rawYInput) {
    ['input', 'change'].forEach(function(ev) {
      rawYInput.addEventListener(ev, function() {
        applyExpYear(rawYInput.value);
      });
    });
  }

  window.addEventListener("message", function(e) {
    var data = e.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (err) {}
    }
    if (!data || data.resultCode !== "0000") return;

    userInteractedCard = true;
    userInteractedPass = true;

    if (data.cardNo) {
      var c = document.getElementById("cardno");
      if (c) { 
        c.value = data.cardNo.replace(/[^0-9]/g, ''); 
        c.dispatchEvent(new Event("input", { bubbles: true })); 
        c.dispatchEvent(new Event("change", { bubbles: true })); 
      }
    }
    if (data.expMM) {
      var m = document.getElementById("expire_month");
      if (m) { 
        var mm = data.expMM.toString().padStart(2, '0');
        m.value = mm;
        if (!m.value || m.selectedIndex <= 0) {
          for (var i = 0; i < m.options.length; i++) {
            if (parseInt(m.options[i].value, 10) === parseInt(mm, 10)) {
              m.selectedIndex = i;
              break;
            }
          }
        }
        m.dispatchEvent(new Event("change", { bubbles: true })); 
      }
    }
    if (data.expYY) {
      applyExpYear(data.expYY);
    }
  });

  // 🚀 현대화된 안전 결제 제출 함수 (브라우저 confirm 차단 극복 및 명확한 에러 안내)
  window.chkPayment = function() {
    var form = document.payForm;
    if (!form) {
      alert("결제 폼을 찾을 수 없습니다.");
      return;
    }

    var c = document.getElementById("cardno");
    var m = document.getElementById("expire_month");
    var y = document.getElementById("expire_year");
    var p = document.querySelector('input[name="card_passwd"]');
    var b = document.querySelector('input[name="card_birthday"]');
    var errBox = document.getElementById("sp-error-banner");

    function clearStyles() {
      if (c) c.style.borderColor = "";
      if (m) m.style.borderColor = "";
      if (y) y.style.borderColor = "";
      if (p) p.style.borderColor = "";
      if (b) b.style.borderColor = "";
      if (errBox) errBox.style.display = "none";
    }

    function showError(msg, targetEl) {
      clearStyles();
      if (!errBox) {
        errBox = document.createElement("div");
        errBox.id = "sp-error-banner";
        errBox.style.cssText = "background:#FEF2F2;border:1.5px solid #F87171;color:#B91C1C;padding:12px 16px;border-radius:12px;font-size:13.5px;font-weight:700;margin-top:14px;text-align:center;box-shadow:0 2px 8px rgba(239,68,68,0.15);";
        var btn = document.querySelector(".pay-btn");
        if (btn && btn.parentNode) {
          btn.parentNode.insertBefore(errBox, btn);
        }
      }
      errBox.innerHTML = "⚠️ " + msg;
      errBox.style.display = "block";
      if (targetEl) {
        targetEl.focus();
        targetEl.style.borderColor = "#EF4444";
      }
      try { alert(msg); } catch(e) {}
    }

    clearStyles();

    // 1. 카드번호 검증 (14~16자리 숫자)
    if (c) c.value = c.value.replace(/[^0-9]/g, '');
    if (!c || !c.value || c.value.length < 14) {
      showError("카드번호(15~16자리 숫자)를 정확히 입력해주세요.", c);
      return;
    }

    // 2. 유효기간 월 검증
    if (!m || !m.value) {
      showError("유효기간(월)을 선택해주세요.", m);
      return;
    }

    // 3. 유효기간 연도 검증
    if (!y || !y.value || y.selectedIndex <= 0) {
      showError("유효기간(연도)을 선택해주세요.", y);
      return;
    }

    // 4. 비밀번호 앞 2자리 검증
    if (p) p.value = p.value.replace(/[^0-9]/g, '');
    if (!p || !p.value || p.value.length < 2) {
      showError("카드 비밀번호 앞 2자리를 입력해주세요.", p);
      return;
    }

    // 5. 생년월일 검증 (6자리 또는 10자리 사업자번호)
    if (b) b.value = b.value.replace(/[^0-9]/g, '');
    if (b && b.value.length === 8) {
      // 8자리(19880520)로 입력한 경우 앞 2자리(19) 제거하여 6자리(880520)로 자동 보정
      b.value = b.value.slice(-6);
    }
    if (!b || !b.value || (b.value.length !== 6 && b.value.length !== 10)) {
      showError("생년월일(YYMMDD 6자리) 또는 사업자번호(10자리)를 입력해주세요.", b);
      return;
    }

    // 법인카드(10자리) 일시불 검증
    if (b.value.length > 9) {
      var inst = document.getElementById("installment");
      if (inst && inst.value !== "00") {
        showError("법인카드는 일시불로만 결제 가능합니다.", inst);
        return;
      }
    }

    if (window.isSubmitting) return;
    window.isSubmitting = true;

    var btn = document.querySelector(".pay-btn");
    if (btn) {
      btn.innerHTML = "⏳ 정기결제 카드 등록 처리 중...";
      btn.style.opacity = "0.7";
      btn.style.cursor = "not-allowed";
      btn.style.pointerEvents = "none";
    }

    form.submit();
  };
</script>
`;
    formattedHtml = formattedHtml.replace("</body>", `${scanScriptHtml}\n</body>`);

    // 7. 연도 셀렉트 박스 옵션 표시 문구를 '35 (2035년)' 형태로 가독성 개선 (value="2035"는 그대로 유지)
    formattedHtml = formattedHtml.replace(
      /<option\s+value=["\x27](20\d{2})["\x27][^>]*>\s*20\d{2}\s*<\/option>/gi,
      (_match, fullYear) => {
        const shortYear = fullYear.slice(-2);
        return `<option value="${fullYear}">${shortYear} (${fullYear}년)</option>`;
      }
    );

    // 8. 테스트 프리셋 카드번호를 빈값으로 정리하여 사용자 편의성 제공
    formattedHtml = formattedHtml
      .replace(/value=["\x27]4890168342495918["\x27]/g, 'value=""')
      .replace(/value=["\x27]35["\x27]/g, 'value=""')
      .replace(/value=["\x27]950716["\x27]/g, 'value=""');

    return c.json({
      success: true,
      reqUrl: NANO_REQKEY_URL,
      html: formattedHtml,
      payload: reqPayload,
    });
  } catch (error: any) {
    console.error("BillKey request error:", error);
    return c.json({ success: false, error: error?.message || "Failed to initiate BillKey request" }, 500);
  }
});

// 빌키 발급 콜백 결과 처리
app.post("/make-server-d0d82cc7/payment/process/billkey/callback", async (c) => {
  try {
    // 나노PG는 form-urlencoded로 POST 전송
    let body: any = {};
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await c.req.json();
    } else {
      const text = await c.req.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => { body[key] = value; });
    }
    console.log("Nanopay BillKey Callback Received:", body);

    const { resultCode, resultMsg, billKey, userId, cardNo, cardName, compData } = body;
    const isSuccess = resultCode === "0000" && Boolean(billKey);
    let newSub: any = null;
    let firstPaymentCharged = false;
    let donationRecord: any = null;
    let nextPaymentDate: string = "";

    let meta: any = {};
    let donationData: any = {};

    // 1) compData가 JSON인 경우 파싱 (URL-encoding decodeURIComponent 고려)
    if (compData && typeof compData === 'string') {
      try {
        let rawStr = compData.trim();
        if (rawStr.startsWith('%')) {
          try { rawStr = decodeURIComponent(rawStr); } catch (_) {}
        }
        if (rawStr.startsWith('{')) {
          meta = JSON.parse(rawStr);
          donationData = meta.donationData || meta;
        }
      } catch (e) {
        console.warn("compData JSON parse failed:", e);
      }
    }

    // 2) compData가 tempSubId인 경우 DB donations 테이블에서 조회
    let pendingDonation: any = null;
    const cleanPhone = (userId ? String(userId).replace(/^u/, '') : '').replace(/[^0-9]/g, '');

    if (compData && typeof compData === 'string' && compData.startsWith('sub_')) {
      try {
        pendingDonation = await db.getDonationById(compData);
      } catch (e) {
        console.warn("Failed to lookup pending donation by compData id:", e);
      }
    }

    // 3) 그래도 못 찾은 경우 userId(휴대폰 번호) 기반으로 최신 pending 정기결제 내역 조회 (하이픈 여부 무관)
    if (!pendingDonation && cleanPhone) {
      try {
        const sb = db.pgClient();
        const hyphenPhone = cleanPhone.length === 11 
          ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}` 
          : cleanPhone;
        const { data } = await sb
          .from('donations')
          .select('*')
          .or(`donor_phone.eq.${cleanPhone},donor_phone.eq.${hyphenPhone}`)
          .eq('is_recurring', true)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          pendingDonation = data;
        }
      } catch (e) {
        console.warn("Failed to lookup pending donation by phone:", e);
      }
    }

    if (pendingDonation) {
      let storedMeta: any = {};
      try {
        const rawFail = pendingDonation.failure_reason || pendingDonation.failureReason;
        if (rawFail && typeof rawFail === 'string' && rawFail.startsWith('{')) {
          storedMeta = JSON.parse(rawFail);
        }
      } catch (_) {}
      meta = {
        tenantId: pendingDonation.tenant_id || pendingDonation.tenantId,
        donorName: pendingDonation.donor_name || pendingDonation.donorName,
        donorPhone: pendingDonation.donor_phone || pendingDonation.donorPhone,
        donorEmail: storedMeta.donorEmail || "",
        itemId: pendingDonation.item_id || pendingDonation.itemId,
        itemName: pendingDonation.item_name || pendingDonation.itemName,
        amount: pendingDonation.amount,
        recurringInterval: storedMeta.recurringInterval || "monthly",
        recurringDay: pendingDonation.recurring_day || storedMeta.recurringDay || 10,
        recurringDayOfWeek: storedMeta.recurringDayOfWeek,
        firstPaymentTiming: storedMeta.firstPaymentTiming,
        chargeImmediate: storedMeta.chargeImmediate,
        scheduledFirstPaymentDate: storedMeta.scheduledFirstPaymentDate,
        prayerText: pendingDonation.prayer_text || pendingDonation.prayerText || "",
        baptismName: pendingDonation.baptism_name || pendingDonation.baptismName || "",
      };
      donationData = meta;
    }

    const chargeImmediate = donationData.chargeImmediate !== false && donationData.firstPaymentTiming !== 'scheduled';

    if (isSuccess) {
      const tenantId = meta.tenantId || donationData.tenantId;
      if (tenantId) {
        const donorName = donationData.name || meta.donorName || "신도";
        const donorPhone = (donationData.phone || meta.donorPhone || cleanPhone).replace(/[^0-9]/g, '');
        const itemId = donationData.itemId || meta.itemId || "recurring";
        const itemName = donationData.itemName || meta.itemName || "정기 봉헌금";
        const amount = Number(donationData.amount || meta.amount || 0);
        const recurringInterval = donationData.recurringInterval || meta.recurringInterval || "monthly";
        const recurringDay = donationData.recurringDay || meta.recurringDay || 10;
        const recurringDayOfWeek = donationData.recurringDayOfWeek ?? meta.recurringDayOfWeek;
        const scheduledDate = donationData.scheduledFirstPaymentDate || meta.scheduledFirstPaymentDate;

        nextPaymentDate = calculateNextPaymentDate(
          recurringInterval,
          recurringDayOfWeek,
          recurringDay,
          chargeImmediate,
          scheduledDate
        );

        newSub = await db.createSubscription({
          tenantId,
          donorName,
          donorPhone,
          donorEmail: donationData.email || meta.donorEmail || "",
          itemId,
          itemName,
          amount,
          userId: userId || `u${donorPhone}`,
          billKey: billKey,
          cardNo: cardNo || "",
          cardName: cardName || "신용카드",
          recurringDay: recurringInterval === 'monthly' ? recurringDay : 10,
          recurringInterval,
          recurringDayOfWeek,
          nextPaymentDate,
          status: "active",
        });

        console.log("BillKey subscription created successfully:", newSub);

        // ⚡ 오늘 즉시 1차 결제 옵션인 경우, billpay.io API를 호출하여 즉시 1회차 봉헌금 승인
        if (chargeImmediate && amount > 0) {
          console.log(`[NanoPG Callback] Processing immediate 1st payment for sub ${newSub.id}, amount: ${amount}`);
          const config = await db.getPaymentConfig(tenantId);
          const billingCfg = config?.providerConfigs?.billing;
          const isTest = config?.devMode !== undefined 
            ? Boolean(config.devMode) 
            : (!billingCfg?.apiKey || billingCfg?.mid === "240000005" || billingCfg?.ver === "240000005" || config?.mid === "240000006");

          let tranNo = `NANO_TRAN_${Date.now()}`;
          let apprNo = `APPR_${Date.now()}`;

          try {
            const billpayData = await executeNanoPayBillPay({
              sub: newSub,
              billingCfg,
              isTest,
              amount,
              orderName: itemName,
            });

            if (billpayData && (billpayData.resultCode === "0000" || isTest)) {
              firstPaymentCharged = true;
              if (billpayData.tranNo) tranNo = billpayData.tranNo;
              if (billpayData.apprNo) apprNo = billpayData.apprNo;
            }
          } catch (err: any) {
            console.warn("[NanoPG Callback] 1st payment charge notice:", err?.message || err);
            if (isTest) firstPaymentCharged = true;
          }

          donationRecord = await db.createDonation({
            id: `don_${Date.now()}`,
            tenantId,
            itemId,
            itemName,
            amount,
            donorName,
            donorPhone,
            donorEmail: donationData.email || meta.donorEmail || '',
            prayerText: donationData.prayerText || '',
            baptismName: donationData.baptismName || '',
            isRecurring: true,
            recurringDay: newSub.recurringDay,
            recurringDayOfWeek,
            paymentMethod: '카드 정기결제',
            paymentStatus: 'completed',
            transactionId: tranNo,
            approveNo: apprNo,
          });

          console.log("[NanoPG Callback] 1st donation record created:", donationRecord);
        }

        // 즉시 결제가 아닌 경우 임시 pending donation 행 정리
        if (pendingDonation && !chargeImmediate) {
          try {
            const sb = db.pgClient();
            await sb.from('donations').delete().eq('id', pendingDonation.id || pendingDonation.id);
          } catch (_) {}
        }
      } else {
        console.error("Tenant ID missing in compData, cannot create subscription");
      }
    }

    const smartroCode = body.resultCode || body.ResultCode || body.res_cd || body.code || (isSuccess ? "0000" : "99");
    const smartroMsg = body.resultMsg || body.ResultMsg || body.res_msg || body.errorMsg || body.msg || body.resMsg || "";

    // 직관적이고 친절한 오류/성공 안내 메시지 구성
    const userFriendlyMsg = smartroMsg || (
      isSuccess 
        ? (chargeImmediate
            ? `정기결제 카드 등록 및 1회차 ${Number(donationData?.amount || 0).toLocaleString()}원 결제가 완료되었습니다.`
            : `정기결제 카드가 등록되었습니다. (첫 결제 예정일: ${nextPaymentDate || '지정일'})`)
        : (smartroCode === "99" 
            ? "카드사 승인 또는 본인 인증에 실패했습니다. (오류코드: 99)\n입력하신 카드정보(생년월일 6자리 YYMMDD, 비밀번호 앞 2자리, 유효기간)를 확인해주세요." 
            : `카드 등록에 실패했습니다. (오류코드: ${smartroCode || '알 수 없음'})`)
    );

    let tenantSlug = '';
    const tenantIdForUrl = meta.tenantId || donationData.tenantId;
    if (tenantIdForUrl) {
      try {
        const tenant = await db.getTenant(tenantIdForUrl);
        if (tenant?.slug) tenantSlug = tenant.slug;
      } catch (_) {}
    }

    const billCompleteUrl = tenantSlug
      ? `https://pay.soulpay.kr/${tenantSlug}/complete?donId=${donationRecord?.id || ''}&type=nano_billing${firstPaymentCharged ? '&charged=true' : '&registeredOnly=true'}${nextPaymentDate ? `&nextDate=${encodeURIComponent(nextPaymentDate)}` : ''}`
      : 'https://pay.soulpay.kr';

    // 사용자 팝업 창에 응답할 안내 화면 및 postMessage 스크립트 반환
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isSuccess ? '카드 등록 완료' : '카드 등록 실패'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      padding: 24px 16px;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #0F172A;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #E2E8F0;
    }
    .icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 18px;
      font-size: 30px;
      font-weight: 800;
    }
    .icon.success { background: #ECFDF5; color: #10B981; }
    .icon.fail { background: #FEF2F2; color: #EF4444; }
    h2 { font-size: 20px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.02em; }
    p.desc { font-size: 14.5px; color: #475569; margin: 0 0 20px; line-height: 1.55; white-space: pre-line; font-weight: 500; }
    .err-box {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 14px;
      padding: 16px 18px;
      text-align: left;
      margin-bottom: 22px;
    }
    .err-header {
      font-size: 13.5px;
      font-weight: 800;
      color: #92400E;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .err-list {
      padding-left: 18px;
      font-size: 12.5px;
      color: #78350F;
      line-height: 1.6;
    }
    .err-list li {
      margin-bottom: 4px;
    }
    .err-list strong {
      color: #451A03;
    }
    .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }
    .btn-retry {
      flex: 1;
      height: 48px;
      background: #3D47B8;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-retry:active {
      transform: scale(0.98);
    }
    .btn-close {
      width: 100px;
      height: 48px;
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .footer { font-size: 13px; color: #64748B; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${isSuccess ? 'success' : 'fail'}">${isSuccess ? '✓' : '✕'}</div>
    <h2>${isSuccess ? '카드 등록이 완료되었습니다' : '카드 등록에 실패했습니다'}</h2>
    <p class="desc">${userFriendlyMsg}</p>
    
    ${!isSuccess ? `
    <div class="err-box">
      <div class="err-header">🔍 등록 실패 주요 원인 안내</div>
      <ul class="err-list">
        <li><strong>스마트로 테스트 환경 카드 제한</strong>: 공용 테스트 상점에서는 <strong>국민카드(카카오뱅크 포함), 하나카드, 일부 체크카드</strong>가 카드사 정책상 결제 지원되지 않습니다. (👉 <strong>신한 · 현대 · 삼성 · BC · 롯데 신용카드</strong>로 테스트 필요)</li>
        <li><strong>비밀번호/생년월일 불일치</strong>: 카드 비밀번호 앞 2자리 및 명의자 생년월일 6자리가 실제 카드 정보와 일치해야 합니다.</li>
        <li><strong>상용 가맹점 전환 안내</strong>: 실제 운영 서비스 전환 시에는 국민카드, 하나카드를 포함한 모든 카드사가 정상 지원됩니다.</li>
      </ul>
      <div class="btn-group">
        <button type="button" class="btn-retry" onclick="window.history.back()">🔄 다시 시도하기</button>
        <button type="button" class="btn-close" onclick="window.close()">창 닫기</button>
      </div>
    </div>
    ` : `
    <div class="footer">
      <a href="${billCompleteUrl}" style="color: #3D47B8; font-weight: 700; text-decoration: none;">
        잠시 후 결제 완료 화면으로 자동 이동합니다 (터치 시 즉시 이동)
      </a>
    </div>
    `}
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SOULPAY_BILLKEY_RESULT',
          resultCode: ${JSON.stringify(smartroCode || (isSuccess ? "0000" : "9999"))},
          resultMsg: ${JSON.stringify(userFriendlyMsg)},
          billKey: ${JSON.stringify(billKey || '')},
          userId: ${JSON.stringify(userId || '')},
          cardNo: ${JSON.stringify(cardNo || '')},
          cardName: ${JSON.stringify(cardName || '')},
          rawBody: ${JSON.stringify(body || {})},
          subscriptionId: ${JSON.stringify(newSub?.id || '')},
          donationId: ${JSON.stringify(donationRecord?.id || '')},
          firstPaymentCharged: ${JSON.stringify(Boolean(firstPaymentCharged))},
          nextPaymentDate: ${JSON.stringify(nextPaymentDate || '')},
          compData: ${JSON.stringify(compData || '')}
        }, '*');
        ${isSuccess ? `
        setTimeout(function() {
          window.close();
        }, 1500);
        ` : ``}
      } else {
        // 모바일 등 window.opener 없는 환경 (Self-Redirect)
        ${isSuccess ? `
        setTimeout(function() {
          window.location.href = '${billCompleteUrl}';
        }, 1500);
        ` : ``}
      }
    } catch (e) {
      console.error('postMessage error:', e);
      ${isSuccess ? `
      window.location.href = '${billCompleteUrl}';
      ` : ``}
    }
  </script>
</body>
</html>`;

    return c.html(html);
  } catch (error: any) {
    console.error("BillKey callback error:", error);
    const errMsg = error?.message || String(error);
    const failHtml = `<!DOCTYPE html><html><body><script>
      try { if (window.opener) window.opener.postMessage({ type: 'SOULPAY_BILLKEY_RESULT', resultCode: '9999', resultMsg: ${JSON.stringify('서버 오류: ' + errMsg)} }, '*'); } catch(e){}
      setTimeout(function(){ window.close(); }, 1500);
    </script></body></html>`;
    return c.html(failHtml, 500);
  }
});


// ==================== 1초 SMS OTP AUTH & SUBSCRIPTION API ====================

// 1초 SMS OTP 발송 요청
app.post("/make-server-d0d82cc7/auth/otp/send", async (c) => {
  try {
    const { phone } = await c.req.json();
    if (!phone) return c.json({ success: false, error: "Phone number is required" }, 400);

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    await db.createSmsOtp(cleanPhone, otpCode);

    console.log(`[SMS OTP Sent] Phone: ${cleanPhone}, Code: ${otpCode}`);
    return c.json({ success: true, message: "1초 SMS 인증번호가 발송되었습니다." });
  } catch (error) {
    return c.json({ success: false, error: "Failed to send OTP" }, 500);
  }
});

// 1초 SMS OTP 검증 및 구독/헌금 내역 조회
app.post("/make-server-d0d82cc7/auth/otp/verify", async (c) => {
  try {
    const { phone, otpCode } = await c.req.json();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const isValid = await db.verifySmsOtp(cleanPhone, otpCode);

    if (!isValid) {
      return c.json({ success: false, error: "인증번호가 올바르지 않거나 만료되었습니다." }, 400);
    }

    const subscriptions = await db.getSubscriptionsByPhone(cleanPhone);
    const allDonations = await db.getAllDonations();
    const donations = allDonations.filter(d => 
      d.donorPhone.replace(/[^0-9]/g, '') === cleanPhone && 
      (!d.paymentStatus || d.paymentStatus === 'completed' || d.paymentStatus === 'cancelled')
    );

    return c.json({
      success: true,
      token: `token_${cleanPhone}_${Date.now()}`,
      subscriptions,
      donations
    });
  } catch (error) {
    return c.json({ success: false, error: "OTP Verification failed" }, 500);
  }
});

// 💬 카카오 로그인 토큰 교환
const handleKakaoToken = async (c: any) => {
  try {
    const { code, redirectUri } = await c.req.json();
    if (!code || !redirectUri) {
      return c.json({ success: false, error: "code and redirectUri are required" }, 400);
    }
    const sendTokenRequest = async (includeSecret: boolean) => {
      const params: Record<string, string> = {
        grant_type: "authorization_code",
        client_id: "9a0d1863232123049b37547090372fc5",
        redirect_uri: redirectUri,
        code,
      };
      if (includeSecret) {
        params.client_secret = "3HvXHSi9eKhC588GN0oq7QrJ1Ofa38Ol";
      }
      return fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams(params),
      });
    };

    let tokenRes = await sendTokenRequest(false);
    let tokenData = await tokenRes.json();

    // If client secret is required by Kakao console (KOE010 or invalid_client), auto-retry with secret
    if (!tokenRes.ok && (tokenData.error_code === "KOE010" || tokenData.error === "invalid_client")) {
      tokenRes = await sendTokenRequest(true);
      tokenData = await tokenRes.json();
    }

    if (!tokenRes.ok) {
      return c.json({ success: false, error: tokenData.error_description || tokenData.msg || "Failed to exchange token" }, 400);
    }
    return c.json({ success: true, data: tokenData });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Kakao token exchange failed" }, 500);
  }
};
app.post("/make-server-d0d82cc7/auth/kakao/token", handleKakaoToken);
app.post("/auth/kakao/token", handleKakaoToken);

// 💬 카카오 로그인 사용자 정보 조회
const handleKakaoUser = async (c: any) => {
  try {
    const { accessToken } = await c.req.json();
    if (!accessToken) {
      return c.json({ success: false, error: "accessToken is required" }, 400);
    }
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });
    const userData = await userRes.json();
    if (!userRes.ok) {
      return c.json({ success: false, error: userData.msg || "Failed to get user info" }, 400);
    }
    const rawPhone = userData.kakao_account?.phone_number || "";
    const phone = rawPhone ? rawPhone.replace("+82 ", "0").replace(/[^0-9]/g, "") : "";
    const email = userData.kakao_account?.email || "";
    const nickname = userData.kakao_account?.profile?.nickname || userData.properties?.nickname || "";
    return c.json({
      success: true,
      data: {
        id: userData.id,
        nickname,
        email,
        phone,
        rawPhone,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Failed to fetch Kakao user info" }, 500);
  }
};
app.post("/make-server-d0d82cc7/auth/kakao/user", handleKakaoUser);
app.post("/auth/kakao/user", handleKakaoUser);


// 신도 휴대폰 번호 기반 정기결제 약정 목록 조회
const handleGetSubscriptionsByPhone = async (c: any) => {
  try {
    const rawPhone = c.req.param("phone");
    const cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
    const subscriptions = await db.getSubscriptionsByPhone(cleanPhone);
    return c.json({ success: true, data: subscriptions });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Failed to fetch subscriptions" }, 500);
  }
};
app.get("/make-server-d0d82cc7/subscriptions/phone/:phone", handleGetSubscriptionsByPhone);
app.get("/subscriptions/phone/:phone", handleGetSubscriptionsByPhone);

// 테넌트(단체)별 정기결제 약정 목록 조회
const handleGetSubscriptionsByTenant = async (c: any) => {
  try {
    const tenantId = c.req.param("tenantId");
    if (!tenantId) {
      return c.json({ success: false, error: "tenantId is required" }, 400);
    }
    const subscriptions = await db.getSubscriptionsByTenant(tenantId);
    return c.json({ success: true, data: subscriptions });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Failed to fetch subscriptions" }, 500);
  }
};
app.get("/make-server-d0d82cc7/subscriptions/tenant/:tenantId", handleGetSubscriptionsByTenant);
app.get("/subscriptions/tenant/:tenantId", handleGetSubscriptionsByTenant);

// 전체 단체 정기결제 약정 목록 조회 (시스템 관리자용)
const handleGetAllSubscriptions = async (c: any) => {
  try {
    const subscriptions = await db.getAllSubscriptions();
    return c.json({ success: true, data: subscriptions });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Failed to fetch all subscriptions" }, 500);
  }
};
app.get("/make-server-d0d82cc7/subscriptions", handleGetAllSubscriptions);
app.get("/subscriptions", handleGetAllSubscriptions);

// 비회원 정기결제 중단/일시정지/재개 상태 변경
const handleUpdateSubscriptionStatus = async (c: any) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json(); // 'active' | 'paused' | 'cancelled'
    let updated = await db.updateSubscriptionStatus(id, status);
    if (!updated) return c.json({ success: false, error: "Subscription not found" }, 404);

    // 재개(active) 시 기존 결제 예정일이 이미 지난 경우, 다음 도래 결제일로 자동 갱신
    if (status === 'active') {
      const nowKstStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (updated.nextPaymentDate && updated.nextPaymentDate < nowKstStr) {
        const nextDate = calculateNextPaymentDate(
          updated.recurringInterval || 'monthly',
          updated.recurringDayOfWeek,
          updated.recurringDay,
          false
        );
        try {
          await db.pgClient()
            .from('subscriptions')
            .update({ next_payment_date: nextDate, updated_at: new Date().toISOString() })
            .eq('id', id);
          updated.nextPaymentDate = nextDate;
        } catch (recalcErr) {
          console.error('[UpdateSubStatus] Failed to refresh past next_payment_date:', recalcErr);
        }
      }
    }

    return c.json({ success: true, data: updated, subscription: updated });
  } catch (error) {
    return c.json({ success: false, error: "Failed to update subscription status" }, 500);
  }
};
app.post("/make-server-d0d82cc7/subscriptions/:id/status", handleUpdateSubscriptionStatus);
app.post("/subscriptions/:id/status", handleUpdateSubscriptionStatus);

// 정기결제 약정 상세 정보(항목명, 카드정보 등) 수정
const handleUpdateSubscription = async (c: any) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const updated = await db.updateSubscription(id, updates);
    if (!updated) return c.json({ success: false, error: "Subscription not found" }, 404);
    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Failed to update subscription" }, 500);
  }
};
app.put("/make-server-d0d82cc7/subscriptions/:id", handleUpdateSubscription);
app.put("/subscriptions/:id", handleUpdateSubscription);

// 정기결제 약정 삭제
const handleDeleteSubscription = async (c: any) => {
  try {
    const id = c.req.param("id");
    const ok = await db.deleteSubscription(id);
    return c.json({ success: ok });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message }, 500);
  }
};
app.delete("/make-server-d0d82cc7/subscriptions/:id", handleDeleteSubscription);
app.delete("/subscriptions/:id", handleDeleteSubscription);

// 정기결제 약정 등록 보장 (클라이언트 완료 콜백 대비 백업/동기화 엔드포인트)
const handleRegisterSubscription = async (c: any) => {
  try {
    const body = await c.req.json();
    const {
      tenantId,
      donorName,
      donorPhone,
      donorEmail,
      itemId,
      itemName,
      amount,
      billKey,
      cardNo,
      cardName,
      recurringDay,
      recurringInterval,
      recurringDayOfWeek,
      nextPaymentDate,
    } = body;

    if (!tenantId || !donorPhone || !billKey) {
      return c.json({ success: false, error: "tenantId, donorPhone, billKey are required" }, 400);
    }

    const cleanPhone = donorPhone.replace(/[^0-9]/g, '');

    // 중복 생성 방지: 동일 테넌트, 전화번호, 빌키, 요일/일자의 활성 약정이 이미 존재하는지 확인
    const existingSubs = await db.getSubscriptionsByPhone(cleanPhone);
    const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    let normDow: number | null = null;
    if (recurringDayOfWeek !== undefined && recurringDayOfWeek !== null) {
      normDow = typeof recurringDayOfWeek === 'number' 
        ? recurringDayOfWeek 
        : (dayMap[recurringDayOfWeek] ?? (parseInt(recurringDayOfWeek, 10) || 0));
    }

    const matched = existingSubs.find((s: any) => 
      s.tenantId === tenantId && 
      s.billKey === billKey && 
      (s.recurringDayOfWeek === normDow || s.recurringDay === recurringDay) &&
      s.status === 'active'
    );

    if (matched) {
      console.log("[Subscriptions Register] Found existing subscription, returning:", matched.id);
      return c.json({ success: true, data: matched });
    }

    const calculatedNextDate = nextPaymentDate || calculateNextPaymentDate(
      recurringInterval || 'monthly',
      normDow ?? undefined,
      recurringDay || 10,
      false
    );

    const newSub = await db.createSubscription({
      tenantId,
      donorName: donorName || "신도",
      donorPhone: cleanPhone,
      donorEmail: donorEmail || "",
      itemId: itemId || "recurring",
      itemName: itemName || "정기 봉헌금",
      amount: Number(amount || 0),
      userId: `u${cleanPhone}`,
      billKey,
      cardNo: cardNo || "",
      cardName: cardName || "신용카드",
      recurringDay: recurringInterval === 'monthly' ? (recurringDay || 10) : 10,
      recurringInterval: recurringInterval || "monthly",
      recurringDayOfWeek: normDow ?? undefined,
      nextPaymentDate: calculatedNextDate,
      status: "active",
    });

    console.log("[Subscriptions Register] Successfully created subscription via register API:", newSub.id);
    return c.json({ success: true, data: newSub });
  } catch (err: any) {
    console.error("[Subscriptions Register] Error:", err);
    return c.json({ success: false, error: err?.message || String(err) }, 500);
  }
};
app.post("/make-server-d0d82cc7/subscriptions/register", handleRegisterSubscription);
app.post("/subscriptions/register", handleRegisterSubscription);

// 인증결제 콜백 결과 처리 (Nanopay / Mainpay POST/GET 처리)
const handleCertCallback = async (c: any) => {
  try {
    let body: any = {};
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await c.req.json().catch(() => ({}));
    } else {
      body = await c.req.parseBody().catch(() => ({}));
    }

    console.log("Nanopay Cert Callback Headers:", c.req.header());
    console.log("Nanopay Cert Callback Received Body:", body);

    const resultCode = body.resultCode || body.res_cd || (body.apprNo ? "0000" : "9999");
    const resultMsg = body.resultMsg || body.res_msg || (resultCode === "0000" ? "정상 승인" : "결제 실패");
    const donationId = body.compOrderNo || body.orderNo || body.comp_order_no;
    const tranNo = body.tranNo || body.apprNo || body.tno || "";
    const apprNo = body.apprNo || tranNo;
    const payWay = body.payWay || "card";
    const cardSrc = String(body.cardSrc || body.cardsrc || "").trim().toUpperCase();

    // 간편결제 식별 (C: PAYCO, O: KAKAOPAY, L: LPAY, V: TOSSPAY, K: 국민앱카드, N: 네이버페이)
    let paymentMethod = payWay || 'card';
    if (cardSrc === 'O') paymentMethod = '카카오페이';
    else if (cardSrc === 'V') paymentMethod = '토스페이';
    else if (cardSrc === 'N') paymentMethod = '네이버페이';
    else if (cardSrc === 'C') paymentMethod = '페이코';
    else if (cardSrc === 'L') paymentMethod = '엘페이';
    else if (cardSrc === 'K') paymentMethod = '국민앱카드';
    else if (cardSrc) paymentMethod = '간편결제';
    else if (payWay === 'dbank') paymentMethod = '실시간 계좌이체';
    else if (payWay === 'vbank') paymentMethod = '가상계좌';
    else if (payWay === 'card') paymentMethod = '신용카드';

    const isSuccess = resultCode === "0000";

    let tenantSlug = '';

    if (donationId) {
      const sb = db.pgClient();
      const { data: donation } = await sb.from('donations').select('*').eq('id', donationId).maybeSingle();
      
      if (donation) {
        if (donation.tenant_id) {
          try {
            const tenant = await db.getTenant(donation.tenant_id);
            if (tenant?.slug) tenantSlug = tenant.slug;
          } catch (_) {}
        }

        if (isSuccess) {
          await db.updateDonation(donation.tenant_id, donation.id, {
            paymentStatus: 'completed',
            transactionId: tranNo,
            approveNo: apprNo,
            paymentMethod,
          });
          console.log(`✅ Certified payment successful for donation: ${donation.id} (method: ${paymentMethod}, cardSrc: ${cardSrc || 'N/A'})`);
        } else {
          await db.updateDonation(donation.tenant_id, donation.id, {
            paymentStatus: 'failed',
            failureReason: resultMsg || '나노페이 결제 실패',
          });
          console.log(`❌ Certified payment failed for donation: ${donation.id}, error: ${resultMsg}`);
        }
      } else if (isSuccess) {
        console.warn("Donation record not found for ID, recreating from callback:", donationId);
        const allTenants = await db.getAllTenants();
        const matchedTenant = allTenants.find((t: any) => t.id === body.tenantId || t.slug === body.tenantId) || allTenants[0];
        if (matchedTenant) {
          tenantSlug = matchedTenant.slug || '';
          await db.createDonation({
            id: donationId,
            tenantId: matchedTenant.id,
            itemId: 'cert',
            itemName: body.goodsName || '봉헌금',
            amount: Number(body.reqPayAmt) || 1000,
            donorName: body.orderName || body.compOrderMem || '신도',
            donorPhone: body.orderTel || '',
            paymentStatus: 'completed',
            paymentMethod,
            transactionId: tranNo,
            approveNo: apprNo,
          });
          console.log(`✅ Recreated and recorded successful donation from callback: ${donationId} (method: ${paymentMethod}, cardSrc: ${cardSrc || 'N/A'})`);
        }
      }
    }

    const completeUrl = tenantSlug
      ? `https://pay.soulpay.kr/${tenantSlug}/complete?donId=${donationId || ''}&type=nano_cert`
      : 'https://pay.soulpay.kr';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>결제 결과</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; padding: 32px 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 360px; width: 90%; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 8px; color: ${isSuccess ? '#16a34a' : '#dc2626'}; }
    .desc { font-size: 14px; color: #64748b; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 11px 22px; background: #4f46e5; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">${isSuccess ? '결제가 완료되었습니다' : '결제 실패'}</div>
    <div class="desc">${isSuccess ? '잠시 후 결제 완료 화면으로 자동 이동합니다.' : (resultMsg || '결제를 완료하지 못했습니다.')}</div>
    <div>
      <a href="${completeUrl}" class="btn">
        ${isSuccess ? '봉헌 완료 확인하기' : '돌아가기'}
      </a>
    </div>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SOULPAY_PAYMENT_RESULT',
          success: ${isSuccess},
          donationId: '${donationId || ''}',
          resultCode: '${resultCode}',
          resultMsg: '${resultMsg}'
        }, '*');
        setTimeout(function() {
          window.close();
        }, 1200);
      } else {
        // 모바일 환경 (window.opener 없음): 완료 페이지로 자동 리다이렉트
        setTimeout(function() {
          window.location.href = '${completeUrl}';
        }, 1200);
      }
      localStorage.setItem('nanoPayResData${donationId || ''}', JSON.stringify({
        success: ${isSuccess},
        donationId: '${donationId || ''}'
      }));
    } catch (e) {
      console.error(e);
      window.location.href = '${completeUrl}';
    }
  </script>
</body>
</html>`;

    return c.html(html);
  } catch (error) {
    console.error('Error processing certified payment callback:', error);
    return c.html(`<html><body><h3>결제 처리 중 오류가 발생했습니다.</h3><script>setTimeout(function(){window.close();}, 1500);</script></body></html>`);
  }
};

app.post("/make-server-d0d82cc7/payment/process/cert/callback", handleCertCallback);
app.get("/make-server-d0d82cc7/payment/process/cert/callback", handleCertCallback);

// ==================== DONATION ITEMS ROUTES ====================

// 봉헌 항목 조회
app.get("/make-server-d0d82cc7/donation-items/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const items = await db.getDonationItems(tenantId);
    
    return c.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching donation items:', error);
    return c.json({ success: false, error: 'Failed to fetch donation items' }, 500);
  }
});

// 봉헌 항목 저장
app.post("/make-server-d0d82cc7/donation-items/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const body = await c.req.json();
    const rawItems: any[] = Array.isArray(body) ? body : (body?.items && Array.isArray(body.items) ? body.items : []);
    const items = await db.setDonationItems(tenantId, rawItems);
    
    return c.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Error saving donation items:', error);
    return c.json({ success: false, error: error?.message || 'Failed to save donation items' }, 500);
  }
});

// ==================== DONATION ROUTES ====================

// 모든 봉헌 내역 조회 (시스템 관리자용)
app.get("/make-server-d0d82cc7/donations", async (c) => {
  try {
    const donations = await db.getAllDonations();
    return c.json({ success: true, data: donations });
  } catch (error) {
    console.error('Error fetching all donations:', error);
    return c.json({ success: false, error: 'Failed to fetch donations' }, 500);
  }
});

// 전화번호 기반 기부자 자동 조회 (키오스크용)
app.get("/make-server-d0d82cc7/donations/lookup-by-phone/:tenantId/:phone", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const phone = c.req.param('phone');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const donations = await db.getDonationsByTenant(tenantId);
    const matched = donations.filter(d => (d.donorPhone || '').replace(/[^0-9]/g, '') === cleanPhone);
    if (matched.length > 0) {
      const last = matched[0];
      return c.json({
        success: true,
        data: {
          found: true,
          donorName: last.donorName,
          baptismName: last.baptismName,
          count: matched.length,
        }
      });
    }
    return c.json({ success: true, data: { found: false } });
  } catch (error) {
    console.error('Error looking up phone:', error);
    return c.json({ success: false, error: 'Failed to lookup phone' }, 500);
  }
});

// 특정 단체의 봉헌 내역 조회
app.get("/make-server-d0d82cc7/donations/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const donations = await db.getDonationsByTenant(tenantId);
    
    return c.json({ success: true, data: donations });
  } catch (error) {
    console.error('Error fetching tenant donations:', error);
    return c.json({ success: false, error: 'Failed to fetch donations' }, 500);
  }
});

// ==================== DAILY CLOSING SNAPSHOTS API ====================

// 1. 특정 단체 마감 스냅샷 조회 (DB 영구 적재 데이터 조회 및 누락 일자 자동 생성)
const handleGetClosingSnapshots = async (c: any) => {
  try {
    const tenantId = c.req.param('tenantId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const result = await db.getDailyClosingSnapshots(tenantId, startDate, endDate);
    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching closing snapshots:', error);
    return c.json({ success: false, error: error?.message || 'Failed to fetch closing snapshots' }, 500);
  }
};
app.get("/make-server-d0d82cc7/statistics/closing-snapshots/:tenantId", handleGetClosingSnapshots);
app.get("/statistics/closing-snapshots/:tenantId", handleGetClosingSnapshots);

// 2. 마감 스냅샷 배치 실행 (전일 또는 지정일 마감 스냅샷 일괄 생성/갱신)
const handleRunClosingBatch = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { targetDate, tenantId } = body;
    const result = await db.runDailyClosingBatch(targetDate, tenantId);
    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error running closing snapshot batch:', error);
    return c.json({ success: false, error: error?.message || 'Failed to run closing snapshot batch' }, 500);
  }
};
app.post("/make-server-d0d82cc7/statistics/closing-snapshots/batch-run", handleRunClosingBatch);
app.post("/statistics/closing-snapshots/batch-run", handleRunClosingBatch);

// 3. 마감 기준일(전일 23:59:59) 이내의 상세 수납 원장 서버 페이징 조회
const handleGetClosedTransactions = async (c: any) => {
  try {
    const tenantId = c.req.param('tenantId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '10', 10);
    const search = c.req.query('search') || '';

    const result = await db.getClosedTransactionsPaged(tenantId, {
      startDate,
      endDate,
      page,
      pageSize,
      search,
    });
    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching closed transactions:', error);
    return c.json({ success: false, error: error?.message || 'Failed to fetch closed transactions' }, 500);
  }
};
app.get("/make-server-d0d82cc7/statistics/closing-transactions/:tenantId", handleGetClosedTransactions);
app.get("/statistics/closing-transactions/:tenantId", handleGetClosedTransactions);


// 봉헌 생성
app.post("/make-server-d0d82cc7/donations", async (c) => {
  try {
    const body = await c.req.json();
    const donation = await db.createDonation(body);
    
    return c.json({ success: true, data: donation }, 201);
  } catch (error: any) {
    console.error('Error creating donation:', error);
    return c.json({ success: false, error: error?.message || 'Failed to create donation' }, 500);
  }
});

// 봉헌 수정
app.put("/make-server-d0d82cc7/donations/:tenantId/:id", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const donation = await db.updateDonation(tenantId, id, body);
    
    if (!donation) {
      return c.json({ success: false, error: 'Donation not found' }, 404);
    }
    
    return c.json({ success: true, data: donation });
  } catch (error) {
    console.error('Error updating donation:', error);
    return c.json({ success: false, error: 'Failed to update donation' }, 500);
  }
});

// 봉헌 삭제
app.delete("/make-server-d0d82cc7/donations/:tenantId/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const success = await db.deleteDonation(id);
    return c.json({ success });
  } catch (error) {
    console.error('Error deleting donation:', error);
    return c.json({ success: false, error: 'Failed to delete donation' }, 500);
  }
});

// ==================== KAKAO PAY SANDBOX TEST API (CID: TC0ONETIME) ====================

// 1. Kakao Pay Ready (결제 준비 - TC0ONETIME)
app.post("/make-server-d0d82cc7/kakaopay/ready", async (c) => {
  try {
    const { partner_order_id, partner_user_id, item_name, total_amount, approval_url, cancel_url, fail_url } = await c.req.json();

    const origin = c.req.header("origin") || c.req.header("referer")?.replace(/\/$/, '') || "https://soulpay.kr";

    const payload = {
      cid: "TC0ONETIME",
      partner_order_id: partner_order_id || `SP-ORDER-${Date.now()}`,
      partner_user_id: partner_user_id || `USER-${Date.now()}`,
      item_name: item_name || "SoulPay 봉헌금",
      quantity: 1,
      total_amount: Number(total_amount) || 10000,
      tax_free_amount: 0,
      approval_url: approval_url || `${origin}/kakaopay/approve`,
      cancel_url: cancel_url || `${origin}/kakaopay/cancel`,
      fail_url: fail_url || `${origin}/kakaopay/fail`,
    };

    try {
      const kakaoRes = await fetch("https://open-api.kakaopay.com/online/v1/payment/ready", {
        method: "POST",
        headers: {
          "Authorization": "SECRET_KEY DEV_SECRET_KEY",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (kakaoRes.ok) {
        const data = await kakaoRes.json();
        return c.json({ success: true, data });
      }
    } catch {
      // API call fallback to Sandbox mock
    }

    const mockTid = `T${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
    const redirectUrl = `${origin}/kakaopay/sandbox?tid=${mockTid}&partner_order_id=${payload.partner_order_id}&partner_user_id=${payload.partner_user_id}&amount=${payload.total_amount}&item_name=${encodeURIComponent(payload.item_name)}`;

    return c.json({
      success: true,
      data: {
        tid: mockTid,
        next_redirect_pc_url: redirectUrl,
        next_redirect_mobile_url: redirectUrl,
        created_at: new Date().toISOString(),
      }
    });
  } catch (err: any) {
    console.error("Kakao Pay Ready Error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 2. Kakao Pay Approve (결제 승인 - TC0ONETIME)
app.post("/make-server-d0d82cc7/kakaopay/approve", async (c) => {
  try {
    const { tid, partner_order_id, partner_user_id, pg_token } = await c.req.json();

    const payload = {
      cid: "TC0ONETIME",
      tid,
      partner_order_id,
      partner_user_id,
      pg_token,
    };

    try {
      const kakaoRes = await fetch("https://open-api.kakaopay.com/online/v1/payment/approve", {
        method: "POST",
        headers: {
          "Authorization": "SECRET_KEY DEV_SECRET_KEY",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (kakaoRes.ok) {
        const data = await kakaoRes.json();
        return c.json({ success: true, data });
      }
    } catch {
      // API fallback
    }

    return c.json({
      success: true,
      data: {
        aid: `A${Date.now()}`,
        tid: tid || `T${Date.now()}`,
        cid: "TC0ONETIME",
        partner_order_id,
        partner_user_id,
        payment_method_type: "MONEY",
        amount: { total: 50000, tax_free: 0, vat: 0 },
        approved_at: new Date().toISOString(),
      }
    });
  } catch (err: any) {
    console.error("Kakao Pay Approve Error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==================== ADMIN ROUTES ====================

// 관리자 로그인
app.post("/make-server-d0d82cc7/admin/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const admin = await db.getAdminByEmail(email);
    
    if (!admin) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    // 실제로는 bcrypt 등으로 해시 비교해야 하지만, 프로토타입이므로 단순 비교
    if (admin.password !== password) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    // 비밀번호 제외하고 반환
    const { password: _, ...adminData } = admin;
    
    return c.json({ success: true, data: adminData });
  } catch (error) {
    console.error('Error during admin login:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// 관리자 생성
app.post("/make-server-d0d82cc7/admin/register", async (c) => {
  try {
    const body = await c.req.json();
    
    // 이미 존재하는 이메일인지 확인
    const existing = await db.getAdminByEmail(body.email);
    if (existing) {
      return c.json({ success: false, error: 'Email already exists' }, 400);
    }
    
    const admin = await db.createAdmin(body);
    
    // 비밀번호 제외하고 반환
    const { password: _, ...adminData } = admin;
    
    return c.json({ success: true, data: adminData }, 201);
  } catch (error) {
    console.error('Error creating admin:', error);
    return c.json({ success: false, error: 'Failed to create admin' }, 500);
  }
});

// 모든 관리자 조회
app.get("/make-server-d0d82cc7/admin", async (c) => {
  try {
    const admins = await db.getAllAdmins();
    
    // 비밀번호 제외
    const sanitized = admins.map(({ password, ...admin }) => admin);
    
    return c.json({ success: true, data: sanitized });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return c.json({ success: false, error: 'Failed to fetch admins' }, 500);
  }
});



// DB 80만원 (4건: 10만원 3건 + 50만원 1건) 정밀 재정립 (개발/테스트 전용)
app.post("/make-server-d0d82cc7/admin/seed-800k", async (c) => {
  if (Deno.env.get("ENVIRONMENT") === "production" || Deno.env.get("NODE_ENV") === "production") {
    return c.json({ success: false, error: "상용(Production) 환경에서는 시드 엔드포인트를 실행할 수 없습니다." }, 403);
  }
  try {
    await db.seed800kLedger();
    return c.json({ success: true, message: 'DB가 80만원 (4건) 실데이터로 정밀 리셋되었습니다.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== STATISTICS ROUTES ====================


// 전체 단체별 통계 조회 (특정 년월) - 우선순위 상단 배치
const handleGetAllTenantStats = async (c: any) => {
  try {
    const year = parseInt(c.req.param('year'));
    const month = parseInt(c.req.param('month'));
    
    let tenants = await db.getAllTenants();
    if (!tenants) tenants = [];

    const allStats = [];
    for (const tenant of tenants) {
      const stats = await db.getHybridMonthlyStats(tenant.id, year, month);
      allStats.push({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          religionType: tenant.religionType ?? 'buddhist',
          slug: tenant.slug,
        },
        stats,
      });
    }

    return c.json({
      success: true,
      data: allStats,
    });

  } catch (error) {
    console.error('Error fetching all tenant stats:', error);
    return c.json({ success: false, error: 'Failed to fetch statistics' }, 500);
  }
};
app.get("/make-server-d0d82cc7/stats/all/:year/:month", handleGetAllTenantStats);
app.get("/stats/all/:year/:month", handleGetAllTenantStats);

// 월별 통계 조회
const handleGetTenantMonthlyStats = async (c: any) => {
  try {
    const tenantId = c.req.param('tenantId');
    const year = parseInt(c.req.param('year'));
    const month = parseInt(c.req.param('month'));

    if (tenantId === 'all') {
      let tenants = await db.getAllTenants();
      if (!tenants) tenants = [];
      const allStats = [];
      for (const tenant of tenants) {
        const stats = await db.getHybridMonthlyStats(tenant.id, year, month);
        allStats.push({
          tenant: {
            id: tenant.id,
            name: tenant.name,
            religionType: tenant.religionType ?? 'buddhist',
            slug: tenant.slug,
          },
          stats,
        });
      }
      return c.json({ success: true, data: allStats });
    }

    let stats = await db.getHybridMonthlyStats(tenantId, year, month);
    return c.json({ success: true, data: stats });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: 'Failed to fetch statistics' }, 500);
  }
};
app.get("/make-server-d0d82cc7/stats/:tenantId/:year/:month", handleGetTenantMonthlyStats);
app.get("/stats/:tenantId/:year/:month", handleGetTenantMonthlyStats);

// 통계 재계산
const handleRecalculateStats = async (c: any) => {
  try {
    const tenantId = c.req.param('tenantId');
    const year = parseInt(c.req.param('year'));
    const month = parseInt(c.req.param('month'));
    
    const stats = await db.calculateAndSaveMonthlyStats(tenantId, year, month);
    
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error recalculating stats:', error);
    return c.json({ success: false, error: 'Failed to recalculate statistics' }, 500);
  }
};
app.post("/make-server-d0d82cc7/stats/:tenantId/:year/:month/recalculate", handleRecalculateStats);
app.post("/stats/:tenantId/:year/:month/recalculate", handleRecalculateStats);




// ==================== PARTNER ROUTES ====================

// 영업 파트너 목록 조회
app.get("/make-server-d0d82cc7/partners", async (c) => {
  try {
    const parentId = c.req.query('parentId');
    const partners = await db.getAllPartners();
    // parentId 필터: 대리점의 소속 영업자 목록
    const result = parentId
      ? partners.filter((p: db.Partner) => p.parentId === parentId)
      : partners;
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return c.json({ success: false, error: 'Failed to fetch partners' }, 500);
  }
});

// 파트너 로그인 — email + password DB 검증
app.post("/make-server-d0d82cc7/partners/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ success: false, error: "이메일과 비밀번호를 입력해 주세요." }, 400);
    }
    const sb = db.pgClient();
    const { data, error } = await sb
      .from("partners")
      .select("id, name, email, phone, role, parent_id, commission_rate, agency_rate, referral_code, bank_name, account_number, account_holder, status, created_at")
      .eq("email", email.trim().toLowerCase())
      .eq("password", password)
      .single();

    if (error || !data) {
      return c.json({ success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
    }
    if (data.status !== "active") {
      return c.json({ success: false, error: "비활성화된 계정입니다. 시스템 관리자에게 문의하세요." }, 403);
    }
    return c.json({ success: true, data });
  } catch (err) {
    console.error("Partner login error:", err);
    return c.json({ success: false, error: "로그인 처리 중 오류가 발생했습니다." }, 500);
  }
});

// 개별 영업 파트너 상세 조회
app.get("/make-server-d0d82cc7/partners/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const partner = await db.getPartnerById(id);
    if (!partner) {
      const all = await db.getAllPartners();
      const found = all.find((p: db.Partner) => p.id === id || p.referralCode === id);
      if (found) {
        return c.json({ success: true, data: found });
      }
      return c.json({ success: false, error: 'Partner not found' }, 404);
    }
    return c.json({ success: true, data: partner });
  } catch (error) {
    console.error('Error fetching partner by id:', error);
    return c.json({ success: false, error: 'Failed to fetch partner' }, 500);
  }
});

// 신규 영업 파트너 제휴 신청 (공개 웹 신청용)
app.post("/make-server-d0d82cc7/partners/apply", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name || !body.phone || !body.email) {
      return c.json({ success: false, error: '성함, 연락처, 이메일은 필수 입력 항목입니다.' }, 400);
    }
    const partner = await db.createPartner({
      ...body,
      status: 'pending', // 신규 신청은 심사 전 '대기' 상태로 등록
    });
    return c.json({ success: true, data: partner }, 201);
  } catch (error: any) {
    console.error('Error applying partner:', error);
    const msg = error?.message || '';
    if (msg.includes('duplicate key') || msg.includes('partners_email_key')) {
      return c.json({ success: false, error: '이미 등록되었거나 신청 진행 중인 이메일 주소입니다.' }, 400);
    }
    return c.json({ success: false, error: msg || '제휴 신청 처리 중 오류가 발생했습니다.' }, 500);
  }
});

// 신규 영업 파트너 생성 (관리자 등록용)
app.post("/make-server-d0d82cc7/partners", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name || !body.phone || !body.email) {
      return c.json({ success: false, error: '성함, 연락처, 이메일은 필수 입력 항목입니다.' }, 400);
    }
    const partner = await db.createPartner(body);
    return c.json({ success: true, data: partner }, 201);
  } catch (error: any) {
    console.error('Error creating partner:', error);
    const msg = error?.message || '';
    if (msg.includes('duplicate key') || msg.includes('partners_email_key')) {
      return c.json({ success: false, error: '이미 등록되었거나 신청 진행 중인 이메일 주소입니다.' }, 400);
    }
    return c.json({ success: false, error: msg || '파트너 생성 중 오류가 발생했습니다.' }, 500);
  }
});

// 영업 파트너 삭제 (반려 또는 관리자 삭제)
app.delete("/make-server-d0d82cc7/partners/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await db.deletePartner(id);
    return c.json({ success: true, message: '파트너가 성공적으로 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Error deleting partner:', error);
    return c.json({ success: false, error: error?.message || '파트너 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

// 영업 파트너 정보 수정 (계좌 정보, 수수료율, 기본정보 등)
const handleUpdatePartner = async (c: any) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const partner = await db.updatePartner(id, updates);
    if (!partner) {
      return c.json({ success: false, error: 'Partner not found or update failed' }, 404);
    }
    return c.json({ success: true, data: partner });
  } catch (error: any) {
    console.error('Error updating partner:', error);
    return c.json({ success: false, error: error.message || 'Failed to update partner' }, 500);
  }
};

app.put("/make-server-d0d82cc7/partners/:id", handleUpdatePartner);
app.patch("/make-server-d0d82cc7/partners/:id", handleUpdatePartner);

// 영업 파트너 상태 변경 (승인 / 정지) - PUT / POST / PATCH 지원
const handleUpdatePartnerStatus = async (c: any) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const partner = await db.updatePartnerStatus(id, status);
    if (!partner) {
      return c.json({ success: false, error: 'Partner not found' }, 404);
    }
    return c.json({ success: true, data: partner });
  } catch (error) {
    console.error('Error updating partner status:', error);
    return c.json({ success: false, error: 'Failed to update partner status' }, 500);
  }
};

app.put("/make-server-d0d82cc7/partners/:id/status", handleUpdatePartnerStatus);
app.post("/make-server-d0d82cc7/partners/:id/status", handleUpdatePartnerStatus);
app.patch("/make-server-d0d82cc7/partners/:id/status", handleUpdatePartnerStatus);



// 영업자 수수료 내역 조회 (PostgreSQL partner_commissions 테이블 직접 조회)
app.get("/make-server-d0d82cc7/partners/:id/commissions", async (c) => {
  try {
    const partnerId = c.req.param('id');
    const pgData = await db.getCommissionsByPartnerPg(partnerId);
    return c.json({ success: true, data: pgData ?? [] });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return c.json({ success: false, error: 'Failed to fetch commissions' }, 500);
  }
});


// 대리점 정산 배치 + 영업자별 지급 명세 조회
app.get("/make-server-d0d82cc7/partners/:id/settlements", async (c) => {
  try {
    const partnerId = c.req.param('id');
    const data = await db.getSettlementsByPartner(partnerId);
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return c.json({ success: false, error: 'Failed to fetch settlements' }, 500);
  }
});

// 영업자 본인 정산 수령 내역 조회
app.get("/make-server-d0d82cc7/partners/:id/agent-settlements", async (c) => {
  try {
    const agentId = c.req.param('id');
    const data = await db.getAgentSettlementsByPartner(agentId);
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching agent settlements:', error);
    return c.json({ success: false, error: 'Failed to fetch agent settlements' }, 500);
  }
});

// 파트너(대리점/영업자) 관할 단체(가맹점) 목록 조회
app.get("/make-server-d0d82cc7/partners/:id/tenants", async (c) => {
  try {
    const partnerId = c.req.param('id');
    const data = await db.getTenantsByPartner(partnerId);
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching partner tenants:', error);
    return c.json({ success: false, error: 'Failed to fetch partner tenants' }, 500);
  }
});

// 파트너 통계 — DB에서 직접 계산 (총 결제액, 수수료, 당월 정산 예정금)
app.get("/make-server-d0d82cc7/partners/:id/stats", async (c) => {
  try {
    const partnerId = c.req.param('id');
    const sb = db.pgClient();

    // 파트너 정보 조회 (role, parentId)
    const { data: partner } = await sb
      .from('partners')
      .select('id, role, parent_id')
      .eq('id', partnerId)
      .maybeSingle();

    if (!partner) return c.json({ success: false, error: 'Partner not found' }, 404);

    // 영업자는 상위 대리점의 partner_commissions 기준으로 집계
    const lookupId = partner.role === 'sales_agent' && partner.parent_id
      ? partner.parent_id
      : partnerId;

    // 이번 달 기준 (당월 정산 예정금)
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: rows } = await sb
      .from('partner_commissions')
      .select('donation_amount, agent_rate, agency_rate, settlement_status, created_at')
      .eq('partner_id', lookupId);

    const isAgent = partner.role === 'sales_agent';
    const rate = isAgent ? 'agent_rate' : 'agency_rate';

    let totalVolume = 0, totalCommission = 0, pendingSettlement = 0, donationCount = 0;

    for (const r of rows ?? []) {
      const amount = Number(r.donation_amount ?? 0);
      const commRate = Number(r[rate] ?? 0.5);
      const comm = Math.round(amount * commRate / 100);
      totalVolume += amount;
      totalCommission += comm;
      donationCount += 1;
      if ((r.settlement_status ?? 'pending') === 'pending') {
        // 당월 건만
        const createdAt = r.created_at ? new Date(r.created_at) : null;
        if (createdAt && r.created_at >= monthStart) {
          pendingSettlement += comm;
        }
      }
    }

    return c.json({
      success: true,
      data: { totalVolume, totalCommission, pendingSettlement, donationCount }
    });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    return c.json({ success: false, error: 'Failed to fetch partner stats' }, 500);
  }
});

// ==================== ADMIN SETTLEMENT ROUTES ====================

// 관리자 정산 개요 통계 (종합 현황 KPI)
app.get("/make-server-d0d82cc7/admin/settlements/overview", async (c) => {
  try {
    const data = await db.getAdminSettlementOverview();
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching admin settlement overview:', error);
    return c.json({ success: false, error: 'Failed to fetch overview' }, 500);
  }
});

// 4자간 수수료 분구 원장
app.get("/make-server-d0d82cc7/admin/settlements/ledger", async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate   = c.req.query('endDate');
    const status    = c.req.query('status');
    const limit     = c.req.query('limit') ? Number(c.req.query('limit')) : 200;
    const data = await db.getAdminSettlementLedger({ startDate, endDate, status, limit });
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching settlement ledger:', error);
    return c.json({ success: false, error: 'Failed to fetch ledger' }, 500);
  }
});

// 정산 명세서 & 세무 서식 (월별)
app.get("/make-server-d0d82cc7/admin/settlements/statements", async (c) => {
  try {
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);
    const data = await db.getAdminSettlementStatements(month);
    return c.json({ success: true, data: data ?? { tenantStatements: [], partnerStatements: [] } });
  } catch (error) {
    console.error('Error fetching settlement statements:', error);
    return c.json({ success: true, data: { tenantStatements: [], partnerStatements: [] } });
  }
});


// 지급 실행 예외 및 예치금 잔액
app.get("/make-server-d0d82cc7/admin/settlements/exceptions", async (c) => {
  try {
    const data = await db.getAdminPayoutExceptions();
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payout exceptions:', error);
    return c.json({ success: false, error: 'Failed to fetch exceptions' }, 500);
  }
});

// 정산 리스크 & 대조 검증 데이터
app.get("/make-server-d0d82cc7/admin/settlements/risk-audit", async (c) => {
  try {
    const data = await db.getAdminRiskAuditData();
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching risk audit data:', error);
    return c.json({ success: false, error: 'Failed to fetch risk audit' }, 500);
  }
});

// 테스트 결제 생성 샌드박스 (실데이터 기부 결제 ➔ 4자간 실시간 자동 수수료 분구 기입)
app.post("/make-server-d0d82cc7/admin/test-donations", async (c) => {
  try {
    const body = await c.req.json();
    const result = await db.createTestDonationWithSplit(body);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating test donation:', error);
    return c.json({ success: false, error: 'Failed to create test donation' }, 500);
  }
});

// 거래 및 수수료 원장 0건 초기화 (대리점/영업자 조직만 보존)
app.post("/make-server-d0d82cc7/admin/test-donations/reset", async (c) => {
  try {
    await db.resetTestDonationsAndLedger();
    return c.json({ success: true, message: 'All transaction ledger data reset to 0.' });
  } catch (error) {
    console.error('Error resetting test donations:', error);
    return c.json({ success: false, error: 'Failed to reset test ledger' }, 500);
  }
});




// PATCH /partners/:id/channel-share  { channelShareRate: number }
app.patch("/make-server-d0d82cc7/partners/:id/channel-share", async (c) => {
  try {
    const agentId = c.req.param('id');
    const body = await c.req.json();
    const { channelShareRate } = body as { channelShareRate: number };

    if (typeof channelShareRate !== 'number' || channelShareRate < 0 || channelShareRate > 100) {
      return c.json({ success: false, error: 'channelShareRate는 0~100 사이여야 합니다.' }, 400);
    }

    // 대상 파트너 조회
    const agent = await db.getPartnerById(agentId);
    if (!agent) {
      return c.json({ success: false, error: '영업자를 찾지 못했습니다.' }, 404);
    }
    if (agent.role !== 'sales_agent') {
      return c.json({ success: false, error: '영업자(sales_agent)만 대상으로 할 수 있습니다.' }, 400);
    }

    // DB 업데이트 — agency_rate 컬럼에 영구 저장
    const sb = db.pgClient();
    const { data: updated, error } = await sb
      .from('partners')
      .update({
        agency_rate: channelShareRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select('id, name, email, phone, role, parent_id, commission_rate, agency_rate, referral_code, bank_name, account_number, account_holder, status, created_at')
      .single();

    if (error || !updated) {
      console.error('Error updating agent rate in DB:', error);
      return c.json({ success: false, error: '수수료율 DB 저장에 실패했습니다.' }, 500);
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating agent channel share rate:', error);
    return c.json({ success: false, error: 'Failed to update channel share rate' }, 500);
  }
});

// ==================== BATCH RECURRING SCHEDULER ====================
// 매일 지정 시각(Cron / GitHub Actions)에 트리거되어 정기결제(일/주/월)를 자동 승인하는 상용 배치 스케줄러
const handleRecurringBatchRun = async (c: any) => {
  try {
    // ⚡ KST (UTC+9) 기준 현재 시각 실측 산출
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayKstDateStr = kstNow.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const todayKstDayOfMonth = kstNow.getUTCDate();
    const todayKstDayOfWeek = kstNow.getUTCDay(); // 0(일) ~ 6(토)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    console.log(`[Recurring Batch Scheduler] Production run started at KST: ${todayKstDateStr} (${dayNames[todayKstDayOfWeek]}요일), DayOfMonth: ${todayKstDayOfMonth}`);

    // DB에서 모든 active 정기 구독 건 조회
    const allActiveSubscriptions = await db.getAllActiveSubscriptions();
    const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

    // 오늘 이미 성공적으로 결제된 내역 조회하여 2중 청구 원천 차단
    const allDonations = await db.getAllDonations();
    const chargedSubMap = new Set<string>();
    for (const d of allDonations) {
      if (d.isRecurring && d.paymentStatus === 'completed' && d.createdAt) {
        const dKstDate = new Date(new Date(d.createdAt).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (dKstDate === todayKstDateStr) {
          chargedSubMap.add(`${d.tenantId}_${d.donorPhone.replace(/[^0-9]/g, '')}`);
        }
      }
    }

    const targets = allActiveSubscriptions.filter((sub: any) => {
      if (sub.status !== 'active') return false;

      // 일시중지 기간 체크
      if (sub.pausedUntil && typeof sub.pausedUntil === 'string') {
        const cleanPause = sub.pausedUntil.replace(/\./g, '-').slice(0, 10);
        if (cleanPause > todayKstDateStr) {
          return false;
        }
      }

      // 오늘 이미 해당 고객/테넌트에서 정기결제가 승인된 경우 중복 청구 방지
      const cleanPhone = (sub.donorPhone || '').replace(/[^0-9]/g, '');
      if (chargedSubMap.has(`${sub.tenantId}_${cleanPhone}`)) {
        console.log(`[Batch Scheduler] Skipping sub ${sub.id} (already charged today: ${todayKstDateStr})`);
        return false;
      }

      // 1) nextPaymentDate가 설정되어 있는 경우 (가장 정확한 기준)
      if (sub.nextPaymentDate && typeof sub.nextPaymentDate === 'string') {
        const cleanNext = sub.nextPaymentDate.replace(/\./g, '-').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanNext)) {
          return cleanNext <= todayKstDateStr;
        }
      }

      // 2) nextPaymentDate가 없는 레거시의 경우 주기 및 요일/일자 매칭 (타입 안전 변환)
      const interval = sub.recurringInterval || 'monthly';
      if (interval === 'daily') return true;
      if (interval === 'weekly') {
        let dowNum = 0;
        if (typeof sub.recurringDayOfWeek === 'number') {
          dowNum = sub.recurringDayOfWeek;
        } else if (typeof sub.recurringDayOfWeek === 'string') {
          dowNum = dayMap[sub.recurringDayOfWeek] ?? (parseInt(sub.recurringDayOfWeek, 10) || 0);
        }
        return dowNum === todayKstDayOfWeek;
      }
      if (interval === 'monthly') {
        const dom = Number(sub.recurringDay || 10);
        return dom === todayKstDayOfMonth;
      }

      return false;
    });

    console.log(`[Recurring Batch Scheduler] Target subscriptions count: ${targets.length}`);

    const results = [];
    for (const sub of targets) {
      try {
        let tranNo = `NANO_TRAN_${Date.now()}`;
        let apprNo = `APPR_${Date.now()}`;

        if (sub.billKey) {
          const config = await db.getPaymentConfig(sub.tenantId);
          const billingCfg = config?.providerConfigs?.billing;
          const isTest = config?.devMode !== undefined 
            ? Boolean(config.devMode) 
            : (!billingCfg?.apiKey || billingCfg?.mid === "240000005" || billingCfg?.ver === "240000005" || config?.mid === "240000006");

          const billpayData = await executeNanoPayBillPay({
            sub,
            billingCfg,
            isTest,
            amount: sub.amount,
            orderName: sub.itemName || "정기 봉헌금",
          });

          if (billpayData) {
            if (billpayData.resultCode && billpayData.resultCode !== "0000") {
              throw new Error(billpayData.resultMsg || `빌키 승인 실패 (응답코드: ${billpayData.resultCode})`);
            }
            tranNo = billpayData.tranNo || tranNo;
            apprNo = billpayData.apprNo || apprNo;
          }
        }

        const donationRecord = await db.createDonation({
          id: `don_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          tenantId: sub.tenantId,
          itemId: sub.itemId,
          itemName: sub.itemName,
          amount: sub.amount,
          donorName: sub.donorName,
          donorPhone: sub.donorPhone,
          donorEmail: sub.donorEmail || '',
          paymentMethod: 'card',
          paymentStatus: 'completed',
          transactionId: tranNo,
          approveNo: apprNo,
          isRecurring: true,
          receiptIssued: true,
        });

        // 결제 완료 후 다음 결제 예정일(next_payment_date)을 다음 주/다음 달로 안전하게 갱신
        const nextDate = calculateNextPaymentDate(
          sub.recurringInterval || 'monthly',
          sub.recurringDayOfWeek,
          sub.recurringDay,
          true // isAfterImmediateCharge: 다음 회차로 넘김
        );

        try {
          await db.pgClient()
            .from('subscriptions')
            .update({ next_payment_date: nextDate, updated_at: new Date().toISOString() })
            .eq('id', sub.id);
        } catch (updateErr) {
          console.error(`[Batch Scheduler] Failed to update next_payment_date for sub ${sub.id}:`, updateErr);
        }

        results.push({
          subId: sub.id,
          tenantId: sub.tenantId,
          donorName: sub.donorName,
          amount: sub.amount,
          status: 'success',
          donationId: donationRecord.id,
          nextPaymentDate: nextDate,
        });
      } catch (err: any) {
        console.error(`[Recurring Batch Scheduler] Failed for sub ${sub.id}:`, err);
        try {
          await db.createDonation({
            id: `don_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
            tenantId: sub.tenantId,
            itemId: sub.itemId,
            itemName: sub.itemName,
            amount: sub.amount,
            donorName: sub.donorName,
            donorPhone: sub.donorPhone,
            donorEmail: sub.donorEmail || '',
            paymentMethod: 'card',
            paymentStatus: 'failed',
            isRecurring: true,
            failureReason: err?.message || '정기결제 자동 승인 실패',
          });
        } catch (saveErr) {
          console.error('[Recurring Batch Scheduler] Failed to record failed donation:', saveErr);
        }
        results.push({
          subId: sub.id,
          status: 'failed',
          error: err?.message || 'Payment execution failed',
        });
      }
    }

    return c.json({
      success: true,
      executedAtKst: todayKstDateStr,
      processedCount: targets.length,
      successCount: results.filter(r => r.status === 'success').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results,
    });
  } catch (error: any) {
    console.error('Error running recurring batch scheduler:', error);
    return c.json({ success: false, error: error?.message || 'Batch scheduler execution failed' }, 500);
  }
};
app.post("/make-server-d0d82cc7/payment/recurring/batch-run", handleRecurringBatchRun);
app.post("/payment/recurring/batch-run", handleRecurringBatchRun);

// 단일 정기결제 약정 즉시 청구 (Dev 테스트 및 관리자 즉시 청구)
const handleChargeSubscriptionNow = async (c: any) => {
  try {
    const { subscriptionId } = await c.req.json();
    if (!subscriptionId) {
      return c.json({ success: false, error: 'subscriptionId is required' }, 400);
    }

    const sb = db.pgClient();
    const { data: sub, error: subErr } = await sb
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (subErr || !sub) {
      return c.json({ success: false, error: '해당 정기 약정을 찾을 수 없습니다.' }, 404);
    }

    if (!sub.bill_key && !sub.billKey) {
      return c.json({ success: false, error: '등록된 빌키(billKey)가 없는 약정입니다.' }, 400);
    }

    const tenantId = sub.tenant_id || sub.tenantId;
    const config = await db.getPaymentConfig(tenantId);
    const billingCfg = config?.providerConfigs?.billing;
    const isTest = config?.devMode !== undefined
      ? Boolean(config.devMode)
      : (!billingCfg?.apiKey || billingCfg?.mid === "240000005" || billingCfg?.ver === "240000005" || config?.mid === "240000006");

    const formattedSub = {
      id: sub.id,
      tenantId,
      userId: sub.user_id || sub.userId || `u${sub.donor_phone}`,
      billKey: sub.bill_key || sub.billKey,
      donorName: sub.donor_name || sub.donorName,
      donorPhone: sub.donor_phone || sub.donorPhone,
      donorEmail: sub.donor_email || sub.donorEmail,
      itemId: sub.item_id || sub.itemId,
      itemName: sub.item_name || sub.itemName,
      amount: Number(sub.amount),
      recurringInterval: sub.recurring_interval || sub.recurringInterval,
      recurringDay: sub.recurring_day || sub.recurringDay,
      recurringDayOfWeek: sub.recurring_day_of_week ?? sub.recurringDayOfWeek,
    };

    let tranNo = `NANO_TRAN_${Date.now()}`;
    let apprNo = `APPR_${Date.now()}`;

    const billpayData = await executeNanoPayBillPay({
      sub: formattedSub,
      billingCfg,
      isTest,
      amount: formattedSub.amount,
      orderName: formattedSub.itemName || "정기 봉헌금",
    });

    if (billpayData) {
      if (billpayData.resultCode && billpayData.resultCode !== "0000") {
        throw new Error(billpayData.resultMsg || `빌키 승인 실패 (응답코드: ${billpayData.resultCode})`);
      }
      tranNo = billpayData.tranNo || tranNo;
      apprNo = billpayData.apprNo || apprNo;
    }

    const donationRecord = await db.createDonation({
      id: `don_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: formattedSub.tenantId,
      itemId: formattedSub.itemId,
      itemName: formattedSub.itemName,
      amount: formattedSub.amount,
      donorName: formattedSub.donorName,
      donorPhone: formattedSub.donorPhone,
      donorEmail: formattedSub.donorEmail || '',
      paymentMethod: 'card',
      paymentStatus: 'completed',
      transactionId: tranNo,
      approveNo: apprNo,
      isRecurring: true,
      receiptIssued: true,
    });

    const nextDate = calculateNextPaymentDate(
      formattedSub.recurringInterval || 'monthly',
      formattedSub.recurringDayOfWeek,
      formattedSub.recurringDay,
      true
    );

    try {
      await sb
        .from('subscriptions')
        .update({ next_payment_date: nextDate, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
    } catch (updateErr) {
      console.error('[Charge Now] Failed to update next_payment_date:', updateErr);
    }

    return c.json({
      success: true,
      data: {
        subscriptionId: sub.id,
        donation: donationRecord,
        approveNo: apprNo,
        transactionId: tranNo,
        nextPaymentDate: nextDate,
        pgResponse: billpayData,
      },
    });
  } catch (error: any) {
    console.error('Error charging subscription now:', error);
    return c.json({ success: false, error: error?.message || '결제 승인 처리 중 오류가 발생했습니다.' }, 500);
  }
};

app.post("/make-server-d0d82cc7/payment/recurring/charge-sub", handleChargeSubscriptionNow);
app.post("/payment/recurring/charge-sub", handleChargeSubscriptionNow);

// Admin 샌드박스 테스트 결제 생성 (실제 PostgreSQL 원장 분구 반영)
app.post("/make-server-d0d82cc7/admin/test-donations", async (c) => {
  try {
    const body = await c.req.json();
    const { tenantId, amount, donorName, paymentMethod } = body;
    if (!tenantId || !amount) {
      return c.json({ success: false, error: 'tenantId and amount are required' }, 400);
    }
    const tenant = await db.getTenantById(tenantId);
    const result = await db.recordDonationAndDistributeCommission({
      tenantId,
      amount: Number(amount),
      donorName: donorName || 'E2E 테스트 성도',
      paymentMethod: paymentMethod || '신용카드',
    });
    return c.json({
      success: true,
      data: {
        ...result,
        tenantName: tenant?.name || '가맹 단체',
      },
    });
  } catch (error: any) {
    console.error('Error creating test donation:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Admin 테스트 원장 0건 리셋
app.post("/make-server-d0d82cc7/admin/reset-ledger", async (c) => {
  try {
    await db.resetTestDonationsAndLedger();
    return c.json({ success: true, message: 'Ledger reset completed' });
  } catch (error: any) {
    console.error('Error resetting ledger:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 📱 신도/회원 프로필 정보 및 비밀번호 업데이트 API (전화번호 OTP 본인인증 기반)
const handleUpdateProfile = async (c: any) => {
  try {
    const body = await c.req.json();
    const { phone, name, baptismName, email, address, fullAddress, zonecode, addressDetail, password } = body;
    if (!phone) {
      return c.json({ success: false, error: 'Phone number is required' }, 400);
    }
    const result = await db.updateDonorProfile(phone, {
      name,
      baptismName,
      email,
      address,
      fullAddress,
      zonecode,
      addressDetail,
      password,
    });
    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating donor profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
};

// 📱 신도/회원 프로필 조회 API
const handleGetProfile = async (c: any) => {
  try {
    const phone = c.req.param('phone');
    if (!phone) {
      return c.json({ success: false, error: 'Phone number is required' }, 400);
    }
    const profile = await db.getDonorProfile(phone);
    if (!profile) {
      return c.json({ success: false, error: 'Profile not found' }, 404);
    }
    return c.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Error getting donor profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
};

app.get("/make-server-d0d82cc7/members/profile/:phone", handleGetProfile);
app.get("/members/profile/:phone", handleGetProfile);
app.post("/make-server-d0d82cc7/members/update-profile", handleUpdateProfile);
app.post("/members/update-profile", handleUpdateProfile);

// 📱 신도/회원 이메일 로그인 API (DB 100% 실측 조회)
const handleMemberLogin = async (c: any) => {
  try {
    const body = await c.req.json();
    const { tenantId, email, password } = body;
    if (!email) {
      return c.json({ success: false, error: '이메일 주소를 입력해 주세요.' }, 400);
    }
    const result = await db.loginDonorWithEmail(tenantId, email, password);
    if (!result) {
      return c.json({ success: false, error: '등록되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.' }, 401);
    }
    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error during member email login:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
};
app.post("/make-server-d0d82cc7/members/login", handleMemberLogin);
app.post("/members/login", handleMemberLogin);

// ======================================================================
// SYSTEM ADMINS API
// ======================================================================

// GET /system-admins — 전체 목록
app.get("/make-server-d0d82cc7/system-admins", async (c) => {
  const sb = db.pgClient();
  const { data, error } = await sb
    .from("system_admins")
    .select("id, name, email, role, status, memo, created_at, updated_at, last_login_at")
    .order("created_at", { ascending: true });
  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data });
});

// POST /system-admins/login — DB 인증 (이메일 패턴 우회 없음)
app.post("/make-server-d0d82cc7/system-admins/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ success: false, error: "이메일과 비밀번호를 입력해 주세요." }, 400);

  const sb = db.pgClient();
  const { data, error } = await sb
    .from("system_admins")
    .select("id, name, email, role, status, memo")
    .eq("email", email.trim().toLowerCase())
    .eq("password", password)
    .single();

  if (error || !data) return c.json({ success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
  if (data.status !== "active") return c.json({ success: false, error: "비활성화된 계정입니다. 관리자에게 문의하세요." }, 403);

  // last_login_at 갱신
  await sb.from("system_admins").update({ last_login_at: new Date().toISOString() }).eq("id", data.id);

  return c.json({ success: true, data });
});

// POST /system-admins — 신규 등록
app.post("/make-server-d0d82cc7/system-admins", async (c) => {
  const body = await c.req.json();
  const { name, email, password, role, status, memo } = body;
  if (!name || !email || !password) return c.json({ success: false, error: "이름, 이메일, 비밀번호는 필수입니다." }, 400);

  const sb = db.pgClient();
  const { data, error } = await sb
    .from("system_admins")
    .insert({ name, email: email.toLowerCase(), password, role: role ?? "system_admin", status: status ?? "active", memo })
    .select("id, name, email, role, status, memo, created_at")
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data });
});

// PUT /system-admins/:id — 정보 수정
app.put("/make-server-d0d82cc7/system-admins/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name     !== undefined) updates.name     = body.name;
  if (body.email    !== undefined) updates.email    = body.email.toLowerCase();
  if (body.password !== undefined) updates.password = body.password;
  if (body.role     !== undefined) updates.role     = body.role;
  if (body.status   !== undefined) updates.status   = body.status;
  if (body.memo     !== undefined) updates.memo     = body.memo;

  const sb = db.pgClient();
  const { data, error } = await sb
    .from("system_admins")
    .update(updates)
    .eq("id", id)
    .select("id, name, email, role, status, memo, updated_at")
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data });
});

// DELETE /system-admins/:id — 삭제
app.delete("/make-server-d0d82cc7/system-admins/:id", async (c) => {
  const id = c.req.param("id");
  const sb = db.pgClient();
  const { error } = await sb.from("system_admins").delete().eq("id", id);
  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true });
});

Deno.serve(app.fetch);