import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as db from "./database.tsx";
import { seedDatabase } from "./seed.tsx";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const app = new Hono();

// Seed database on startup (only once)
let isSeeded = false;
if (!isSeeded) {
  seedDatabase().then(() => {
    isSeeded = true;
    console.log('✅ Server ready with seeded data');
  }).catch(error => {
    console.error('❌ Failed to seed database:', error);
  });
}

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

// 특정 단체 조회 (by ID)
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

// 단체 조회 (by slug)
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
    const success = await db.deleteTenant(id);
    
    if (!success) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }
    
    return c.json({ success: true, message: 'Tenant deleted' });
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
    
    const NANO_API_KEY = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    const NANO_ENC_KEY = "UfS2tccZNyz3HYxXJDhZH52Ujorqp5km";
    const NANO_IV = "vgqTyX5tBqnMXB68";
    const NANO_API_URL = "http://dev3.nanopay.co.kr/api/payment/approval.io";
    
    // 카드 정보 암호화
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(NANO_ENC_KEY, "utf-8"), Buffer.from(NANO_IV, "utf-8"));
    // 결과 인코딩을 hex로 할지 base64로 할지는 명세서에 따르나 일반적인 hex를 우선 적용 (실패시 base64)
    let encData = cipher.update(JSON.stringify(paymentData), "utf-8", "hex");
    encData += cipher.final("hex");

    const payload = {
      ver: "smbtest",
      loginId: "smbtestshop",
      shopcode: "240000006",
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
        'API_KEY': NANO_API_KEY
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
        paymentMethod: 'card',
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

// 결제 취소 처리
app.post("/make-server-d0d82cc7/payment/cancel", async (c) => {
  try {
    const { tenantId, donationId } = await c.req.json();
    
    // DB에서 거래 내역 조회
    const donation = await db.getDonationById(tenantId, donationId);
    if (!donation) {
      return c.json({ success: false, error: 'Donation not found' }, 404);
    }
    
    if (donation.paymentStatus !== 'completed' || !donation.transactionId) {
      return c.json({ success: false, error: 'Invalid donation status for cancellation' }, 400);
    }

    const NANO_API_KEY = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
    const NANO_API_URL = "http://dev3.nanopay.co.kr/api/payment/cancel.io";
    
    const payload = {
      ver: "smbtest",
      loginId: "smbtestshop",
      shopcode: "240000006",
      payMethod: "card", // 혹은 DB에 저장된 paymentMethod 연동
      cancelAmt: donation.amount.toString(),
      tranNo: donation.transactionId,
    };

    const response = await fetch(NANO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CharSet': 'UTF-8',
        'API_KEY': NANO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.resultCode === "0000") {
      // 결제 취소 성공, DB 업데이트
      const updatedDonation = await db.updateDonation(tenantId, donationId, {
        paymentStatus: 'cancelled'
      });
      return c.json({ success: true, data: updatedDonation });
    } else {
      return c.json({ success: false, error: result.resultMsg, data: result }, 400);
    }
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return c.json({ success: false, error: 'Failed to process cancellation' }, 500);
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

// ==================== STATISTICS ROUTES ====================

// 월별 통계 조회
app.get("/make-server-d0d82cc7/stats/:tenantId/:year/:month", async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const year = parseInt(c.req.param('year'));
    const month = parseInt(c.req.param('month'));
    
    let stats = await db.getMonthlyStats(tenantId, year, month);
    
    // 통계가 없으면 계산해서 저장
    if (!stats) {
      stats = await db.calculateAndSaveMonthlyStats(tenantId, year, month);
    }
    
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

// 전체 단체별 통계 조회 (특정 년월)
app.get("/make-server-d0d82cc7/stats/all/:year/:month", async (c) => {
  try {
    const year = parseInt(c.req.param('year'));
    const month = parseInt(c.req.param('month'));
    
    const tenants = await db.getAllTenants();
    const allStats = [];
    
    for (const tenant of tenants) {
      let stats = await db.getMonthlyStats(tenant.id, year, month);
      
      // 통계가 없으면 계산
      if (!stats) {
        stats = await db.calculateAndSaveMonthlyStats(tenant.id, year, month);
      }
      
      allStats.push({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          religionType: tenant.religionType,
          slug: tenant.slug,
        },
        stats,
      });
    }
    
    return c.json({ success: true, data: allStats });
  } catch (error) {
    console.error('Error fetching all tenant stats:', error);
    return c.json({ success: false, error: 'Failed to fetch statistics' }, 500);
  }
});

Deno.serve(app.fetch);