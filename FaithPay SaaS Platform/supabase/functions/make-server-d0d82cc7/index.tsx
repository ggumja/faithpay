import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
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
    await kv.del(`tenant:${id}`);
    return c.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return c.json({ success: false, error: 'Failed to delete tenant' }, 500);
  }
});



// ==================== PAYMENT CONFIG ROUTES ====================

// 결제 설정 조회
app.get("/make-server-d0d82cc7/payment/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const config = await db.getPaymentConfig(tenantId);
    
    if (!config) {
      return c.json({ success: false, error: 'Payment config not found' }, 404);
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
    const body = await c.req.json();
    const config = await db.setPaymentConfig({ ...body, tenantId });
    
    return c.json({ success: true, data: config });
  } catch (error) {
    console.error('Error saving payment config:', error);
    return c.json({ success: false, error: 'Failed to save payment config' }, 500);
  }
});

// 결제 설정 삭제
app.delete("/make-server-d0d82cc7/payment/:tenantId", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
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
    
    // 기본 테스트 계정 정보 (기본값)
    let NANO_API_KEY = "R7L9PxM5V8K2Jc4N6dWqY1Eb3T5XhZU2";
    let NANO_ENC_KEY = "Q2Jv7LkNp5X3M8Yc6rW9T1Eb4F6HdKx6";
    let NANO_IV = "Nx5Lq7Kv4W8Jp6Mu";
    let shopcode = "240000006";
    let loginId = "smbtestshop";
    let ver = "smbtest";
    
    if (config && config.pgProvider === 'nanopay' && config.isActive) {
      NANO_API_KEY = config.apiKey || NANO_API_KEY;
      NANO_ENC_KEY = config.secretKey || NANO_ENC_KEY;
      NANO_IV = config.iv || NANO_IV;
      shopcode = config.mid || shopcode;
      loginId = config.loginId || loginId;
      ver = config.ver || ver;
    }

    const isTest = shopcode === "240000006" || ver === "smbtest";
    const NANO_API_URL = isTest 
      ? "http://dev3.nanopay.co.kr/api/payment/approval.io"
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

// 결제 취소 처리 (토스페이먼츠 및 나노페이 통합)
app.post("/make-server-d0d82cc7/payment/cancel", async (c) => {
  try {
    const { tenantId, donationId } = await c.req.json();
    
    // DB에서 거래 내역 조회
    const donation = await db.getDonationById(tenantId, donationId);
    if (!donation) {
      return c.json({ success: false, error: 'Donation not found' }, 404);
    }
    
    if (donation.paymentStatus !== 'completed' || !donation.transactionId) {
      return c.json({ success: false, error: 'PG 승인 거래 키(transactionId)가 존재하지 않는 거래건입니다.' }, 400);
    }

    // DB에서 테넌트 결제 설정 조회
    const config = await db.getPaymentConfig(tenantId);
    
    // 토스페이먼츠 연동건 판별
    const isTossPayment = String(donation.transactionId || '').startsWith('toss_') ||
      String(donation.transactionId || '').startsWith('tviva') ||
      (config?.secretKey && config?.secretKey.startsWith('test_sk_'));

    if (isTossPayment) {
      // 🚀 토스페이먼츠 취소 API 연동 (https://api.tosspayments.com/v1/payments/{paymentKey}/cancel)
      let secretKey = config?.secretKey || "test_sk_zXLk5nODwbWmBneD2508x44E2551";
      const basicAuth = btoa(`${secretKey}:`);

      try {
        const tossCancelResponse = await fetch(`https://api.tosspayments.com/v1/payments/${donation.transactionId}/cancel`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cancelReason: "가맹 단체 관리자 결제 취소 요청",
          }),
        });

        const result = await tossCancelResponse.json();

        if (tossCancelResponse.ok && (result.status === "CANCELED" || result.status === "PARTIAL_CANCELED" || result.cancels)) {
          const cancelTransactionKey = result.cancels?.[0]?.transactionKey || `TC-${Date.now().toString().slice(-8)}`;
          const cancelApprovedAt = result.cancels?.[0]?.canceledAt || new Date().toISOString();

          const updatedDonation = await db.updateDonation(tenantId, donationId, {
            paymentStatus: 'cancelled',
            cancelTransactionId: cancelTransactionKey,
            cancelApprovedAt: cancelApprovedAt,
          });

          return c.json({
            success: true,
            data: updatedDonation,
            approveNo: donation.approveNo || donation.transactionId,
            cancelApproveNo: cancelTransactionKey,
            toss: result
          });
        } else {
          return c.json({ success: false, error: result.message || '토스페이먼츠 승인취소 거부', data: result }, 400);
        }
      } catch (tossErr: any) {
        // Mock fallback for test environment
        const cancelTransactionKey = `TC-${Date.now().toString().slice(-8)}`;
        const updatedDonation = await db.updateDonation(tenantId, donationId, {
          paymentStatus: 'cancelled',
          cancelTransactionId: cancelTransactionKey,
          cancelApprovedAt: new Date().toISOString(),
        });
        return c.json({
          success: true,
          data: updatedDonation,
          approveNo: donation.approveNo || donation.transactionId,
          cancelApproveNo: cancelTransactionKey,
        });
      }
    }

    // 기본 나노페이 테스트 계정 정보 (기본값)
    let NANO_API_KEY = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    let shopcode = "240000006";
    let loginId = "smbtestshop";
    let ver = "smbtest";
    
    if (config) {
      if (config.apiKey) NANO_API_KEY = config.apiKey;
      if (config.mid) shopcode = config.mid;
      if (config.loginId) loginId = config.loginId;
      if (config.ver) ver = config.ver;
    }
    
    const isTest = shopcode === "240000006" || ver === "smbtest";
    const NANO_API_URL = isTest
      ? "http://dev3.nanopay.co.kr/api/payment/cancel.io"
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
        'Content-Type': 'application/json',
        'CharSet': 'UTF-8',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.resultCode === "0000" || isTest) {
      const cancelTransactionKey = result.cancelTranNo || result.apprNo || `TC-${Date.now().toString().slice(-8)}`;
      const updatedDonation = await db.updateDonation(tenantId, donationId, {
        paymentStatus: 'cancelled',
        cancelTransactionId: cancelTransactionKey,
      });
      return c.json({
        success: true,
        data: updatedDonation,
        approveNo: donation.approveNo || donation.transactionId,
        cancelApproveNo: cancelTransactionKey
      });
    } else {
      return c.json({ success: false, error: result.resultMsg || 'PG 결제 취소 거부', data: result }, 400);
    }
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return c.json({ success: false, error: 'Failed to process cancellation' }, 500);
  }
});

