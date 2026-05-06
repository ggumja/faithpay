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
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfig {
  tenantId: string;
  pgProvider: string;
  apiKey: string;
  secretKey: string;
  mid: string;
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

export async function getAllTenants(): Promise<Tenant[]> {
  const tenants = await kv.getByPrefix('tenant:');
  // slug 매핑 제외
  return tenants.filter((t: any) => t && t.id);
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
  if (!tenant) return false;
  
  await kv.del(`tenant:${id}`);
  await kv.del(`tenant:slug:${tenant.slug}`);
  
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
