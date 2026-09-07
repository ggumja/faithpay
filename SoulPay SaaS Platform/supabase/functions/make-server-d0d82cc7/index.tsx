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
      .single();
    if (error || !data) return c.json({ success: false, error: 'Setting not found' }, 404);
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
      return c.json({ success: false, error: '완료 상태가 아니거나 승인 거래 번호(transactionId)가 존재하지 않는 거래건입니다.' }, 400);
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
        } else if (isAlreadyCancelled) {
          // PG사에서 이미 전액 취소 완료된 거래건인 경우 DB 원장 상태를 동기화
          const cancelApprovedAt = new Date().toISOString();
          const updatedDonation = await db.cancelDonationAndLedger(tenantId, donationId, {
            cancelTransactionId: donation.transactionId,
            cancelApprovedAt: cancelApprovedAt,
            cancelReason: reasonText,
          });

          return c.json({
            success: true,
            data: updatedDonation,
            approveNo: donation.approveNo || donation.transactionId,
            cancelApproveNo: donation.transactionId,
            cancelApprovedAt: cancelApprovedAt,
            syncedFromPg: true,
            toss: result
          });
        } else {
          const cancelFailMsg = result.message || '토스페이먼츠 승인취소 거부';
          await db.updateDonation(tenantId, donationId, {
            cancelFailureReason: cancelFailMsg,
          });
          return c.json({ success: false, error: cancelFailMsg, data: result }, 400);
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

    if (result.resultCode === "0000" || isNanoAlreadyCancelled) {
      const cancelTransactionKey = result.apprNo || result.cancelTranNo || result.apprTranNo || donation.transactionId;
      const cancelApprovedAt = result.cancelDate && result.cancelTime
        ? `${result.cancelDate.slice(0, 4)}-${result.cancelDate.slice(4, 6)}-${result.cancelDate.slice(6, 8)}T${result.cancelTime.slice(0, 2)}:${result.cancelTime.slice(2, 4)}:${result.cancelTime.slice(4, 6)}+09:00`
        : new Date().toISOString();

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
        cancelApprovedAt: cancelApprovedAt,
        syncedFromPg: isNanoAlreadyCancelled
      });
    } else {
      const cancelFailMsg = result.resultMsg || `PG 결제 취소 거부 (${result.resultCode || response.status})`;
      await db.updateDonation(tenantId, donationId, {
        cancelFailureReason: cancelFailMsg,
      });
      return c.json({ success: false, error: cancelFailMsg, data: result }, 400);
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
    
    // 나노페이 PG 웹 결제창 표준 요청 URL (Smallbee 공식 검증: PC/Mobile 공통 mobile request.io 엔드포인트 사용)
    const NANO_API_URL = `${baseUrl}/api/payment/cert/mobile/request.io`;
      
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
    const donorEmail = donationData?.email || "donator@soulpay.kr";

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
    const redirectUrl = match ? match[1] : null;

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
    const userId = cleanPhone ? `${tenantId}_${cleanPhone}` : `${tenantId}_${Date.now()}`;
    const timestamp = Date.now().toString();
    const receiveUrl = "https://aoognbmkstgrytkqsexy.supabase.co/functions/v1/make-server-d0d82cc7/payment/process/billkey/callback";

    // 공식 v2.2.1 규격: hashValue = SHA256(ver + loginId + shopcode + timestamp + API_KEY + "NANO").toLowerCase()
    const hashRaw = `${ver}${loginId}${shopcode}${timestamp}${NANO_API_KEY}NANO`;
    const hashValue = crypto.createHash("sha256").update(hashRaw).digest("hex").toLowerCase();

    const tempSubId = `sub_${Date.now()}`;
    const compData = JSON.stringify({
      tempSubId,
      tenantId,
      donorName: donationData?.name || "",
      donorPhone: cleanPhone,
      donorEmail: donationData?.email || "",
      itemId: donationData?.itemId || "recurring",
      itemName: donationData?.itemName || "정기 봉헌금",
      amount: donationData?.amount || 0,
      recurringInterval: donationData?.recurringInterval || "monthly",
      recurringDay: donationData?.recurringDay || 10,
      recurringDayOfWeek: donationData?.recurringDayOfWeek,
    });

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
    <span class="sp-row-val highlight">${intervalText}</span>
  </div>
  <div class="sp-divider"></div>
  <div class="sp-total-row">
    <span class="sp-total-label">총 결제 금액</span>
    <span class="sp-total-amount">${formattedAmount}원</span>
  </div>
</div>
`;
    formattedHtml = formattedHtml.replace(/(<form[^>]*id=["\x27]payForm["\x27][^>]*>)/i, `${summaryCardHtml}\n$1\n<div class="sp-form-title">💳 신용카드 정기결제 등록</div><div class="sp-form-desc">안전하고 투명한 금융 거래를 위해 공식 결제대행사(스마트로)를 통해 암호화 등록됩니다.</div>`);

    // 4. 버튼 문구 개선 및 보안 인증 마크 추가
    formattedHtml = formattedHtml.replace(
      /<button[^>]*class=["\x27]pay-btn["\x27][^>]*>.*?<\/button>/i,
      `<button type="button" class="pay-btn" onclick="chkPayment()">🔒 ${formattedAmount}원 정기결제 카드 등록하기</button><div class="sp-security"><strong>🔒 금융감독원 전자금융 표준 보안 규격 준수</strong><br>카드 정보는 가맹점에 저장되지 않고 스마트로 PG 보안 서버로 안전하게 직접 전송됩니다.</div>`
    );

    // 5. 나노솔루션 공식 카드 스캔(OCR 카메라) 버튼 및 스크립트 연동
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

    // 스캔 핸들러 스크립트 주입 (2자리 연도를 스마트로의 4자리 연도로 자동 변환 매핑)
    const scanScriptHtml = `
<script>
  function startPopupCardScan() {
    if (typeof openCardScan !== "function") {
      alert("카드 스캔 모듈을 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    openCardScan({
      fields: {
        cardNo: "cardno",
        expYY: "expire_year",
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

  window.addEventListener("message", function(e) {
    if (e.origin !== "${baseUrl}") return;
    var data = e.data || {};
    if (data.resultCode === "0000") {
      if (data.cardNo) {
        var c = document.getElementById("cardno");
        if (c) { c.value = data.cardNo; c.dispatchEvent(new Event("input", { bubbles: true })); }
      }
      if (data.expMM) {
        var m = document.getElementById("expire_month");
        if (m) { m.value = data.expMM.toString().padStart(2, '0'); m.dispatchEvent(new Event("change", { bubbles: true })); }
      }
      if (data.expYY) {
        var y = document.getElementById("expire_year");
        var fullYear = data.expYY.length === 2 ? "20" + data.expYY : data.expYY;
        if (y) { y.value = fullYear; y.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    }
  });
</script>
`;
    formattedHtml = formattedHtml.replace("</body>", `${scanScriptHtml}\n</body>`);

    // 6. 테스트 프리셋 카드번호를 빈값으로 정리하여 사용자 편의성 제공
    formattedHtml = formattedHtml
      .replace('value="4890168342495918"', 'value=""')
      .replace('value="35"', 'value=""')
      .replace('value="950716"', 'value=""');

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

    if (isSuccess) {
      let meta: any = {};
      let donationData: any = {};
      try {
        meta = JSON.parse(compData || "{}");
        donationData = meta.donationData || meta;
      } catch(e) {
        console.error("Failed to parse compData JSON:", e);
      }

      const tenantId = meta.tenantId || donationData.tenantId;
      if (tenantId) {
        const donorName = donationData.name || meta.donorName || "";
        const donorPhone = (donationData.phone || meta.donorPhone || "").replace(/[^0-9]/g, '');
        const itemId = donationData.itemId || meta.itemId || "recurring";
        const itemName = donationData.itemName || meta.itemName || "정기 봉헌금";
        const amount = Number(donationData.amount || meta.amount || 0);
        const recurringInterval = donationData.recurringInterval || meta.recurringInterval || "monthly";
        const recurringDay = donationData.recurringDay || meta.recurringDay || 10;
        const recurringDayOfWeek = donationData.recurringDayOfWeek || meta.recurringDayOfWeek || undefined;

        newSub = await db.createSubscription({
          tenantId,
          donorName,
          donorPhone,
          donorEmail: donationData.email || meta.donorEmail || "",
          itemId,
          itemName,
          amount,
          userId: userId || donorPhone,
          billKey: billKey,
          cardNo: cardNo || "",
          cardName: cardName || "신용카드",
          recurringInterval,
          recurringDay,
          recurringDayOfWeek,
          status: "active",
        });

        console.log("BillKey subscription created:", newSub);
      } else {
        console.error("Tenant ID missing in compData, cannot create subscription");
      }
    }

    // 사용자 팝업 창에 응답할 안내 화면 및 postMessage 스크립트 반환
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isSuccess ? '카드 등록 완료' : '카드 등록 실패'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
      color: #0f172a;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 28px;
    }
    .icon.success { background: #ecfdf5; color: #10b981; }
    .icon.fail { background: #fef2f2; color: #ef4444; }
    h2 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
    p { font-size: 14px; color: #64748b; margin: 0 0 20px; line-height: 1.5; }
    .footer { font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${isSuccess ? 'success' : 'fail'}">${isSuccess ? '✓' : '✕'}</div>
    <h2>${isSuccess ? '카드 등록이 완료되었습니다' : '카드 등록에 실패했습니다'}</h2>
    <p>${resultMsg || (isSuccess ? '정기결제 카드가 정상적으로 등록되었습니다.' : '카드 등록 중 오류가 발생했습니다.')}</p>
    <div class="footer">잠시 후 결제 완료 화면으로 자동 이동합니다...</div>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SOULPAY_BILLKEY_RESULT',
          resultCode: ${JSON.stringify(resultCode || (isSuccess ? "0000" : "9999"))},
          resultMsg: ${JSON.stringify(resultMsg || '')},
          billKey: ${JSON.stringify(billKey || '')},
          userId: ${JSON.stringify(userId || '')},
          cardNo: ${JSON.stringify(cardNo || '')},
          cardName: ${JSON.stringify(cardName || '')},
          subscriptionId: ${JSON.stringify(newSub?.id || '')},
          compData: ${JSON.stringify(compData || '')}
        }, '*');
      }
    } catch (e) {
      console.error('postMessage error:', e);
    }
    setTimeout(function() {
      window.close();
    }, 1500);
  </script>
</body>
</html>`;

    return c.html(html);
  } catch (error: any) {
    console.error("BillKey callback error:", error);
    const failHtml = `<!DOCTYPE html><html><body><script>
      try { if (window.opener) window.opener.postMessage({ type: 'SOULPAY_BILLKEY_RESULT', resultCode: '9999', resultMsg: '서버 오류' }, '*'); } catch(e){}
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

// 신도 휴대폰 번호 기반 정기결제 약정 목록 조회
const handleGetSubscriptionsByPhone = async (c: any) => {
  try {
    const rawPhone = c.req.param("phone");
    const cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
    const subscriptions = await db.getSubscriptionsByPhone(cleanPhone);
    return c.json({ success: true, data: subscriptions });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch subscriptions" }, 500);
  }
};
app.get("/make-server-d0d82cc7/subscriptions/phone/:phone", handleGetSubscriptionsByPhone);
app.get("/subscriptions/phone/:phone", handleGetSubscriptionsByPhone);

// 비회원 정기결제 중단/일시정지 상태 변경
app.post("/make-server-d0d82cc7/subscriptions/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json(); // 'active' | 'paused' | 'cancelled'
    const updated = await db.updateSubscriptionStatus(id, status);
    if (!updated) return c.json({ success: false, error: "Subscription not found" }, 444);
    return c.json({ success: true, subscription: updated });
  } catch (error) {
    return c.json({ success: false, error: "Failed to update subscription status" }, 500);
  }
});

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

    const isSuccess = resultCode === "0000";

    if (donationId) {
      const donations = await db.getAllDonations();
      const donation = donations.find(d => d.id === donationId);
      
      if (donation) {
        if (isSuccess) {
          await db.updateDonation(donation.tenantId, donation.id, {
            paymentStatus: 'completed',
            transactionId: tranNo,
            approveNo: apprNo,
            paymentMethod: payWay || 'card',
          });
          console.log(`✅ Certified payment successful for donation: ${donation.id}`);
        } else {
          await db.updateDonation(donation.tenantId, donation.id, {
            paymentStatus: 'failed',
            failureReason: resultMsg || '나노페이 결제 실패',
          });
          console.log(`❌ Certified payment failed for donation: ${donation.id}, error: ${resultMsg}`);
        }
      } else {
        console.warn("Donation record not found for ID:", donationId);
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>결제 결과</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 360px; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 8px; color: ${isSuccess ? '#16a34a' : '#dc2626'}; }
    .desc { font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">${isSuccess ? '결제가 완료되었습니다' : '결제 실패'}</div>
    <div class="desc">${isSuccess ? '창이 곧 자동으로 닫힙니다.' : (resultMsg || '결제를 완료하지 못했습니다.')}</div>
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
      }
      localStorage.setItem('nanoPayResData${donationId || ''}', JSON.stringify({
        success: ${isSuccess},
        donationId: '${donationId || ''}'
      }));
    } catch (e) {
      console.error(e);
    }
    setTimeout(function() {
      window.close();
    }, 1200);
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

// 봉헌 생성
app.post("/make-server-d0d82cc7/donations", async (c) => {
  try {
    const body = await c.req.json();
    const donation = await db.createDonation(body);
    
    return c.json({ success: true, data: donation }, 201);
  } catch (error) {
    console.error('Error creating donation:', error);
    return c.json({ success: false, error: 'Failed to create donation' }, 500);
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
app.get("/make-server-d0d82cc7/stats/all/:year/:month", async (c) => {
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
});

// 월별 통계 조회

app.get("/make-server-d0d82cc7/stats/:tenantId/:year/:month", async (c) => {
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
});

// 통계 재계산
app.post("/make-server-d0d82cc7/stats/:tenantId/:year/:month/recalculate", async (c) => {
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
});




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

// 신규 영업 파트너 생성 / 제휴 신청
app.post("/make-server-d0d82cc7/partners", async (c) => {
  try {
    const body = await c.req.json();
    const partner = await db.createPartner(body);
    return c.json({ success: true, data: partner }, 201);
  } catch (error) {
    console.error('Error creating partner:', error);
    return c.json({ success: false, error: 'Failed to create partner' }, 500);
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
// 매일 지정 시각(Cron / GitHub Actions)에 트리거되어 정기결제(일/주/월)를 자동 승인하는 배치 스케줄러
app.post("/make-server-d0d82cc7/payment/recurring/batch-run", async (c) => {
  try {
    const now = new Date();
    const todayDate = now.getDate();
    const daysMap = ['일', '월', '화', '수', '목', '금', '토'];
    const todayDayOfWeek = daysMap[now.getDay()];

    console.log(`[Recurring Batch Scheduler] Started run for Date: ${todayDate}일, DayOfWeek: ${todayDayOfWeek}`);

    // DB에서 모든 active 정기 구독 건 조회
    const allActiveSubscriptions = await db.getAllActiveSubscriptions();
    
    const targets = allActiveSubscriptions.filter((sub: any) => {
      if (sub.status !== 'active') return false;

      const interval = sub.recurringInterval || 'monthly';
      if (interval === 'daily') return true;
      if (interval === 'weekly' && sub.recurringDayOfWeek === todayDayOfWeek) return true;
      if (interval === 'monthly' && sub.recurringDay === todayDate) return true;
      
      return false;
    });

    console.log(`[Recurring Batch Scheduler] Target subscriptions count: ${targets.length}`);

    const results = [];
    for (const sub of targets) {
      try {
        // 나노페이 v2.2.1 정기결제 승인 요청 (POST /api/payment/recure/billpay.io)
        let tranNo = `NANO_TRAN_${Date.now()}`;
        let apprNo = `APPR_${Date.now()}`;
        
        if (sub.billKey) {
          const config = await db.getPaymentConfig(sub.tenantId);
          const billingCfg = config?.providerConfigs?.billing;
          const isTest = config?.devMode !== undefined 
            ? Boolean(config.devMode) 
            : (!billingCfg?.apiKey || billingCfg?.mid === "240000005" || billingCfg?.ver === "240000005" || config?.mid === "240000006");
          const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
          const BILLPAY_URL = `${baseUrl}/api/payment/recure/billpay.io`;

          // 빌링 결제는 빌링 전용 설정(billingCfg)만 사용
          const NANO_API_KEY = billingCfg?.apiKey || (isTest ? "R7L9PxM5V8K2Jc4N6dWqY1Eb3T5XhZU2" : undefined);
          const shopcode = billingCfg?.mid || (isTest ? "240000005" : undefined);
          const loginId = billingCfg?.loginId || (isTest ? "shoptest" : undefined);
          const ver = billingCfg?.ver || (isTest ? "240000005" : "240000005");

          if (NANO_API_KEY && shopcode && loginId) {
            const timestamp = Date.now().toString();
            const compOrderNo = `ORD_${Date.now()}_${String(sub.id).slice(0, 8)}`;

            // AES-256-CBC encData 암호화 (Key: API_KEY, IV: API_KEY 앞 16자리)
            const iv = Buffer.from(NANO_API_KEY.slice(0, 16), "utf-8");
            const key = Buffer.from(NANO_API_KEY, "utf-8");
            const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
            let encData = cipher.update(JSON.stringify({ userId: sub.userId || sub.donorPhone, billKey: sub.billKey }), "utf-8", "hex");
            encData += cipher.final("hex");

            // hashValue: SHA256(ver + loginId + shopcode + timestamp + API_KEY + "NANO").toLowerCase()
            const hashRaw = `${ver}${loginId}${shopcode}${timestamp}${NANO_API_KEY}NANO`;
            const hashValue = crypto.createHash("sha256").update(hashRaw).digest("hex").toLowerCase();

            const billpayPayload = {
              ver,
              loginId,
              shopcode,
              compOrderNo,
              goodsName: sub.itemName || "정기 봉헌금",
              amount: String(sub.amount),
              buyerName: sub.donorName,
              buyerTel: (sub.donorPhone || "").replace(/[^0-9]/g, ""),
              encData,
              timestamp,
              hashValue,
              compData: JSON.stringify({ subscriptionId: sub.id, tenantId: sub.tenantId }),
            };

            const billpayRes = await fetch(BILLPAY_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "API_KEY": NANO_API_KEY,
              },
              body: JSON.stringify(billpayPayload),
            });

            const billpayData = await billpayRes.json().catch(() => null);
            console.log(`[Batch Scheduler] Billpay response for sub ${sub.id}:`, billpayData);

            if (billpayData && billpayData.resultCode && billpayData.resultCode !== "0000") {
              throw new Error(`[${billpayData.resultCode}] ${billpayData.resultMsg || '빌링 결제 승인 실패'}`);
            }

            if (billpayData) {
              tranNo = billpayData.tranNo || tranNo;
              apprNo = billpayData.apprNo || apprNo;
            }
          }
        }

        const donationRecord = await db.createDonation({
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

        results.push({
          subId: sub.id,
          tenantId: sub.tenantId,
          donorName: sub.donorName,
          amount: sub.amount,
          status: 'success',
          donationId: donationRecord.id,
        });
      } catch (err: any) {
        console.error(`[Recurring Batch Scheduler] Failed for sub ${sub.id}:`, err);
        try {
          await db.createDonation({
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
            failureReason: err.message || '정기결제 자동 승인 실패',
          });
        } catch (saveErr) {
          console.error('[Recurring Batch Scheduler] Failed to record failed donation:', saveErr);
        }
        results.push({
          subId: sub.id,
          status: 'failed',
          error: err.message || 'Payment execution failed',
        });
      }
    }

    return c.json({
      success: true,
      timestamp: now.toISOString(),
      processedCount: targets.length,
      results,
    });
  } catch (error: any) {
    console.error('Error running recurring batch scheduler:', error);
    return c.json({ success: false, error: 'Batch scheduler execution failed' }, 500);
  }
});

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
    const { phone, name, baptismName, email, address, password } = body;
    if (!phone) {
      return c.json({ success: false, error: 'Phone number is required' }, 400);
    }
    const result = await db.updateDonorProfile(phone, { name, baptismName, email, address, password });
    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating donor profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
};

app.post("/make-server-d0d82cc7/members/update-profile", handleUpdateProfile);
app.post("/members/update-profile", handleUpdateProfile);

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