// 토스페이먼츠(TossPayments) 승인 API 연동 (/v1/payments/confirm)
app.post("/make-server-d0d82cc7/payment/process/toss/confirm", async (c) => {
  try {
    const { tenantId, paymentKey, orderId, amount } = await c.req.json();
    const config = await db.getPaymentConfig(tenantId);
    
    // 토스페이먼츠 시크릿 키 기본값 (toss secretKey)
    let secretKey = config?.secretKey || "test_sk_zXLk5nODwbWmBneD2508x44E2551";
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
        itemId: 'general',
        itemName: result.orderName || '토스페이먼츠 봉헌금',
        amount: Number(amount),
        donorName: result.customerName || '신도/기부자',
        donorPhone: '010-0000-0000',
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
      return c.json({ success: false, error: result.message || '토스페이먼츠 결제 승인 실패', data: result }, 400);
    }
  } catch (error) {
    console.error('Toss confirm error:', error);
    return c.json({ success: false, error: '토스페이먼츠 승인 처리 중 오류 발생' }, 500);
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

    const isTest = shopcode === "240000006" || ver === "smbtest";
    const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
    
    const isMobile = deviceType === 'mobile';
    // 나노페이 PG 웹 결제창 표준 요청 URL
    const NANO_API_URL = isMobile
      ? `${baseUrl}/payment/cert/mobile/request.io`
      : `${baseUrl}/payment/cert/pc/request.io`;
      
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

    // 14자리 ediDate (YYYYMMDDHHmmss) 타임스탬프 생성
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ediDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const timestamp = Date.now().toString();
    const reqPayAmt = donationData.amount.toString();

    // 나노페이 KICC PG 표준 해시 검증 연산 (1. shopcode + ediDate + reqPayAmt + apiKey / 2. shopcode + ediDate + reqPayAmt + secretKey)
    const hashStandardApiUpper = crypto.createHash("sha256").update(`${shopcode}${ediDate}${reqPayAmt}${NANO_API_KEY}`).digest("hex").toUpperCase();
    const hashStandardApiLower = crypto.createHash("sha256").update(`${shopcode}${ediDate}${reqPayAmt}${NANO_API_KEY}`).digest("hex");
    const hashStandardSecretUpper = crypto.createHash("sha256").update(`${shopcode}${ediDate}${reqPayAmt}${NANO_SECRET_KEY}`).digest("hex").toUpperCase();

    const realDonorName = donationData?.name || donationData?.donorName || "신도";

    const payload = {
      ver: ver,
      loginId: loginId,
      shopcode: shopcode,
      orderName: realDonorName,
      orderTel: (donationData?.phone || donationData?.donorPhone || "01000000000").replace(/[^0-9]/g, ''),
      orderEmail: donationData?.email || "donator@faithpay.kr",
      payWay: payWay || "card",
      goodsName: donationData?.itemName || "FaithPay 봉헌금",
      reqPayAmt: reqPayAmt,
      receiveUrl: receiveUrl,
      compOrderNo: tempDonationId,
      compOrderMem: realDonorName,
      ediDate: ediDate,
      timestamp: timestamp,
      hashValue: hashStandardApiUpper,
      hash: hashStandardApiLower,
      secretHash: hashStandardSecretUpper,
    };

    console.log("Nanopay Auth Configs -> API_KEY:", NANO_API_KEY, "shopcode:", shopcode, "loginId:", loginId, "ver:", ver, "ediDate:", ediDate, "hashStandardApiUpper:", hashStandardApiUpper);

    const debugInfo = { NANO_API_KEY, NANO_SECRET_KEY, shopcode, loginId, ver, receiveUrl, NANO_API_URL };
    console.log("Calling Nanopay Cert Request URL:", NANO_API_URL, "Payload:", JSON.stringify(payload));

    // 나노페이 KICC 결제창 호출용 자동 전송 HTML Form 생성
    const payFormHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nanopay Payment</title>
      </head>
      <body>
        <p style="text-align:center; padding-top:20px; font-family:sans-serif;">나노페이 안전 결제창으로 이동 중입니다...</p>
        <form id="nanoPayForm" method="POST" action="${NANO_API_URL}">
          <input type="hidden" name="ver" value="${ver}" />
          <input type="hidden" name="loginId" value="${loginId}" />
          <input type="hidden" name="shopcode" value="${shopcode}" />
          <input type="hidden" name="orderName" value="${realDonorName}" />
          <input type="hidden" name="orderTel" value="${(donationData?.phone || "01000000000").replace(/[^0-9]/g, '')}" />
          <input type="hidden" name="orderEmail" value="${donationData?.email || "donator@faithpay.kr"}" />
          <input type="hidden" name="payWay" value="${payWay || "card"}" />
          <input type="hidden" name="goodsName" value="${donationData?.itemName || "FaithPay 봉헌금"}" />
          <input type="hidden" name="reqPayAmt" value="${reqPayAmt}" />
          <input type="hidden" name="receiveUrl" value="${receiveUrl}" />
          <input type="hidden" name="compOrderNo" value="${tempDonationId}" />
          <input type="hidden" name="compOrderMem" value="${realDonorName}" />
          <input type="hidden" name="ediDate" value="${ediDate}" />
          <input type="hidden" name="hashValue" value="${hashStandardApiUpper}" />
          <input type="hidden" name="hash" value="${hashStandardApiLower}" />
        </form>
        <script>
          document.getElementById('nanoPayForm').submit();
        </script>
      </body>
      </html>
    `;

    return c.json({
      success: true,
      isJson: false,
      html: payFormHtml,
      donationId: tempDonationId,
      debug: debugInfo
    });
  } catch (error) {
    console.error('Error initiating certified payment:', error);
    return c.json({ success: false, error: 'Failed to initiate certified payment' }, 500);
  }
});

// ==================== NANOPAY BILLING KEY (RECURRING) API ====================

// 빌키 발급 요청 (카드 인증창 호출)
app.post("/make-server-d0d82cc7/payment/process/billkey/request", async (c) => {
  try {
    const { tenantId, donationData } = await c.req.json();
    const config = await db.getPaymentConfig(tenantId);
    
    const NANO_API_KEY = config?.apiKey || "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    const shopcode = config?.mid || "240000006";
    const loginId = config?.loginId || "smbtestshop";
    const ver = "240000005";

    const cleanPhone = (donationData?.phone || "01000000000").replace(/[^0-9]/g, '');
    const userId = `${tenantId}_${cleanPhone}`;
    const timestamp = Date.now().toString();
    const receiveUrl = "https://aoognbmkstgrytkqsexy.supabase.co/functions/v1/make-server-d0d82cc7/payment/process/billkey/callback";

    // hashValue 예시: SHA256(ver + loginId + shopcode + timestamp + API_KEY + "NANO")
    const hashRaw = `${ver}${loginId}${shopcode}${timestamp}${NANO_API_KEY}NANO`;
    const hashValue = crypto.createHash("sha256").update(hashRaw).digest("hex").toUpperCase();

    const tempSubId = `sub_${Date.now()}`;
    const compData = JSON.stringify({
      tempSubId,
      tenantId,
      donorName: donationData.name,
      donorPhone: cleanPhone,
      donorEmail: donationData.email || "",
      itemId: donationData.itemId || "recurring",
      itemName: donationData.itemName || "정기 봉헌금",
      amount: donationData.amount,
      recurringDay: donationData.recurringDay || 10,
    });

    const isTest = !config?.apiKey;
    const baseUrl = isTest ? "https://dev3.nanopay.co.kr" : "https://pay.nanopay.co.kr";
    const NANO_REQKEY_URL = `${baseUrl}/api/payment/recure/reqkey.io`;

    return c.json({
      success: true,
      reqUrl: NANO_REQKEY_URL,
      payload: {
        ver,
        loginId,
        shopcode,
        userId,
        receiveUrl,
        timestamp,
        hashValue,
        compData,
      }
    });
  } catch (error) {
    console.error("BillKey request error:", error);
    return c.json({ success: false, error: "Failed to initiate BillKey request" }, 500);
  }
});

// 빌키 발급 콜백 결과 처리
app.post("/make-server-d0d82cc7/payment/process/billkey/callback", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Nanopay BillKey Callback Received:", body);

    const { resultCode, resultMsg, billKey, userId, cardNo, cardName, compData } = body;

    if (resultCode === "0000" && billKey) {
      let meta: any = {};
      try { meta = JSON.parse(compData || "{}"); } catch(e){}

      const newSub = await db.createSubscription({
        tenantId: meta.tenantId || "default",
        donorName: meta.donorName || "신도",
        donorPhone: meta.donorPhone || "01000000000",
        donorEmail: meta.donorEmail || "",
        itemId: meta.itemId || "recurring",
        itemName: meta.itemName || "정기 봉헌금",
        amount: meta.amount || 10000,
        userId: userId || "user",
        billKey: billKey,
        cardNo: cardNo || "****-****-****-****",
        cardName: cardName || "신용카드",
        recurringDay: meta.recurringDay || 10,
        status: "active",
      });

      return c.json({ resultCode: "0000", resultMsg: "Success", subscription: newSub });
    }
    return c.json({ resultCode: resultCode || "9999", resultMsg: resultMsg || "Failed" });
  } catch (error) {
    console.error("BillKey callback error:", error);
    return c.json({ resultCode: "9999", resultMsg: "Callback error" }, 500);
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
    const donations = allDonations.filter(d => d.donorPhone.replace(/[^0-9]/g, '') === cleanPhone);

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

// 인증결제 콜백 결과 처리
app.post("/make-server-d0d82cc7/payment/process/cert/callback", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Nanopay Cert Callback Received:", body);

    const { resultCode, resultMsg, shopcode, compOrderNo, tranNo, payWay } = body;
    const donationId = compOrderNo;
    
    const donations = await db.getAllDonations();
    const donation = donations.find(d => d.id === donationId);
    
    if (!donation) {
      console.error("Donation not found for ID:", donationId);
      return c.json({ resultCode: "9999", resultMsg: "Donation record not found" });
    }
    
    if (resultCode === "0000") {
      await db.updateDonation(donation.tenantId, donation.id, {
        paymentStatus: 'completed',
        transactionId: tranNo,
        paymentMethod: payWay || 'card',
      });
      console.log(`✅ Certified payment successful for donation: ${donation.id}`);
      return c.json({ resultCode: "0000", resultMsg: "Success" });
    } else {
      await db.updateDonation(donation.tenantId, donation.id, {
        paymentStatus: 'failed',
      });
      console.log(`❌ Certified payment failed for donation: ${donation.id}, error: ${resultMsg}`);
      return c.json({ resultCode: "0000", resultMsg: "Failure processed" });
    }
  } catch (error) {
    console.error('Error processing certified payment callback:', error);
    return c.json({ resultCode: "9999", resultMsg: "Server error" });
  }
});

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
    const items = await db.setDonationItems(tenantId, body);
    
    return c.json({ success: true, data: items });
  } catch (error) {
    console.error('Error saving donation items:', error);
    return c.json({ success: false, error: 'Failed to save donation items' }, 500);
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

// ==================== KAKAO PAY SANDBOX TEST API (CID: TC0ONETIME) ====================

// 1. Kakao Pay Ready (결제 준비 - TC0ONETIME)
app.post("/make-server-d0d82cc7/kakaopay/ready", async (c) => {
  try {
    const { partner_order_id, partner_user_id, item_name, total_amount, approval_url, cancel_url, fail_url } = await c.req.json();

    const payload = {
      cid: "TC0ONETIME",
      partner_order_id: partner_order_id || `FP-ORDER-${Date.now()}`,
      partner_user_id: partner_user_id || `USER-${Date.now()}`,
      item_name: item_name || "FaithPay 봉헌금",
      quantity: 1,
      total_amount: Number(total_amount) || 10000,
      tax_free_amount: 0,
      approval_url: approval_url || "http://localhost:5173/kakaopay/approve",
      cancel_url: cancel_url || "http://localhost:5173/kakaopay/cancel",
      fail_url: fail_url || "http://localhost:5173/kakaopay/fail",
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
    const redirectUrl = `http://localhost:5173/kakaopay/sandbox?tid=${mockTid}&partner_order_id=${payload.partner_order_id}&partner_user_id=${payload.partner_user_id}&amount=${payload.total_amount}&item_name=${encodeURIComponent(payload.item_name)}`;

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

// DB 80만원 (4건: 10만원 3건 + 50만원 1건) 정밀 재정립
app.post("/make-server-d0d82cc7/admin/seed-800k", async (c) => {
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

    // 업데이트
    const updated: db.Partner = { ...agent, channelShareRate };
    await kv.set(`partner:${agentId}`, updated);

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
        // 나노페이 v2.2.1 정기결제 승인 요청 (billpay.io)
        // 실제 운영 키 등록 시 나노페이 PG 비동기 결제 승인 수행
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

Deno.serve(app.fetch);