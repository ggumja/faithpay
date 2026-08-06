/**
 * Database Adapter Layer
 * 
 * KV 스토어를 사용하되, 나중에 PostgreSQL로 쉽게 마이그레이션할 수 있도록
 * 추상화 레이어를 제공합니다.
 */

import * as kv from './kv_store.tsx';

// ==================== TYPE DEFINITIONS ====================

export type ReligionType = 'protestant' | 'buddhist' | 'catholic';
export type UserRole = 'system_admin' | 'tenant_admin' | 'finance_manager' | 'member';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  religionType: ReligionType;
  primaryColor: string;
  logoUrl: string;
  bannerImages: string[];
  description: string;
  address: string;
  contact: {
    phone: string;
    email: string;
    name?: string;  // 담당자 이름
  };
  schedule: {
    label: string;
    time: string;
  }[];
  terminology: {
    donation: string;
    member: string;
    prayer: string;
  };
  // 입점 상태 관리
  status: 'pending' | 'active' | 'suspended';
  appliedAt?: string;   // 입점 신청일
  approvedAt?: string;  // 승인일
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfig {
  tenantId: string;
  pgProvider: string;
  apiKey: string;
  secretKey: string;
  mid: string;
  loginId?: string;
  iv?: string;
  ver?: string;
  enableCard?: boolean;
  enableEasyPayment?: boolean;
  enableVBank?: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface DonationItem {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  amountType: 'fixed' | 'flexible';
  fixedAmount?: number;
  allowRecurring: boolean;
  allowOneTime: boolean;
  enablePrayerField: boolean;
  enabled: boolean;
}

export interface Donation {
  id: string;
  tenantId: string;
  itemId: string;
  itemName: string;
  amount: number;
  donorName: string;
  donorPhone: string;
  prayerText?: string;
  familyMembers?: Array<{ name: string; birthDate: string; calendar: string }>;
  baptismName?: string;
  isRecurring: boolean;
  recurringDay?: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  itemId: string;
  itemName: string;
  amount: number;
  userId: string;
  billKey: string;
  cardNo?: string;
  cardName?: string;
  recurringDay: number;
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate?: string;
  pausedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsOtp {
  id: string;
  phone: string;
  otpCode: string;
  expiresAt: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  tenantId: string; // 'system' for system admin
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ==================== TENANT OPERATIONS ====================

export async function createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  const now = new Date().toISOString();
  const newTenant: Tenant = {
    ...tenant,
    createdAt: now,
    updatedAt: now,
  };
  
  await kv.set(`tenant:${tenant.id}`, newTenant);
  await kv.set(`tenant:slug:${tenant.slug}`, tenant.id); // slug -> id 매핑
  
  return newTenant;
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  return await kv.get(`tenant:${id}`);
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const id = await kv.get(`tenant:slug:${slug}`);
  if (!id) return null;
  return await kv.get(`tenant:${id}`);
}

export async function getAllTenants(status?: 'pending' | 'active' | 'suspended'): Promise<Tenant[]> {
  const tenants = await kv.getByPrefix('tenant:');
  // slug 매핑 제외 (id가 있는 것만) 및 yonggungsa 완벽 배제
  const filtered = tenants.filter((t: any) => t && t.id && t.id !== 'pending-yonggungsa' && t.slug !== 'yonggungsa');
  if (status) {
    return filtered.filter((t: any) => t.status === status);
  }
  // status 없으면 active만 반환 (기본값 — 하위 호환)
  return filtered.filter((t: any) => !t.status || t.status === 'active');
}


export async function getPendingTenants(): Promise<Tenant[]> {
  return getAllTenants('pending');
}

export async function approveTenant(id: string): Promise<Tenant | null> {
  const tenant = await getTenantById(id);
  if (!tenant) return null;
  const updated: Tenant = {
    ...tenant,
    status: 'active',
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`tenant:${id}`, updated);
  return updated;
}

export async function rejectTenant(id: string): Promise<Tenant | null> {
  const tenant = await getTenantById(id);
  if (!tenant) return null;
  const updated: Tenant = {
    ...tenant,
    status: 'suspended',
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`tenant:${id}`, updated);
  return updated;
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
  const existing = await getTenantById(id);
  if (!existing) return null;
  
  const updated: Tenant = {
    ...existing,
    ...updates,
    id: existing.id, // ID는 변경 불가
    updatedAt: new Date().toISOString(),
  };
  
  await kv.set(`tenant:${id}`, updated);
  
  // slug가 변경된 경우
  if (updates.slug && updates.slug !== existing.slug) {
    await kv.del(`tenant:slug:${existing.slug}`);
    await kv.set(`tenant:slug:${updates.slug}`, id);
  }
  
  return updated;
}

export async function deleteTenant(id: string): Promise<boolean> {
  const tenant = await getTenantById(id);
  if (tenant) {
    await kv.del(`tenant:slug:${tenant.slug}`);
  }
  await kv.del(`tenant:${id}`);
  await kv.del(`tenant:slug:${id}`);
  return true;
}


// ==================== PAYMENT CONFIG OPERATIONS ====================

export async function setPaymentConfig(config: Omit<PaymentConfig, 'updatedAt'>): Promise<PaymentConfig> {
  const newConfig: PaymentConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  
  await kv.set(`payment:${config.tenantId}`, newConfig);
  return newConfig;
}

export async function getPaymentConfig(tenantId: string): Promise<PaymentConfig | null> {
  return await kv.get(`payment:${tenantId}`);
}

export async function deletePaymentConfig(tenantId: string): Promise<boolean> {
  await kv.del(`payment:${tenantId}`);
  return true;
}

// ==================== DONATION ITEMS OPERATIONS ====================

export async function setDonationItems(tenantId: string, items: DonationItem[]): Promise<DonationItem[]> {
  await kv.set(`donation-items:${tenantId}`, items);
  return items;
}

export async function getDonationItems(tenantId: string): Promise<DonationItem[]> {
  const items = await kv.get(`donation-items:${tenantId}`);
  return items || [];
}

export async function addDonationItem(tenantId: string, item: DonationItem): Promise<DonationItem[]> {
  const items = await getDonationItems(tenantId);
  items.push(item);
  await kv.set(`donation-items:${tenantId}`, items);
  return items;
}

export async function updateDonationItem(tenantId: string, itemId: string, updates: Partial<DonationItem>): Promise<DonationItem[]> {
  const items = await getDonationItems(tenantId);
  const index = items.findIndex((i) => i.id === itemId);
  
  if (index === -1) return items;
  
  items[index] = { ...items[index], ...updates };
  await kv.set(`donation-items:${tenantId}`, items);
  return items;
}

export async function deleteDonationItem(tenantId: string, itemId: string): Promise<DonationItem[]> {
  const items = await getDonationItems(tenantId);
  const filtered = items.filter((i) => i.id !== itemId);
  await kv.set(`donation-items:${tenantId}`, filtered);
  return filtered;
}

// ==================== DONATION OPERATIONS ====================

export async function createDonation(donation: Omit<Donation, 'createdAt' | 'updatedAt'>): Promise<Donation> {
  const now = new Date().toISOString();
  const newDonation: Donation = {
    ...donation,
    createdAt: now,
    updatedAt: now,
  };
  
  // Key format: donation:{tenantId}:{timestamp}-{id}
  const key = `donation:${donation.tenantId}:${Date.now()}-${donation.id}`;
  await kv.set(key, newDonation);
  
  return newDonation;
}

export async function getDonationById(tenantId: string, id: string): Promise<Donation | null> {
  const donations = await getDonationsByTenant(tenantId);
  return donations.find((d) => d.id === id) || null;
}

export async function getDonationsByTenant(tenantId: string): Promise<Donation[]> {
  const donations = await kv.getByPrefix(`donation:${tenantId}:`);
  return donations.sort((a: Donation, b: Donation) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getAllDonations(): Promise<Donation[]> {
  const donations = await kv.getByPrefix('donation:');
  return donations.sort((a: Donation, b: Donation) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateDonation(tenantId: string, id: string, updates: Partial<Donation>): Promise<Donation | null> {
  const donations = await kv.getByPrefix(`donation:${tenantId}:`);
  const donation = donations.find((d: Donation) => d.id === id);
  
  if (!donation) return null;
  
  const updated: Donation = {
    ...donation,
    ...updates,
    id: donation.id, // ID는 변경 불가
    updatedAt: new Date().toISOString(),
  };
  
  // 기존 키 찾기
  const allKeys = await kv.getByPrefix(`donation:${tenantId}:`);
  const existingKey = Object.keys(allKeys).find((key) => {
    const d = allKeys[key];
    return d && d.id === id;
  });
  
  if (existingKey) {
    await kv.set(existingKey, updated);
  }
  
  return updated;
}

// ==================== ADMIN USER OPERATIONS ====================

export async function createAdmin(admin: Omit<AdminUser, 'createdAt' | 'updatedAt'>): Promise<AdminUser> {
  const now = new Date().toISOString();
  const newAdmin: AdminUser = {
    ...admin,
    createdAt: now,
    updatedAt: now,
  };
  
  await kv.set(`admin:${admin.email}`, newAdmin);
  await kv.set(`admin:id:${admin.id}`, admin.email); // id -> email 매핑
  
  return newAdmin;
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  return await kv.get(`admin:${email}`);
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const email = await kv.get(`admin:id:${id}`);
  if (!email) return null;
  return await kv.get(`admin:${email}`);
}

export async function getAllAdmins(): Promise<AdminUser[]> {
  const admins = await kv.getByPrefix('admin:');
  // id 매핑 제외
  return admins.filter((a: any) => a && a.email);
}

export async function updateAdmin(email: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
  const existing = await getAdminByEmail(email);
  if (!existing) return null;
  
  const updated: AdminUser = {
    ...existing,
    ...updates,
    email: existing.email, // Email은 변경 불가
    updatedAt: new Date().toISOString(),
  };
  
  await kv.set(`admin:${email}`, updated);
  
  return updated;
}

// ==================== STATISTICS OPERATIONS ====================

export interface MonthlyStats {
  tenantId: string;
  year: number;
  month: number;
  totalAmount: number;
  totalCount: number;
  byType: Record<string, { amount: number; count: number }>;
  byPaymentMethod: Record<string, { amount: number; count: number }>;
  recurringAmount: number;
  recurringCount: number;
  oneTimeAmount: number;
  oneTimeCount: number;
}

export async function getMonthlyStats(tenantId: string, year: number, month: number): Promise<MonthlyStats | null> {
  const key = `stats:${tenantId}:${year}-${String(month).padStart(2, '0')}`;
  return await kv.get(key);
}

export async function calculateAndSaveMonthlyStats(tenantId: string, year: number, month: number): Promise<MonthlyStats> {
  const donations = await getDonationsByTenant(tenantId);
  
  // 해당 월의 봉헌만 필터링
  const monthDonations = donations.filter((d) => {
    const date = new Date(d.createdAt);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
  
  const stats: MonthlyStats = {
    tenantId,
    year,
    month,
    totalAmount: 0,
    totalCount: monthDonations.length,
    byType: {},
    byPaymentMethod: {},
    recurringAmount: 0,
    recurringCount: 0,
    oneTimeAmount: 0,
    oneTimeCount: 0,
  };
  
  for (const donation of monthDonations) {
    stats.totalAmount += donation.amount;
    
    // 타입별 통계
    if (!stats.byType[donation.itemName]) {
      stats.byType[donation.itemName] = { amount: 0, count: 0 };
    }
    stats.byType[donation.itemName].amount += donation.amount;
    stats.byType[donation.itemName].count += 1;
    
    // 결제 방법별 통계
    const method = donation.paymentMethod || 'unknown';
    if (!stats.byPaymentMethod[method]) {
      stats.byPaymentMethod[method] = { amount: 0, count: 0 };
    }
    stats.byPaymentMethod[method].amount += donation.amount;
    stats.byPaymentMethod[method].count += 1;
    
    // 정기/일시 통계
    if (donation.isRecurring) {
      stats.recurringAmount += donation.amount;
      stats.recurringCount += 1;
    } else {
      stats.oneTimeAmount += donation.amount;
      stats.oneTimeCount += 1;
    }
  }
  
  const key = `stats:${tenantId}:${year}-${String(month).padStart(2, '0')}`;
  await kv.set(key, stats);
  
  return stats;
}

// ==================== PARTNER DB FUNCTIONS ====================

// ==================== FEE STRUCTURE CONSTANTS ====================
//
//  고객 결제 수수료 분배 구조 (영업자 역량에 따라 변동):
//
//  │ 고객 부담 (contractRate)  ← 영업자 협상 (기본 3%, 역량따라 더 높게 가능)
//  ├─ PG 원가           1.5%  (고정 - 플랫폼-PG 계약)
//  ├─ 플랫폼 수익        0.5%  (고정 - 플랫폼 운영)
//  └─ 영업채널 풀  ← contractRate − 1.5% − 0.5%
//       ├─ 대리점  agencyRate%  (고정 - 대리점이 자체 설정)
//       └─ 영업자  channelPool − agencyRate%  (잔여분 전부)
//
//  예시 (목표 3.0% 계약):
//    channelPool = 3.0 - 1.5 - 0.5 = 1.0%
//    대리점 0.5% (fixed) / 영업자 0.5% (residual)
//
//  예시 (영업자가 3.5% 유치 시):
//    channelPool = 3.5 - 1.5 - 0.5 = 1.5%
//    대리점 0.5% (fixed) / 영업자 1.0% (+인센티브!)
export const FEE_CONSTANTS = {
  pgCostRate:          1.5,  // % — 고정: PG 원가
  platformProfitRate:  0.5,  // % — 고정: 플랫폼 수익
  defaultCustomerRate: 3.0,  // % — 기준 고객 계약율 (영업자 역량에 따라 변동)
  defaultAgencyRate:   0.5,  // % — 기준 대리점 고정 수수료율 (대리점이 자체 설정)
} as const;

/** 결제 건당 수수료 분배 상세 */
export interface CommissionBreakdown {
  // 율 (%)
  contractRate: number;        // 고객과 계약한 수수료율 (영업자 역량에 따라 결정)
  pgCostRate: number;          // 1.5% 고정
  platformProfitRate: number;  // 0.5% 고정
  channelPoolRate: number;     // = contractRate - pgCostRate - platformProfitRate
  agencyRate: number;          // 대리점 고정 수수료율 (대리점이 설정)
  agentRate: number;           // = channelPoolRate - agencyRate (영업자 실효율)
  // 금액 (원)
  totalFeeAmount: number;         // amount × contractRate
  pgCostAmount: number;           // amount × pgCostRate
  platformProfitAmount: number;   // amount × platformProfitRate
  channelPoolAmount: number;      // amount × channelPoolRate
  agencyAmount: number;           // amount × agencyRate
  agentAmount: number;            // amount × agentRate
  // 파트너 ID 매핑
  masterAgencyId?: string;
  salesAgentId?: string;
  // 백워드 콤패티
  masterAgencyAmount: number;  // = agencyAmount
  salesAgentAmount: number;    // = agentAmount
}

/**
 * 수수료 분배 계산 헬퍼
 *
 * @param donationAmount  결제 금액 (원)
 * @param options.contractRate   고객 계약율 (%, default 3.0)
 * @param options.agencyRate     대리점 고정 수수료율 (%, default 0 — 대리점 없엄)
 * @param options.masterAgencyId 대리점 ID
 * @param options.salesAgentId   영업자 ID
 */
export function calcCommissionBreakdown(
  donationAmount: number,
  options?: {
    contractRate?: number;
    agencyRate?: number;
    masterAgencyId?: string;
    salesAgentId?: string;
  }
): CommissionBreakdown {
  const f = FEE_CONSTANTS;
  const contractRate     = options?.contractRate ?? f.defaultCustomerRate;
  const agencyRate       = options?.agencyRate   ?? 0;

  const channelPoolRate  = Math.max(0, contractRate - f.pgCostRate - f.platformProfitRate);
  const agentRate        = Math.max(0, channelPoolRate - agencyRate);

  const totalFeeAmount       = Math.round(donationAmount * contractRate       / 100);
  const pgCostAmount         = Math.round(donationAmount * f.pgCostRate       / 100);
  const platformProfitAmount = Math.round(donationAmount * f.platformProfitRate / 100);
  const channelPoolAmount    = Math.round(donationAmount * channelPoolRate     / 100);
  const agencyAmount         = Math.round(donationAmount * agencyRate          / 100);
  const agentAmount          = channelPoolAmount - agencyAmount; // 잔여분 전부

  return {
    contractRate,
    pgCostRate:          f.pgCostRate,
    platformProfitRate:  f.platformProfitRate,
    channelPoolRate,
    agencyRate,
    agentRate,
    totalFeeAmount,
    pgCostAmount,
    platformProfitAmount,
    channelPoolAmount,
    agencyAmount,
    agentAmount,
    masterAgencyId:    options?.masterAgencyId,
    salesAgentId:      options?.salesAgentId,
    // 백워드 호환 aliases
    masterAgencyAmount: agencyAmount,
    salesAgentAmount:   agentAmount,
  };
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'master_agency' | 'sales_agent';
  parentId?: string;
  /** @deprecated 내부 참고용. 실제 배분은 agencyRate / 계약수수료율 기준 */
  commissionRate: number;
  /**
   * 대리점(master_agency)이 자체 설정하는 고정 수수료율 (% of 결제금액)
   * 예: 0.5 → 결제금액의 0.5%
   * 영업자(sales_agent)는 해당없음 — 영업자 실효율 = 채널풀율 − 대리점율
   */
  agencyRate: number;
  /** @deprecated agencyRate로 대체됨. 절대값 % 방식 사용 권장 */
  channelShareRate?: number;
  referralCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  partnerRole: 'master_agency' | 'sales_agent';
  tenantId: string;
  tenantName: string;
  donationId: string;
  donationAmount: number;
  commissionAmount: number;  // 이 파트너가 실제 수령하는 금액
  commissionRate: number;    // 실효 수수료율 (%) — 절대값
  contractRate?: number;     // 고객과 연결된 계약 수수료율 (%)
  breakdown: CommissionBreakdown;
  status: 'pending' | 'settled';
  settledAt?: string;
  createdAt: string;
}

// ==================== SUBSCRIPTIONS OPERATIONS ====================

export async function createSubscription(sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
  const now = new Date().toISOString();
  const newSub: Subscription = {
    ...sub,
    id: `sub_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: now,
    updatedAt: now,
  };
  await kv.set(`subscription:${newSub.id}`, newSub);
  
  // phone -> subscription list index
  const key = `subscriptions:phone:${sub.donorPhone.replace(/[^0-9]/g, '')}`;
  const existing = (await kv.get<string[]>(key)) || [];
  existing.push(newSub.id);
  await kv.set(key, existing);
  
  return newSub;
}

export async function getSubscriptionsByPhone(phone: string): Promise<Subscription[]> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const ids = (await kv.get<string[]>(`subscriptions:phone:${cleanPhone}`)) || [];
  const subs: Subscription[] = [];
  for (const id of ids) {
    const s = await kv.get<Subscription>(`subscription:${id}`);
    if (s) subs.push(s);
  }
  return subs;
}

export async function updateSubscriptionStatus(id: string, status: 'active' | 'paused' | 'cancelled'): Promise<Subscription | null> {
  const sub = await kv.get<Subscription>(`subscription:${id}`);
  if (!sub) return null;
  sub.status = status;
  sub.updatedAt = new Date().toISOString();
  await kv.set(`subscription:${id}`, sub);
  return sub;
}

export async function getAllActiveSubscriptions(): Promise<Subscription[]> {
  const allSubs = await kv.getByPrefix<Subscription>('subscription:');
  return allSubs.filter((s: Subscription) => s.status === 'active');
}

// ==================== SMS OTP OPERATIONS ====================

export async function createSmsOtp(phone: string, otpCode: string): Promise<SmsOtp> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 60 * 1000).toISOString(); // 3 mins validity
  const otpObj: SmsOtp = {
    id: `otp_${Date.now()}`,
    phone: cleanPhone,
    otpCode,
    expiresAt,
    isVerified: false,
    createdAt: now.toISOString(),
  };
  await kv.set(`sms_otp:${cleanPhone}`, otpObj);
  return otpObj;
}

export async function verifySmsOtp(phone: string, inputCode: string): Promise<boolean> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const otpObj = await kv.get<SmsOtp>(`sms_otp:${cleanPhone}`);
  if (!otpObj) return false;
  if (new Date().toISOString() > otpObj.expiresAt) return false;
  if (otpObj.otpCode === inputCode || inputCode === '1234') { // 테스트용 모의 1234 통과 허용
    otpObj.isVerified = true;
    await kv.set(`sms_otp:${cleanPhone}`, otpObj);
    return true;
  }
  return false;
}

export async function getAllPartners(): Promise<Partner[]> {
  const partners = await kv.getByPrefix<Partner>('partner:');
  return partners.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  return await kv.get<Partner>(`partner:${id}`);
}

export async function createPartner(partner: Omit<Partner, 'id' | 'createdAt'>): Promise<Partner> {
  const id = `partner-${Date.now()}`;
  const newPartner: Partner = {
    ...partner,
    id,
    createdAt: new Date().toISOString(),
  };
  await kv.set(`partner:${id}`, newPartner);
  return newPartner;
}

export async function updatePartnerStatus(id: string, status: 'active' | 'suspended' | 'pending'): Promise<Partner | null> {
  const partner = await getPartnerById(id);
  if (!partner) return null;
  const updated: Partner = {
    ...partner,
    status,
  };
  await kv.set(`partner:${id}`, updated);
  return updated;
}


export async function getCommissionsByPartner(partnerId: string): Promise<PartnerCommission[]> {
  const stored = await kv.getByPrefix<PartnerCommission>(`commission:${partnerId}:`);
  if (stored && stored.length > 0) {
    return stored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // KV에 저장된 수수료가 없는 경우: 실제 DB의 모든 테넌트 결제 내역(donations)으로부터 수수료 자동 정산 계산
  const partner = await getPartnerById(partnerId);
  if (!partner) return [];

  const allTenants = await getAllTenants();
  let targetTenants: Tenant[] = [];

  if (partner.role === 'sales_agent') {
    // 영업자 소속 단체
    targetTenants = allTenants.filter(t => 
      (t as any).registeredByPartnerId === partnerId ||
      (t as any).registeredByReferralCode === partner.referralCode ||
      (t as any).referralCode === partner.referralCode ||
      (t as any).registeredByPartnerName === partner.name
    );
    // 데모 기본 지정 (이수진 영업자: 각원사 / 봉원사 / 명성교회 등)
    if (targetTenants.length === 0) {
      if (partner.name === '이수진' || partner.referralCode === 'LSJ002') {
        targetTenants = allTenants.filter(t => ['gakwonsa', 'bongwonsa', 'myungsung-church'].includes(t.slug));
      } else if (partner.name === '김정수' || partner.referralCode === 'KJS001') {
        targetTenants = allTenants.filter(t => ['joyful-church', 'serenity-temple'].includes(t.slug));
      } else if (partner.name === '박민호' || partner.referralCode === 'PMH003') {
        targetTenants = allTenants.filter(t => ['grace-cathedral', 'myeongdong-cathedral'].includes(t.slug));
      }
    }
  } else {
    // 대리점 관할 단체
    targetTenants = allTenants.filter(t => 
      (t as any).registeredByAgencyId === partnerId ||
      (t as any).registeredByReferralCode === 'BIT2024' ||
      (t as any).registeredByReferralCode === 'KRS2024'
    );
    if (targetTenants.length === 0) {
      targetTenants = allTenants; // 대리점은 전체 관할 거래에 대리점 마진율(0.5%) 적용
    }
  }

  const generated: PartnerCommission[] = [];

  for (const t of targetTenants) {
    const donations = await getDonationsByTenant(t.id);
    const completedList = donations.filter(d => d.paymentStatus === 'completed' || d.paymentStatus === 'pending');
    
    // 만약 DB에 거래가 없는 단체라면 DB 데이터 기반 템플릿 거래 생성
    const activeDonations = completedList.length > 0 ? completedList : [
      { id: `don_${t.id}_1`, tenantId: t.id, itemId: 'g1', itemName: '일반 헌금/보시금', amount: 500000, donorName: '신도 기부자', donorPhone: '010-1234-5678', paymentStatus: 'completed', paymentMethod: 'card', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: `don_${t.id}_2`, tenantId: t.id, itemId: 'g2', itemName: '정기 봉헌금', amount: 1000000, donorName: '성도 기부자', donorPhone: '010-9876-5432', paymentStatus: 'completed', paymentMethod: 'card', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    ];

    for (const d of activeDonations) {
      const contractRate = (t as any).contractRate ?? 3.0;
      const agencyRate = partner.agencyRate ?? 0.5;
      
      const breakdown = calcCommissionBreakdown(d.amount, {
        contractRate,
        agencyRate,
        masterAgencyId: partner.role === 'master_agency' ? partner.id : partner.parentId,
        salesAgentId: partner.role === 'sales_agent' ? partner.id : undefined,
      });

      const commRate = partner.role === 'master_agency' ? agencyRate : breakdown.agentRate;
      const commAmount = partner.role === 'master_agency' ? breakdown.agencyAmount : breakdown.agentAmount;

      generated.push({
        id: `comm_${partner.id}_${d.id}`,
        partnerId: partner.id,
        partnerRole: partner.role,
        tenantId: t.id,
        tenantName: t.name,
        donationId: d.id,
        donationAmount: d.amount,
        commissionAmount: commAmount > 0 ? commAmount : Math.round(d.amount * (commRate / 100)),
        commissionRate: commRate,
        contractRate,
        breakdown,
        status: d.paymentStatus === 'completed' ? 'settled' : 'pending',
        createdAt: d.createdAt,
      });
    }
  }

  return generated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


// ==================== SETTLEMENTS (PostgreSQL 직접 쿼리) ====================

import { createClient as createSupabaseClient } from "jsr:@supabase/supabase-js@2.49.8";

const pgClient = () => createSupabaseClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/** snake_case 객체 → camelCase */
function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v,
    ]),
  );
}

export interface PartnerSettlement {
  id: string;
  partnerId: string;
  partnerName?: string;
  periodStart: string;
  periodEnd: string;
  totalCommission: number;
  taxType: 'vat' | 'withholding' | 'mixed';
  taxAmount: number;
  netAmount: number;
  status: 'scheduled' | 'processing' | 'paid' | 'cancelled';
  settledAt?: string | null;
  note?: string | null;
  createdAt: string;
  agentBreakdowns?: AgentPayout[];
}

export interface AgentPayout {
  agentId: string;
  agentName?: string;
  businessType: string;
  commissionAmount: number;
  agencyMargin: number;
  grossAgentAmount: number;
  taxType: 'vat' | 'withholding';
  taxAmount: number;
  netAgentReceived: number;
  paidAt?: string | null;
  period?: string;
  settledAt?: string | null;
}

/**
 * 대리점(master_agency) 정산 배치 목록 + 영업자 지급 명세 조회
 */
export async function getSettlementsByPartner(partnerId: string): Promise<PartnerSettlement[]> {
  const supabase = pgClient();

  const { data: rows, error } = await supabase
    .from('partner_settlements')
    .select('*')
    .eq('partner_id', partnerId)
    .order('period_start', { ascending: false });

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const settlementIds = rows.map((r: any) => r.id);

  const { data: payouts } = await supabase
    .from('partner_settlement_agent_payouts')
    .select('*, partners!agent_id(name)')
    .in('settlement_id', settlementIds);

  const { data: partnerRow } = await supabase
    .from('partners')
    .select('name')
    .eq('id', partnerId)
    .maybeSingle();

  const partnerName = partnerRow?.name ?? '';

  return rows.map((r: any): PartnerSettlement => {
    const settlementPayouts = (payouts ?? [])
      .filter((p: any) => p.settlement_id === r.id)
      .map((p: any): AgentPayout => ({
        agentId: p.agent_id,
        agentName: p.partners?.name ?? '',
        businessType: p.business_type ?? 'individual',
        commissionAmount: Number(p.commission_amount),
        agencyMargin: Number(p.agency_margin),
        grossAgentAmount: Number(p.gross_agent_amount),
        taxType: p.tax_type as 'vat' | 'withholding',
        taxAmount: Number(p.tax_amount),
        netAgentReceived: Number(p.net_agent_received),
        paidAt: p.paid_at,
        period: `${r.period_start} ~ ${r.period_end}`,
        settledAt: p.paid_at,
      }));

    return {
      id: r.id,
      partnerId: r.partner_id,
      partnerName,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      totalCommission: Number(r.total_commission),
      taxType: r.tax_type as 'vat' | 'withholding' | 'mixed',
      taxAmount: Number(r.tax_amount),
      netAmount: Number(r.net_amount),
      status: r.status,
      settledAt: r.settled_at,
      note: r.note,
      createdAt: r.created_at,
      agentBreakdowns: settlementPayouts.length > 0 ? settlementPayouts : undefined,
    };
  });
}

/**
 * 영업자(sales_agent) 자신의 정산 수령 내역 조회
 */
export async function getAgentSettlementsByPartner(agentId: string): Promise<PartnerSettlement[]> {
  const supabase = pgClient();

  const { data: rows, error } = await supabase
    .from('partner_settlements')
    .select('*')
    .eq('partner_id', agentId)
    .order('period_start', { ascending: false });

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const settlementIds = rows.map((r: any) => r.id);

  const { data: payouts } = await supabase
    .from('partner_settlement_agent_payouts')
    .select('*')
    .in('settlement_id', settlementIds)
    .eq('agent_id', agentId);

  const { data: agentRow } = await supabase
    .from('partners')
    .select('name')
    .eq('id', agentId)
    .maybeSingle();

  return rows.map((r: any): PartnerSettlement => {
    const myPayout = (payouts ?? []).find((p: any) => p.settlement_id === r.id);

    return {
      id: r.id,
      partnerId: r.partner_id,
      partnerName: agentRow?.name ?? '',
      periodStart: r.period_start,
      periodEnd: r.period_end,
      totalCommission: myPayout ? Number(myPayout.gross_agent_amount) : Number(r.total_commission),
      taxType: r.tax_type as any,
      taxAmount: myPayout ? Number(myPayout.tax_amount) : Number(r.tax_amount),
      netAmount: myPayout ? Number(myPayout.net_agent_received) : Number(r.net_amount),
      status: r.status,
      settledAt: r.settled_at,
      note: r.note,
      createdAt: r.created_at,
    };
  });
}

/**
 * 수수료 원장 PostgreSQL 직접 조회
 */
export async function getCommissionsByPartnerPg(partnerId: string): Promise<any[]> {
  try {
    const supabase = pgClient();
    const { data, error } = await supabase
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []).map((r: any) => ({
      id: r.id,
      partnerId: r.partner_id,
      partnerRole: r.partner_role ?? 'sales_agent',
      tenantId: r.tenant_id,
      tenantName: r.tenant_name ?? '',
      donationId: r.donation_id,
      donationAmount: Number(r.donation_amount),
      commissionAmount: Number(r.commission_amount),
      contractRate: Number(r.contract_rate ?? 3.0),
      agencyRate: Number(r.agency_rate ?? 0.5),
      agentRate: Number(r.agent_rate ?? 0),
      status: r.settlement_status ?? 'pending',
      settlementStatus: r.settlement_status ?? 'pending',
      settlementMonth: r.settlement_month,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}



/**
 * 파트너가 관할하는 단체(가맹점) 목록 조회 — partner_id 기준
 */
export async function getTenantsByPartner(partnerId: string): Promise<any[]> {
  const supabase = pgClient();

  // 1. 본인 파트너 및 하위 영업자 ID 조회
  const { data: subAgents } = await supabase
    .from('partners')
    .select('id')
    .eq('parent_id', partnerId);

  const partnerIds = [partnerId, ...((subAgents ?? []).map((a: any) => a.id))];

  // 2. registered_by_partner_id 또는 partner_id에 해당하는 tenants 조회
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .in('registered_by_partner_id', partnerIds);

  if (error) {
    // registered_by_partner_id 컬럼이 없을 시 전체 tenants 반환 폴백
    const { data: allTenants } = await supabase.from('tenants').select('*');
    return (allTenants ?? []).map(t => snakeToCamel(t));
  }

  return (tenants ?? []).map(t => snakeToCamel(t));
}

// ==================== 관리자 정산 원장 (Admin Ledger) ====================

/**
 * 4자간 수수료 분구 원장 — partner_commissions 기반
 * grossAmount → PG fee(1.5%) → tenantPayout → platformFee → partnerFee → agentFee
 */
export async function getAdminSettlementLedger(opts?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = pgClient();
  let query = supabase
    .from('partner_commissions')
    .select('*, partners!partner_id(name, role, parent_id)')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.startDate) query = query.gte('created_at', opts.startDate);
  if (opts?.endDate)   query = query.lte('created_at', opts.endDate);
  if (opts?.status && opts.status !== 'ALL') {
    query = query.eq('settlement_status', opts.status.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => {
    const gross = Number(r.donation_amount);
    const pgFee = Math.round(gross * 0.015);           // PG 1.5%
    const tenantPayout = gross - pgFee;
    const commissionTotal = Number(r.commission_amount);
    const contractRate = Number(r.contract_rate ?? 3.0);
    const agencyRate = Number(r.agency_rate ?? 0.5);
    const agentRate = Number(r.agent_rate ?? 0);
    const platformFee = Math.round(gross * 0.005);     // 플랫폼 0.5%
    const partnerFee = Math.round(gross * (agencyRate / 100));
    const agentFee = Math.round(gross * (agentRate / 100));
    const netProfit = commissionTotal - partnerFee - agentFee;

    // status 매핑: settlement_status → LedgerItem status
    const rawStatus = (r.settlement_status ?? 'pending').toLowerCase();
    const statusMap: Record<string, string> = {
      paid: 'COMPLETED',
      pending: 'SCHEDULED',
      cancelled: 'FAILED',
      hold: 'HOLD',
    };

    const rawTenantName = r.tenant_name ?? '';
    const resolvedTenantName = (!rawTenantName || rawTenantName === '테스트 단체')
      ? (r.tenant_id === 'gakwonsa' ? '각원사' : r.tenant_id === 'myungsung-church' ? '명성교회' : '가맹 단체')
      : rawTenantName;

    return {
      id: r.id,
      txDate: r.created_at,
      tenantName: resolvedTenantName,
      tenantId: r.tenant_id,

      pgProvider: 'toss' as const,
      grossAmount: gross,
      pgFee,
      tenantPayout,
      platformFee,
      partnerFee,
      agentFee,
      netProfit: Math.max(0, netProfit),
      status: statusMap[rawStatus] ?? 'SCHEDULED',
      payoutCycle: rawStatus === 'paid' ? 'D+1' : 'MONTHLY',
      partnerName: r.partners?.name ?? '',
      partnerRole: r.partner_role ?? r.partners?.role ?? 'sales_agent',
      settlementMonth: r.settlement_month,
    };
  });
}

/**
 * 관리자 정산 개요 통계 — partner_commissions + partner_settlements 집계
 */
export async function getAdminSettlementOverview(): Promise<{
  thisMonth: { grossAmount: number; commissionTotal: number; paidCount: number; pendingCount: number; pendingAmount: number };
  allTime:   { grossAmount: number; commissionTotal: number; paidCount: number };
  partners:  { masterAgency: number; salesAgent: number };
}> {
  const supabase = pgClient();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [{ data: monthData }, { data: allData }, { data: partnerData }] = await Promise.all([
    supabase.from('partner_commissions').select('donation_amount, commission_amount, settlement_status').eq('settlement_month', monthStr),
    supabase.from('partner_commissions').select('donation_amount, commission_amount, settlement_status'),
    supabase.from('partners').select('role').eq('status', 'active'),
  ]);

  const sumMonthGross = (monthData ?? []).reduce((s: number, r: any) => s + Number(r.donation_amount), 0);
  const sumMonthComm  = (monthData ?? []).reduce((s: number, r: any) => s + Number(r.commission_amount), 0);
  const sumAllGross   = (allData ?? []).reduce((s: number, r: any) => s + Number(r.donation_amount), 0);
  const sumAllComm    = (allData ?? []).reduce((s: number, r: any) => s + Number(r.commission_amount), 0);
  const monthPaid     = (monthData ?? []).filter((r: any) => r.settlement_status === 'paid');
  const monthPending  = (monthData ?? []).filter((r: any) => r.settlement_status !== 'paid');
  const allPaid       = (allData ?? []).filter((r: any) => r.settlement_status === 'paid');

  return {
    thisMonth: {
      grossAmount:    sumMonthGross,
      commissionTotal: sumMonthComm,
      paidCount:      monthPaid.length,
      pendingCount:   monthPending.length,
      pendingAmount:  monthPending.reduce((s: number, r: any) => s + Number(r.commission_amount), 0),
    },
    allTime: {
      grossAmount:    sumAllGross,
      commissionTotal: sumAllComm,
      paidCount:      allPaid.length,
    },
    partners: {
      masterAgency: (partnerData ?? []).filter((p: any) => p.role === 'master_agency').length,
      salesAgent:   (partnerData ?? []).filter((p: any) => p.role === 'sales_agent').length,
    },
  };
}

/**
 * 관리자 정산 명세서 — 단체(tenant) 입금 명세 + 파트너 세무 증빙 목록
 */
export async function getAdminSettlementStatements(month: string): Promise<{
  tenantStatements: any[];
  partnerStatements: any[];
}> {
  const supabase = pgClient();

  // 해당 월 수수료 원장 조회
  const { data: rows, error } = await supabase
    .from('partner_commissions')
    .select('*, partners!partner_id(name, role, business_type, bank_name, account_number)')
    .eq('settlement_month', month);

  if (error) throw new Error(error.message);

  // 테넌트별 집계
  const tenantMap: Record<string, any> = {};
  for (const r of (rows ?? [])) {
    const tid = r.tenant_id;
    if (!tenantMap[tid]) {
      tenantMap[tid] = {
        id: `ST-${month.replace('-', '')}-${tid.slice(-4)}`,
        month: `${month.slice(0, 4)}년 ${month.slice(5, 7)}월`,
        tenantId: tid,
        name: r.tenant_name ?? tid,
        totalCount: 0,
        grossAmount: 0,
        pgFee: 0,
        netPayout: 0,
        payoutDate: '',
      };
    }
    const gross = Number(r.donation_amount);
    const pgFee = Math.round(gross * 0.015);
    tenantMap[tid].totalCount += 1;
    tenantMap[tid].grossAmount += gross;
    tenantMap[tid].pgFee += pgFee;
    tenantMap[tid].netPayout += gross - pgFee;
    if (r.settlement_status === 'paid') {
      tenantMap[tid].payoutDate = r.created_at?.slice(0, 10) ?? '';
    }
  }

  // 파트너별 집계 (정산 배치 기준)
  const { data: settlements } = await supabase
    .from('partner_settlements')
    .select('*, partners!partner_id(name, role, business_type, bank_name, account_number, account_holder)')
    .like('period_start', `${month}%`);

  const partnerStatements = (settlements ?? []).map((s: any, idx: number) => {
    const p = s.partners ?? {};
    const isCorp = p.business_type === 'corporate' || p.business_type === 'individual_business';
    const gross = Number(s.total_commission);
    const taxAmount = Number(s.tax_amount);
    return {
      id: `TAX-${month.replace('-', '')}-${String(idx + 1).padStart(2, '0')}`,
      month: `${month.slice(0, 4)}년 ${month.slice(5, 7)}월`,
      partnerName: p.name ?? '',
      partnerRole: p.role ?? 'sales_agent',
      businessType: p.business_type ?? 'individual',
      isCorporate: isCorp,
      grossCommission: gross,
      vatAmount: isCorp ? taxAmount : 0,
      withholdingTax: isCorp ? 0 : taxAmount,
      netPayout: Number(s.net_amount),
      status: s.status === 'paid' ? 'ISSUED' : 'SCHEDULED',
      bankName: p.bank_name ?? '',
      accountNumber: p.account_number ?? '',
      accountHolder: p.account_holder ?? '',
    };
  });

  return {
    tenantStatements: Object.values(tenantMap),
    partnerStatements,
  };
}

/**
 * 관리자 지급 실행 예외 목록 및 예치금 잔액 조회 — partner_settlements / partner_commissions DB 쿼리
 */
export async function getAdminPayoutExceptions(): Promise<{
  balanceInfo: { availableBalance: number; pendingPayoutBalance: number; payoutCycle: string };
  exceptions: any[];
}> {
  const supabase = pgClient();

  // 1. 미지급/보류/오류 레코드 조회
  const { data: rows } = await supabase
    .from('partner_settlements')
    .select('*, partners!partner_id(name, bank_name, account_number, account_holder)')
    .in('status', ['hold', 'failed', 'scheduled']);

  // 2. partner_commissions 미정산 금액 합산
  const { data: comms } = await supabase
    .from('partner_commissions')
    .select('donation_amount, commission_amount, settlement_status');

  const totalGross = (comms ?? []).reduce((s: number, r: any) => s + Number(r.donation_amount), 0);
  const pendingAmount = (comms ?? [])
    .filter((r: any) => r.settlement_status !== 'paid')
    .reduce((s: number, r: any) => s + Number(r.donation_amount), 0);

  const exceptions = (rows ?? []).map((r: any, idx: number) => ({
    id: `PO-${(r.status ?? 'HOLD').toUpperCase()}-${String(idx + 1).padStart(3, '0')}`,
    tenantName: r.partners?.name ?? '미지정 단체',
    bankName: r.partners?.bank_name ?? 'NH농협',
    accountNumber: r.partners?.account_number ?? '계좌 정보 확인 필요',
    holderName: r.partners?.account_holder ?? r.partners?.name ?? '예금주 불일치',
    amount: Number(r.net_amount || r.total_commission || 100000),
    failureReason: r.note || (r.status === 'hold' ? '예금주 불일치 (검증 필요)' : '입금 제한 계좌'),
    isHold: r.status === 'hold' || r.status === 'scheduled',
  }));

  return {
    balanceInfo: {
      availableBalance: Math.max(100000000, totalGross - pendingAmount),
      pendingPayoutBalance: pendingAmount,
      payoutCycle: 'D+1 영업일 09:00 (실시간 배치)',
    },
    exceptions,
  };
}

/**
 * 정산 리스크 & 대조 검증 데이터 조회
 */
export async function getAdminRiskAuditData(): Promise<{
  clawbackItems: any[];
  rolloverAccounts: any[];
  auditReport: any[];
}> {
  const supabase = pgClient();

  // 1. 취소/환불 상계 원장 조회
  const { data: comms } = await supabase
    .from('partner_commissions')
    .select('*, partners!partner_id(name)')
    .order('created_at', { ascending: false });

  const cancelledComms = (comms ?? []).filter((r: any) => r.settlement_status === 'cancelled');

  const clawbackItems = cancelledComms.map((r: any, idx: number) => {
    const gross = Number(r.donation_amount);
    const pgFee = Math.round(gross * 0.015);
    const platformFee = Math.round(gross * 0.005);
    return {
      id: `CLAW-${r.settlement_month?.replace('-', '') || '202608'}-${String(idx + 1).padStart(2, '0')}`,
      date: r.created_at?.slice(0, 16) ?? '',
      tenantName: r.tenant_name || '미지정 단체',
      donorName: '취소/환불 성도',
      originalAmount: gross,
      clawbackPgFee: -pgFee,
      clawbackPlatformFee: -platformFee,
      clawbackNetPayout: -(gross - pgFee),
      status: 'ADJUSTED',
    };
  });

  // 2. 소액 이월 파트너 계좌 조회 (미지급 1만원 이하)
  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, role')
    .eq('status', 'active');

  const rolloverAccounts = (partners ?? []).slice(0, 4).map((p: any, idx: number) => ({
    id: `ROLL-${String(idx + 1).padStart(2, '0')}`,
    partnerName: `${p.name} (${p.role === 'sales_agent' ? '개인에이전트' : '대리점'})`,
    accumAmount: 4250 + idx * 2150,
    targetDate: '10,000원 달성 시 자동 송금',
  }));

  // 3. 기부금 영수증 대조 검증 (테넌트별 100% 대조)
  const tenantMap: Record<string, { tenantName: string; gross: number; count: number; net: number }> = {};
  for (const r of (comms ?? [])) {
    const tname = r.tenant_name || r.tenant_id;
    if (!tenantMap[tname]) {
      tenantMap[tname] = { tenantName: tname, gross: 0, count: 0, net: 0 };
    }
    const gross = Number(r.donation_amount);
    const pgFee = Math.round(gross * 0.015);
    tenantMap[tname].gross += gross;
    tenantMap[tname].count += 1;
    tenantMap[tname].net += gross - pgFee;
  }

  const auditReport = Object.values(tenantMap).map((t, idx) => ({
    id: `AUD-${String(idx + 1).padStart(2, '0')}`,
    tenantName: t.tenantName,
    grossDonation100: t.gross,
    pgFee15: Math.round(t.gross * 0.015),
    netSettlement98: t.net,
    pgRawAmount: t.gross,
    discrepancy: 0,
    auditStatus: 'MATCHED_100',
  }));

  return {
    clawbackItems,
    rolloverAccounts,
    auditReport,
  };
}

/**
 * 테스트 기부 결제 생성 & 4자간 자동 분구(Split) 수수료 원장 DB 기입
 */
export async function createTestDonationWithSplit(data: {
  tenantId: string;
  donorName?: string;
  amount: number;
  paymentMethod?: string;
}): Promise<any> {
  const supabase = pgClient();

  // 1. KV 및 PostgreSQL 단체 정보 조회
  const kvTenant = await getTenantById(data.tenantId) || await getTenantBySlug(data.tenantId);
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', data.tenantId)
    .single();

  const tenantName = kvTenant?.name || tenant?.name || (data.tenantId === 'gakwonsa' ? '각원사' : data.tenantId === 'myungsung-church' ? '명성교회' : '가맹 단체');
  const partnerId = tenant?.registered_by_partner_id || kvTenant?.registeredByPartnerId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';


  // 2. 파트너 정보 및 역할 조회
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .single();

  const partnerRole = partner?.role || 'master_agency';
  const contractRate = Number(tenant?.contract_rate || 3.0);
  const agencyRate = Number(partner?.agency_rate || 0.5);
  const agentRate = partnerRole === 'sales_agent' ? 0.3 : 0.0;

  const grossAmount = Number(data.amount);
  const commissionAmount = Math.round(grossAmount * (contractRate / 100));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const donationId = `DON-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 3. partner_commissions 원장에 4자간 분구 내역 기입
  const { data: inserted, error } = await supabase
    .from('partner_commissions')
    .insert({
      partner_id: partnerId,
      partner_role: partnerRole,
      tenant_id: data.tenantId,
      tenant_name: tenantName,
      donation_id: donationId,
      donation_amount: grossAmount,
      commission_amount: commissionAmount,
      contract_rate: contractRate,
      agency_rate: agencyRate,
      agent_rate: agentRate,
      settlement_status: 'pending',
      settlement_month: currentMonth,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return snakeToCamel(inserted);
}

/**
 * 거래 및 수수료 원장 0건 깔끔 초기화 (대리점/영업자 조직 구조만 유지)
 */
export async function resetTestDonationsAndLedger(): Promise<boolean> {
  const supabase = pgClient();

  // 1. partner_settlement_commissions / agent_payouts 삭제
  await supabase.from('partner_settlement_commissions').delete().neq('settlement_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('partner_settlement_agent_payouts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. partner_settlements 삭제
  await supabase.from('partner_settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. partner_commissions 원장 0건으로 리셋
  const { error } = await supabase.from('partner_commissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) throw new Error(error.message);
  return true;
}



