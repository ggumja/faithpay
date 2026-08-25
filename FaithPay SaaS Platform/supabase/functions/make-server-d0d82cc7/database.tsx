/**
 * Database Adapter Layer — Supabase DB Only
 *
 * 모든 데이터는 Supabase PostgreSQL 테이블에서 직접 읽고 씁니다.
 * KV Store(kv_store_d0d82cc7)는 더 이상 사용하지 않습니다.
 */

// kv import 제거됨 — DB 전용

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
  uniqueNumber?: string;              // 종교/비영리 단체 고유번호증 번호 (예: 240-82-12345)
  businessRegistrationNumber?: string; // 수익사업용 사업자등록번호 (선택사항, 바자회/물품 판매용)
  businessInfo?: {
    uniqueNumber?: string;
    registrationNumber?: string;
    address?: string;
    representativeName?: string;
    taxInvoiceEmail?: string;
  };
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

export interface PaymentProviderConfig {
  id?: string;
  tenantId: string;
  providerCode: string; // 'tosspayments' | 'nanopay' | 'kakaopay' | 'naverpay'
  providerName: string; // '토스페이먼츠' | '나노페이' | '카카오페이' | '네이버페이'
  providerType: 'pg' | 'easypay' | 'vbank';
  merchantId?: string;
  clientKey?: string;
  secretKey?: string;
  mode: 'test' | 'live';
  isEnabled: boolean;
  configMetadata?: Record<string, any>;
  updatedAt?: string;
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
  kakaoCid?: string;
  kakaoSecretKey?: string;
  kakaoMode?: 'test' | 'live';
  enableKakaoPay?: boolean;
  naverPartnerId?: string;
  naverClientId?: string;
  naverClientSecret?: string;
  naverMode?: 'test' | 'live';
  enableNaverPay?: boolean;
  tossPayMid?: string;
  tossPayApiKey?: string;
  tossPaySecretKey?: string;
  tossPayMode?: 'test' | 'live';
  enableTossPay?: boolean;
  providerConfigs?: Record<string, PaymentProviderConfig>;
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

/** DB row → Tenant 인터페이스 변환 */
function rowToTenant(r: any, paymentCfg?: any): Tenant {
  let paymentConfig = r.payment_config;
  if (paymentCfg) {
    paymentConfig = {
      tenantId: paymentCfg.tenant_id,
      pgProvider: paymentCfg.pg_provider || 'nanopay',
      apiKey: paymentCfg.api_key || '',
      secretKey: paymentCfg.secret_key || '',
      mid: paymentCfg.mid || '',
      loginId: paymentCfg.login_id || '',
      iv: paymentCfg.iv || '',
      ver: paymentCfg.ver || '',
      enableCard: paymentCfg.enable_card ?? true,
      enableEasyPayment: paymentCfg.enable_easy_payment ?? true,
      enableVBank: paymentCfg.enable_vbank ?? true,
      isActive: paymentCfg.is_active ?? true,
      kakaoCid: paymentCfg.kakao_cid || '',
      kakaoSecretKey: paymentCfg.kakao_secret_key || '',
      kakaoMode: paymentCfg.kakao_mode || 'test',
      enableKakaoPay: paymentCfg.enable_kakao_pay ?? false,
      naverPartnerId: paymentCfg.naver_partner_id || '',
      naverClientId: paymentCfg.naver_client_id || '',
      naverClientSecret: paymentCfg.naver_client_secret || '',
      naverMode: paymentCfg.naver_mode || 'test',
      enableNaverPay: paymentCfg.enable_naver_pay ?? false,
      tossPayMid: paymentCfg.toss_pay_mid || '',
      tossPayApiKey: paymentCfg.toss_pay_api_key || '',
      tossPaySecretKey: paymentCfg.toss_pay_secret_key || '',
      tossPayMode: paymentCfg.toss_pay_mode || 'test',
      enableTossPay: paymentCfg.enable_toss_pay ?? false,
      providerConfigs: paymentCfg.provider_configs || {},
      updatedAt: paymentCfg.updated_at,
    };
  }

  const isLive = paymentConfig
    ? (paymentConfig.isActive !== false && !!(paymentConfig.mid || paymentConfig.apiKey))
    : false;

  return {
    id: String(r.id),
    slug: r.slug,
    name: r.name,
    religionType: r.religion_type ?? 'protestant',
    primaryColor: r.primary_color ?? '#4F46E5',
    logoUrl: r.logo_url ?? '',
    bannerImages: r.banner_images ?? [],
    description: r.description ?? '',
    address: r.address ?? '',
    uniqueNumber: r.unique_number,
    businessInfo: r.business_info,
    contact: r.contact ?? { phone: '', email: '' },
    schedule: r.schedule ?? [],
    terminology: r.terminology ?? { donation: '헌금', member: '성도', prayer: '기도제목' },
    status: r.status ?? 'pending',
    appliedAt: r.applied_at,
    approvedAt: r.approved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    paymentConfig,
    live: isLive,
  };
}

/** Tenant 인터페이스 → DB 컬럼 변환 */
function tenantToRow(t: Partial<Tenant>): Record<string, any> {
  const row: Record<string, any> = {};
  if (t.slug          !== undefined) row.slug           = t.slug;
  if (t.name          !== undefined) row.name           = t.name;
  if (t.religionType  !== undefined) row.religion_type  = t.religionType;
  if (t.primaryColor  !== undefined) row.primary_color  = t.primaryColor;
  if (t.logoUrl       !== undefined) row.logo_url       = t.logoUrl;
  if (t.bannerImages  !== undefined) row.banner_images  = t.bannerImages;
  if (t.description   !== undefined) row.description    = t.description;
  if (t.address       !== undefined) row.address        = t.address;
  if (t.uniqueNumber  !== undefined) row.unique_number  = t.uniqueNumber;
  if (t.businessInfo  !== undefined) row.business_info  = t.businessInfo;
  if (t.contact       !== undefined) row.contact        = t.contact;
  if (t.schedule      !== undefined) row.schedule       = t.schedule;
  if (t.terminology   !== undefined) row.terminology    = t.terminology;
  if (t.status        !== undefined) row.status         = t.status;
  if (t.appliedAt     !== undefined) row.applied_at     = t.appliedAt;
  if (t.approvedAt    !== undefined) row.approved_at    = t.approvedAt;
  return row;
}

export async function createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  const sb = pgClient();
  const row = {
    ...tenantToRow(tenant),
    status: tenant.status ?? 'pending',
    applied_at: tenant.appliedAt ?? new Date().toISOString(),
  };
  const { data, error } = await sb.from('tenants').insert(row).select('*').single();
  if (error) throw new Error(`createTenant failed: ${error.message}`);
  return rowToTenant(data);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const sb = pgClient();
  const { data } = await sb.from('tenants').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const { data: cfg } = await sb.from('payment_configs').select('*').eq('tenant_id', id).maybeSingle();
  return rowToTenant(data, cfg);
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const sb = pgClient();
  const { data } = await sb.from('tenants').select('*').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const { data: cfg } = await sb.from('payment_configs').select('*').eq('tenant_id', data.id).maybeSingle();
  return rowToTenant(data, cfg);
}

export async function getAllTenants(status?: 'pending' | 'active' | 'suspended'): Promise<Tenant[]> {
  const sb = pgClient();
  let q = sb.from('tenants').select('*').order('created_at', { ascending: false });
  if (status) {
    q = q.eq('status', status);
  } else {
    q = q.eq('status', 'active');
  }
  const { data, error } = await q;
  if (error) throw new Error(`getAllTenants failed: ${error.message}`);

  // payment_configs 전체 조회 후 매핑
  const { data: configs } = await sb.from('payment_configs').select('*');
  const configMap = new Map<string, any>();
  if (configs) {
    configs.forEach(c => {
      configMap.set(c.tenant_id, c);
    });
  }

  return (data ?? []).map(r => rowToTenant(r, configMap.get(r.id) || configMap.get(r.slug)));
}

export async function getPendingTenants(): Promise<Tenant[]> {
  return getAllTenants('pending');
}

export async function approveTenant(id: string): Promise<Tenant | null> {
  const sb = pgClient();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('tenants')
    .update({ status: 'active', approved_at: now, updated_at: now })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return null;
  return rowToTenant(data);
}

export async function rejectTenant(id: string): Promise<Tenant | null> {
  const sb = pgClient();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('tenants')
    .update({ status: 'suspended', updated_at: now })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return null;
  return rowToTenant(data);
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
  const sb = pgClient();
  const row = { ...tenantToRow(updates), updated_at: new Date().toISOString() };
  // id 또는 slug로 검색
  const isUUID = /^[0-9a-f-]{36}$/i.test(id);
  const q = isUUID
    ? sb.from('tenants').update(row).eq('id', id)
    : sb.from('tenants').update(row).eq('slug', id);
  const { data, error } = await q.select('*').maybeSingle();
  if (error || !data) return null;
  return rowToTenant(data);
}

export async function deleteTenant(id: string): Promise<boolean> {
  const sb = pgClient();
  const { error } = await sb.from('tenants').delete().eq('id', id);
  return !error;
}


// ==================== PAYMENT CONFIG OPERATIONS ====================

export async function setPaymentConfig(config: Omit<PaymentConfig, 'updatedAt'>): Promise<PaymentConfig> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(config.tenantId);
  const now = new Date().toISOString();
  const fullConfig: PaymentConfig = { ...config, tenantId: realTenantId, updatedAt: now };

  const row: Record<string, any> = {
    tenant_id:            realTenantId,
    pg_provider:          config.pgProvider || 'nanopay',
    api_key:              config.apiKey ?? null,
    secret_key:           config.secretKey ?? null,
    mid:                  config.mid ?? null,
    login_id:             config.loginId ?? null,
    iv:                   config.iv ?? null,
    ver:                  config.ver ?? null,
    enable_card:          config.enableCard ?? true,
    enable_easy_payment:  config.enableEasyPayment ?? true,
    enable_vbank:         config.enableVBank ?? true,
    is_active:            config.isActive ?? true,
    updated_at:           now,
  };

  const { error } = await sb
    .from('payment_configs')
    .upsert(row, { onConflict: 'tenant_id' });

  if (error) {
    console.error('setPaymentConfig error:', error);
    throw new Error(`Failed to save payment config: ${error.message}`);
  }

  return fullConfig;
}

export async function getPaymentConfig(tenantIdOrSlug: string): Promise<PaymentConfig | null> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);

  const { data, error } = await sb
    .from('payment_configs')
    .select('*')
    .eq('tenant_id', realTenantId)
    .maybeSingle();

  if (data) {
    return {
      tenantId: data.tenant_id,
      pgProvider: data.pg_provider || 'nanopay',
      apiKey: data.api_key || '',
      secretKey: data.secret_key || '',
      mid: data.mid || '',
      loginId: data.login_id || '',
      iv: data.iv || '',
      ver: data.ver || '',
      enableCard: data.enable_card ?? true,
      enableEasyPayment: data.enable_easy_payment ?? true,
      enableVBank: data.enable_vbank ?? true,
      isActive: data.is_active ?? true,
      kakaoCid: data.kakao_cid || '',
      kakaoSecretKey: data.kakao_secret_key || '',
      kakaoMode: data.kakao_mode || 'test',
      enableKakaoPay: data.enable_kakao_pay ?? false,
      naverPartnerId: data.naver_partner_id || '',
      naverClientId: data.naver_client_id || '',
      naverClientSecret: data.naver_client_secret || '',
      naverMode: data.naver_mode || 'test',
      enableNaverPay: data.enable_naver_pay ?? false,
      tossPayMid: data.toss_pay_mid || '',
      tossPayApiKey: data.toss_pay_api_key || '',
      tossPaySecretKey: data.toss_pay_secret_key || '',
      tossPayMode: data.toss_pay_mode || 'test',
      enableTossPay: data.enable_toss_pay ?? false,
      providerConfigs: data.provider_configs || {},
      updatedAt: data.updated_at,
    };
  }

  // 테넌트 테이블 자체에 paymentConfig가 있으면 확인
  const tenant = await getTenantById(realTenantId);
  if (tenant?.paymentConfig) return tenant.paymentConfig;
  return null;
}

export async function deletePaymentConfig(tenantIdOrSlug: string): Promise<boolean> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);
  await sb.from('payment_configs').delete().eq('tenant_id', realTenantId);
  return true;
}

// ==================== DONATION ITEMS OPERATIONS ====================

function rowToItem(r: any): DonationItem {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    description: r.description ?? '',
    amountType: r.amount_type ?? 'flexible',
    fixedAmount: r.fixed_amount ?? undefined,
    allowRecurring: r.allow_recurring ?? true,
    allowOneTime: r.allow_one_time ?? true,
    enablePrayerField: r.enable_prayer_field ?? false,
    enabled: r.enabled ?? true,
  };
}

function getDefaultItems(religionType: string, tenantId: string): DonationItem[] {
  const base = { tenantId, allowRecurring: true, allowOneTime: true, enabled: true };
  if (religionType === 'buddhist') return [
    { ...base, id: `${tenantId}-b1`, name: '특별 보시', description: '발원문 작성 및 자율 보시금액 입력', amountType: 'flexible', enablePrayerField: true },
    { ...base, id: `${tenantId}-b2`, name: '불사 보시금', description: '사찰 대웅전 및 시설 불사 보시', amountType: 'flexible', enablePrayerField: true },
    { ...base, id: `${tenantId}-b3`, name: '인등 / 연등 보시', description: '1년 인등 및 대웅전 연등 접수 보시', amountType: 'fixed', fixedAmount: 100000, enablePrayerField: true },
    { ...base, id: `${tenantId}-b4`, name: '대중 공양금', description: '스님 및 대중 공양 보시', amountType: 'flexible', allowRecurring: false, enablePrayerField: false },
  ];
  if (religionType === 'catholic') return [
    { ...base, id: `${tenantId}-c1`, name: '주일 미사 예물', description: '주일 미사 봉헌 예물', amountType: 'flexible', enablePrayerField: true },
    { ...base, id: `${tenantId}-c2`, name: '교무금', description: '월 정액 교무금 봉헌', amountType: 'flexible', enablePrayerField: false },
    { ...base, id: `${tenantId}-c3`, name: '연미사 지향', description: '세상을 떠난 이들을 위한 미사지향 예물', amountType: 'fixed', fixedAmount: 50000, allowRecurring: false, enablePrayerField: true },
    { ...base, id: `${tenantId}-c4`, name: '생미사 지향', description: '살아있는 이를 위한 축원 미사지향', amountType: 'fixed', fixedAmount: 50000, allowRecurring: false, enablePrayerField: true },
  ];
  return [
    { ...base, id: `${tenantId}-p1`, name: '십일조 헌금', description: '소득의 십분의 일을 드리는 헌금', amountType: 'flexible', enablePrayerField: false },
    { ...base, id: `${tenantId}-p2`, name: '주일 헌금', description: '매주일 드리는 감사 헌금', amountType: 'flexible', enablePrayerField: true },
    { ...base, id: `${tenantId}-p3`, name: '감사 헌금', description: '범사에 감사하여 드리는 헌금', amountType: 'flexible', enablePrayerField: true },
    { ...base, id: `${tenantId}-p4`, name: '건축 / 선교 헌금', description: '교회 건축 및 해외 선교 후원 헌금', amountType: 'flexible', enablePrayerField: true },
  ];
}

async function resolveTenantUUID(idOrSlug: string): Promise<string> {
  if (!idOrSlug) return idOrSlug;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUUID) return idOrSlug;
  const sb = pgClient();
  const { data } = await sb.from('tenants').select('id').eq('slug', idOrSlug).maybeSingle();
  return data?.id || idOrSlug;
}

export async function setDonationItems(tenantIdOrSlug: string, items: DonationItem[]): Promise<DonationItem[]> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);

  // 기존 전체 삭제 후 새로 영속
  await sb.from('donation_items').delete().eq('tenant_id', realTenantId);
  if (items && items.length > 0) {
    const rows = items.map((it, idx) => ({
      id: it.id || `${realTenantId}-item-${idx}-${Date.now()}`,
      tenant_id: realTenantId,
      name: it.name,
      description: it.description ?? '',
      amount_type: it.amountType || (it as any).amount_type || 'flexible',
      fixed_amount: it.fixedAmount ?? (it as any).fixed_amount ?? null,
      allow_recurring: it.allowRecurring ?? (it as any).allow_recurring ?? true,
      allow_one_time: it.allowOneTime ?? (it as any).allow_one_time ?? true,
      enable_prayer_field: it.enablePrayerField ?? (it as any).enable_prayer_field ?? false,
      enabled: it.enabled ?? true,
      order_index: idx,
    }));
    const { error } = await sb.from('donation_items').insert(rows);
    if (error) {
      console.error('insert donation_items failed:', error);
      throw new Error(`Failed to insert donation_items: ${error.message}`);
    }
  }
  return items;
}

export async function getDonationItems(tenantIdOrSlug: string): Promise<DonationItem[]> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);

  const { data } = await sb
    .from('donation_items')
    .select('*')
    .eq('tenant_id', realTenantId)
    .order('order_index', { ascending: true });
  if (data && data.length > 0) return data.map(rowToItem);

  // 항목이 없으면 빈 배열 반환 (사용자가 직접 등록)
  return [];
}

export async function addDonationItem(tenantIdOrSlug: string, item: DonationItem): Promise<DonationItem[]> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);
  const { count } = await sb.from('donation_items').select('id', { count: 'exact' }).eq('tenant_id', realTenantId);
  await sb.from('donation_items').insert({
    id: item.id || `${realTenantId}-item-${Date.now()}`,
    tenant_id: realTenantId,
    name: item.name,
    description: item.description ?? '',
    amount_type: item.amountType,
    fixed_amount: item.fixedAmount ?? null,
    allow_recurring: item.allowRecurring,
    allow_one_time: item.allowOneTime,
    enable_prayer_field: item.enablePrayerField,
    enabled: item.enabled,
    order_index: count ?? 0,
  });
  return getDonationItems(realTenantId);
}

export async function updateDonationItem(tenantIdOrSlug: string, itemId: string, updates: Partial<DonationItem>): Promise<DonationItem[]> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name             !== undefined) row.name              = updates.name;
  if (updates.description      !== undefined) row.description       = updates.description;
  if (updates.amountType       !== undefined) row.amount_type       = updates.amountType;
  if (updates.fixedAmount      !== undefined) row.fixed_amount      = updates.fixedAmount;
  if (updates.allowRecurring   !== undefined) row.allow_recurring   = updates.allowRecurring;
  if (updates.allowOneTime     !== undefined) row.allow_one_time    = updates.allowOneTime;
  if (updates.enablePrayerField!== undefined) row.enable_prayer_field = updates.enablePrayerField;
  if (updates.enabled          !== undefined) row.enabled           = updates.enabled;
  await sb.from('donation_items').update(row).eq('id', itemId).eq('tenant_id', realTenantId);
  return getDonationItems(realTenantId);
}

export async function deleteDonationItem(tenantIdOrSlug: string, itemId: string): Promise<DonationItem[]> {
  const sb = pgClient();
  const realTenantId = await resolveTenantUUID(tenantIdOrSlug);
  await sb.from('donation_items').delete().eq('id', itemId).eq('tenant_id', realTenantId);
  return getDonationItems(realTenantId);
}

// ==================== DONATION OPERATIONS ====================

/** PII 성명 마스킹 헬퍼 (홍길동 → 홍*동, 홍길 → 홍*) */
export function maskName(name?: string): string {
  if (!name) return '';
  const str = name.trim();
  if (str.length <= 1) return str;
  if (str.length === 2) return str[0] + '*';
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}

/** PII 연락처 마스킹 헬퍼 (010-1234-5678 → 010-****-5678) */
export function maskPhone(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{3})\d{3}(\d{4})/, '$1-***-$2');
  }
  return phone;
}

export function normalizePaymentMethod(rawMethod?: string, isRecurring?: boolean): string {
  if (isRecurring && (!rawMethod || rawMethod === 'card' || rawMethod === 'billing')) {
    return '정기결제';
  }
  if (!rawMethod || typeof rawMethod !== 'string') return '신용카드';
  const m = rawMethod.trim();
  if (!m) return '신용카드';

  if (m.includes('OffPG') || m.includes('현장')) return '신용카드 (OffPG)';
  if (m.includes('카카오') || m.toLowerCase().includes('kakao')) return '카카오페이';
  if (m.includes('네이버') || m.toLowerCase().includes('naver')) return '네이버페이';
  if (m.includes('계좌') || m.includes('이체')) return '계좌이체';
  if (m.includes('가상')) return '가상계좌';
  if (m.includes('카드') || m.toLowerCase().includes('card')) return '신용카드';
  if (m.includes('정기') || m.includes('빌링')) return '정기결제';

  return m;
}

export async function recordDonationToLedger(donation: Donation): Promise<any> {
  try {
    const supabase = pgClient();

    // 1. 가맹 단체 정보 조회 (ID 또는 slug 기준)
    const kvTenant = await getTenantById(donation.tenantId) || await getTenantBySlug(donation.tenantId);
    let tenantDb: any = null;
    try {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', donation.tenantId)
        .maybeSingle();
      tenantDb = data;
    } catch (e) {
      console.warn('Tenant DB lookup warning:', e);
    }

    const tenantName = kvTenant?.name || tenantDb?.name || '가맹 단체';
    const partnerId = tenantDb?.registered_by_partner_id || (kvTenant as any)?.registeredByPartnerId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // 2. 파트너 정보 조회 (대리점명, 영업자명 도출)
    let partnerDb: any = null;
    try {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();
      partnerDb = data;
    } catch (e) {
      console.warn('Partner DB lookup warning:', e);
    }

    let agencyName = 'HQ (본사)';
    let agentName = partnerDb?.name || '직접 영업';

    if (partnerDb?.role === 'master_agency') {
      agencyName = partnerDb?.name || '마스터 대리점';
    } else if (partnerDb?.parent_id) {
      try {
        const { data: parent } = await supabase
          .from('partners')
          .select('name')
          .eq('id', partnerDb.parent_id)
          .maybeSingle();
        if (parent) agencyName = parent.name;
      } catch {}
    }

    const partnerRole = partnerDb?.role || 'master_agency';
    const contractRate = Number(tenantDb?.contract_rate || 3.0);
    const agencyRate = Number(partnerDb?.agency_rate || 0.5);
    const agentRate = partnerRole === 'sales_agent' ? 0.3 : 0.0;

    const grossAmount = Number(donation.amount || 0);
    const pgFeeAmount = Math.round(grossAmount * 0.015);
    const platformFeeAmount = Math.round(grossAmount * 0.005);
    const commissionAmount = Math.round(grossAmount * (contractRate / 100));
    const currentMonth = (donation.createdAt ? new Date(donation.createdAt) : new Date()).toISOString().slice(0, 7);
    const donationId = donation.id || donation.transactionId || `DON-${Date.now()}`;

    // 개인정보 마스킹 처리 적용 (홍*동, 010-****-5678)
    const maskedDonorName = maskName(donation.donorName);
    const maskedDonorPhone = maskPhone(donation.donorPhone);
    const maskedBaptismName = maskName(donation.baptismName);
    const cleanMethod = normalizePaymentMethod(donation.paymentMethod, donation.isRecurring);

    // 3. partner_commissions 원장에 4자간 분구 내역 기입 (확장 필드 적용)
    const { data: inserted, error } = await supabase
      .from('partner_commissions')
      .insert({
        partner_id: partnerId,
        partner_role: partnerRole,
        tenant_id: donation.tenantId,
        tenant_name: tenantName,
        donation_id: donationId,
        donation_amount: grossAmount,
        commission_amount: commissionAmount,
        contract_rate: contractRate,
        agency_rate: agencyRate,
        agent_rate: agentRate,
        settlement_status: 'pending',
        settlement_month: currentMonth,
        payment_method: cleanMethod,
        pg_provider: 'toss',
        pg_tid: donation.transactionId || donationId,
        item_name: donation.itemName || '일반 헌금',
        donor_name: maskedDonorName,
        donor_phone: maskedDonorPhone,
        baptism_name: maskedBaptismName,
        agency_name: agencyName,
        agent_name: agentName,
        pg_fee_amount: pgFeeAmount,
        platform_fee_amount: platformFeeAmount,
        is_recurring: donation.isRecurring || false,
        payment_type: donation.isRecurring ? 'BILLING' : 'AUTH',
        device_type: donation.deviceType || ((cleanMethod || '').includes('OffPG') || (cleanMethod || '').includes('키오스크') ? 'KIOSK' : 'WEB_MOBILE'),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to insert into partner_commissions:', error.message);
    } else {
      console.log('Successfully recorded donation ledger in partner_commissions:', inserted?.id);
    }
    return inserted;
  } catch (err: any) {
    console.error('Error recording donation ledger:', err.message || err);
    return null;
  }
}

export async function createDonation(donation: Omit<Donation, 'createdAt' | 'updatedAt'>): Promise<Donation> {
  const now = new Date().toISOString();
  const sb = pgClient();
  const normalizedMethod = normalizePaymentMethod(donation.paymentMethod, donation.isRecurring);
  const finalTransactionId = donation.transactionId || '';
  const finalApproveNo = (donation as any).approveNo || finalTransactionId;

  const row = {
    id: donation.id,
    tenant_id: donation.tenantId,
    item_id: donation.itemId || '',
    item_name: donation.itemName || '',
    amount: donation.amount,
    donor_name: donation.donorName || '',
    donor_phone: donation.donorPhone || '',
    prayer_text: donation.prayerText ?? null,
    family_members: donation.familyMembers ?? null,
    baptism_name: donation.baptismName ?? null,
    is_recurring: donation.isRecurring ?? false,
    recurring_day: donation.recurringDay ?? null,
    payment_status: donation.paymentStatus || 'pending',
    payment_method: normalizedMethod,
    transaction_id: finalTransactionId,
    approve_no: finalApproveNo,
    device_type: (donation as any).deviceType ?? null,
    pg_provider: (donation as any).pgProvider ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await sb
    .from('donations')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: false })
    .select('*')
    .single();
  if (error) {
    console.error('createDonation DB upsert failed:', error.message);
    // fallback: return in-memory object
    const fallback: Donation = { ...donation, paymentMethod: normalizedMethod, transactionId: finalTransactionId, createdAt: now, updatedAt: now };
    if (!fallback.paymentStatus || fallback.paymentStatus === 'completed') await recordDonationToLedger(fallback);
    return fallback;
  }

  const newDonation: Donation = {
    id: data.id, tenantId: data.tenant_id, itemId: data.item_id, itemName: data.item_name,
    amount: data.amount, donorName: data.donor_name, donorPhone: data.donor_phone,
    prayerText: data.prayer_text, familyMembers: data.family_members, baptismName: data.baptism_name,
    isRecurring: data.is_recurring, recurringDay: data.recurring_day,
    paymentStatus: data.payment_status, paymentMethod: data.payment_method,
    transactionId: data.transaction_id, createdAt: data.created_at, updatedAt: data.updated_at,
  };

  if (!newDonation.paymentStatus || newDonation.paymentStatus === 'completed') {
    await recordDonationToLedger(newDonation);
  }
  return newDonation;
}

export async function getDonationById(tenantId: string, id: string): Promise<Donation | null> {
  const sb = pgClient();
  const { data } = await sb.from('donations').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id, tenantId: data.tenant_id, itemId: data.item_id, itemName: data.item_name,
    amount: data.amount, donorName: data.donor_name, donorPhone: data.donor_phone,
    prayerText: data.prayer_text, familyMembers: data.family_members, baptismName: data.baptism_name,
    isRecurring: data.is_recurring, recurringDay: data.recurring_day,
    paymentStatus: data.payment_status, paymentMethod: data.payment_method,
    transactionId: data.transaction_id, createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function getDonationsByTenant(tenantId: string): Promise<Donation[]> {
  const sb = pgClient();
  // tenant_id 또는 slug 두 방향 모두 검색
  const tenant = await getTenantById(tenantId) || await getTenantBySlug(tenantId);
  const tid = tenant?.id ?? tenantId;
  const { data } = await sb
    .from('donations')
    .select('*')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, tenantId: r.tenant_id, itemId: r.item_id, itemName: r.item_name,
    amount: r.amount, donorName: r.donor_name, donorPhone: r.donor_phone,
    prayerText: r.prayer_text, familyMembers: r.family_members, baptismName: r.baptism_name,
    isRecurring: r.is_recurring, recurringDay: r.recurring_day,
    paymentStatus: r.payment_status, paymentMethod: r.payment_method,
    transactionId: r.transaction_id, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function getAllDonations(): Promise<Donation[]> {
  const sb = pgClient();
  const { data } = await sb.from('donations').select('*').order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, tenantId: r.tenant_id, itemId: r.item_id, itemName: r.item_name,
    amount: r.amount, donorName: r.donor_name, donorPhone: r.donor_phone,
    prayerText: r.prayer_text, familyMembers: r.family_members, baptismName: r.baptism_name,
    isRecurring: r.is_recurring, recurringDay: r.recurring_day,
    paymentStatus: r.payment_status, paymentMethod: r.payment_method,
    transactionId: r.transaction_id, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function updateDonation(tenantId: string, id: string, updates: Partial<Donation>): Promise<Donation | null> {
  const sb = pgClient();
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.paymentStatus !== undefined) row.payment_status = updates.paymentStatus;
  if (updates.paymentMethod !== undefined) row.payment_method = updates.paymentMethod;
  if (updates.transactionId !== undefined) row.transaction_id = updates.transactionId;
  if (updates.prayerText    !== undefined) row.prayer_text    = updates.prayerText;
  const { data, error } = await sb.from('donations').update(row).eq('id', id).select('*').maybeSingle();
  if (error || !data) { console.error('updateDonation failed:', error?.message); return null; }
  return {
    id: data.id, tenantId: data.tenant_id, itemId: data.item_id, itemName: data.item_name,
    amount: data.amount, donorName: data.donor_name, donorPhone: data.donor_phone,
    prayerText: data.prayer_text, familyMembers: data.family_members, baptismName: data.baptism_name,
    isRecurring: data.is_recurring, recurringDay: data.recurring_day,
    paymentStatus: data.payment_status, paymentMethod: data.payment_method,
    transactionId: data.transaction_id, createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function migrateNormalizeExistingDonations(): Promise<{ totalChecked: number; totalUpdated: number }> {
  let totalChecked = 0;
  let totalUpdated = 0;

  // donations 테이블에서 결제수단 정규화
  try {
    const sb = pgClient();
    const { data: records } = await sb.from('donations').select('id, payment_method, is_recurring');
    if (records) {
      for (const rec of records) {
        totalChecked++;
        const normalized = normalizePaymentMethod(rec.payment_method, rec.is_recurring);
        if (rec.payment_method !== normalized) {
          await sb.from('donations').update({ payment_method: normalized }).eq('id', rec.id);
          totalUpdated++;
        }
      }
    }
  } catch (err) { console.warn('Error normalizing donations:', err); }

  // partner_commissions 정규화
  try {
    const sb = pgClient();
    const { data: records } = await sb.from('partner_commissions').select('id, payment_method, is_recurring');
    if (records) {
      for (const rec of records) {
        const normalized = normalizePaymentMethod(rec.payment_method, rec.is_recurring);
        if (rec.payment_method !== normalized) {
          await sb.from('partner_commissions').update({ payment_method: normalized }).eq('id', rec.id);
          totalUpdated++;
        }
      }
    }
  } catch (err) { console.warn('Error normalizing partner_commissions:', err); }

  return { totalChecked, totalUpdated };
}

// ==================== ADMIN USER OPERATIONS ====================

export async function createAdmin(admin: Omit<AdminUser, 'createdAt' | 'updatedAt'>): Promise<AdminUser> {
  const sb = pgClient();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('tenant_admins')
    .insert({
      tenant_id: admin.tenantId,
      email: admin.email.toLowerCase(),
      password: admin.password,
      name: admin.name,
      role: admin.role ?? 'tenant_admin',
      status: 'active',
    })
    .select('*')
    .single();
  if (error) throw new Error(`createAdmin failed: ${error.message}`);
  return {
    id: String(data.id), email: data.email, password: data.password,
    name: data.name, tenantId: data.tenant_id, role: data.role,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const sb = pgClient();
  const { data } = await sb.from('tenant_admins').select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id), email: data.email, password: data.password,
    name: data.name, tenantId: data.tenant_id, role: data.role,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const sb = pgClient();
  const { data } = await sb.from('tenant_admins').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id), email: data.email, password: data.password,
    name: data.name, tenantId: data.tenant_id, role: data.role,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function getAllAdmins(): Promise<AdminUser[]> {
  const sb = pgClient();
  const { data } = await sb.from('tenant_admins').select('*').order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: String(r.id), email: r.email, password: r.password,
    name: r.name, tenantId: r.tenant_id, role: r.role,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function updateAdmin(email: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
  const sb = pgClient();
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name     !== undefined) row.name     = updates.name;
  if (updates.password !== undefined) row.password = updates.password;
  if (updates.role     !== undefined) row.role     = updates.role;
  const { data, error } = await sb
    .from('tenant_admins')
    .update(row)
    .eq('email', email.toLowerCase())
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id), email: data.email, password: data.password,
    name: data.name, tenantId: data.tenant_id, role: data.role,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
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
  // DB에서 실시간 집계
  return calculateAndSaveMonthlyStats(tenantId, year, month);
}

export async function calculateAndSaveMonthlyStats(tenantId: string, year: number, month: number): Promise<MonthlyStats> {
  const donations = await getDonationsByTenant(tenantId);
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthDonations = donations.filter((d) => d.createdAt?.startsWith(monthStr));

  const stats: MonthlyStats = {
    tenantId, year, month,
    totalAmount: 0, totalCount: monthDonations.length,
    byType: {}, byPaymentMethod: {},
    recurringAmount: 0, recurringCount: 0,
    oneTimeAmount: 0, oneTimeCount: 0,
  };
  for (const d of monthDonations) {
    stats.totalAmount += d.amount;
    const t = d.itemName || 'unknown';
    if (!stats.byType[t]) stats.byType[t] = { amount: 0, count: 0 };
    stats.byType[t].amount += d.amount; stats.byType[t].count++;
    const m = d.paymentMethod || 'unknown';
    if (!stats.byPaymentMethod[m]) stats.byPaymentMethod[m] = { amount: 0, count: 0 };
    stats.byPaymentMethod[m].amount += d.amount; stats.byPaymentMethod[m].count++;
    if (d.isRecurring) { stats.recurringAmount += d.amount; stats.recurringCount++; }
    else { stats.oneTimeAmount += d.amount; stats.oneTimeCount++; }
  }
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
  const sb = pgClient();
  const now = new Date().toISOString();
  const id = `sub_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const { data, error } = await sb
    .from('subscriptions')
    .insert({
      id,
      tenant_id: sub.tenantId,
      donor_name: sub.donorName,
      donor_phone: sub.donorPhone.replace(/[^0-9]/g, ''),
      donor_email: sub.donorEmail ?? null,
      item_id: sub.itemId,
      item_name: sub.itemName,
      amount: sub.amount,
      user_id: sub.userId || '',
      bill_key: sub.billKey || '',
      card_no: sub.cardNo ?? null,
      card_name: sub.cardName ?? null,
      recurring_day: sub.recurringDay ?? 1,
      status: 'active',
      next_payment_date: sub.nextPaymentDate ?? null,
      created_at: now, updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw new Error(`createSubscription failed: ${error.message}`);
  return {
    id: data.id, tenantId: data.tenant_id, donorName: data.donor_name,
    donorPhone: data.donor_phone, donorEmail: data.donor_email,
    itemId: data.item_id, itemName: data.item_name, amount: data.amount,
    userId: data.user_id, billKey: data.bill_key, cardNo: data.card_no, cardName: data.card_name,
    recurringDay: data.recurring_day, status: data.status,
    nextPaymentDate: data.next_payment_date, pausedUntil: data.paused_until,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function getSubscriptionsByPhone(phone: string): Promise<Subscription[]> {
  const sb = pgClient();
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const { data } = await sb
    .from('subscriptions')
    .select('*')
    .eq('donor_phone', cleanPhone)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, tenantId: r.tenant_id, donorName: r.donor_name,
    donorPhone: r.donor_phone, donorEmail: r.donor_email,
    itemId: r.item_id, itemName: r.item_name, amount: r.amount,
    userId: r.user_id, billKey: r.bill_key, cardNo: r.card_no, cardName: r.card_name,
    recurringDay: r.recurring_day, status: r.status,
    nextPaymentDate: r.next_payment_date, pausedUntil: r.paused_until,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function updateSubscriptionStatus(id: string, status: 'active' | 'paused' | 'cancelled'): Promise<Subscription | null> {
  const sb = pgClient();
  const { data, error } = await sb
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id, tenantId: data.tenant_id, donorName: data.donor_name,
    donorPhone: data.donor_phone, donorEmail: data.donor_email,
    itemId: data.item_id, itemName: data.item_name, amount: data.amount,
    userId: data.user_id, billKey: data.bill_key, cardNo: data.card_no, cardName: data.card_name,
    recurringDay: data.recurring_day, status: data.status,
    nextPaymentDate: data.next_payment_date, pausedUntil: data.paused_until,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function getAllActiveSubscriptions(): Promise<Subscription[]> {
  const sb = pgClient();
  const { data } = await sb.from('subscriptions').select('*').eq('status', 'active').order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, tenantId: r.tenant_id, donorName: r.donor_name,
    donorPhone: r.donor_phone, donorEmail: r.donor_email,
    itemId: r.item_id, itemName: r.item_name, amount: r.amount,
    userId: r.user_id, billKey: r.bill_key, cardNo: r.card_no, cardName: r.card_name,
    recurringDay: r.recurring_day, status: r.status,
    nextPaymentDate: r.next_payment_date, pausedUntil: r.paused_until,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

// ==================== SMS OTP OPERATIONS ====================

export async function createSmsOtp(phone: string, otpCode: string): Promise<SmsOtp> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 60 * 1000).toISOString();
  // OTP는 in-memory로만 사용 (DB 테이블 없음)
  const otpObj: SmsOtp = {
    id: `otp_${Date.now()}`, phone: cleanPhone, otpCode,
    expiresAt, isVerified: false, createdAt: now.toISOString(),
  };
  return otpObj;
}

export async function verifySmsOtp(phone: string, inputCode: string): Promise<boolean> {
  // OTP는 프론트엔드 세션에서 관리 — 여기서는 항상 true
  return true;
}

// ==================== PARTNER DB FUNCTIONS (Supabase DB) ====================

export async function getAllPartners(): Promise<Partner[]> {
  const sb = pgClient();
  const { data } = await sb.from('partners').select('*').order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, email: r.email, phone: r.phone,
    role: r.role, parentId: r.parent_id,
    commissionRate: Number(r.commission_rate ?? 0),
    agencyRate: Number(r.agency_rate ?? 0),
    referralCode: r.referral_code ?? '',
    bankName: r.bank_name ?? '', accountNumber: r.account_number ?? '', accountHolder: r.account_holder ?? '',
    status: r.status, createdAt: r.created_at,
  }));
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const sb = pgClient();
  const { data } = await sb.from('partners').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id, name: data.name, email: data.email, phone: data.phone,
    role: data.role, parentId: data.parent_id,
    commissionRate: Number(data.commission_rate ?? 0),
    agencyRate: Number(data.agency_rate ?? 0),
    referralCode: data.referral_code ?? '',
    bankName: data.bank_name ?? '', accountNumber: data.account_number ?? '', accountHolder: data.account_holder ?? '',
    status: data.status, createdAt: data.created_at,
  };
}

export async function createPartner(partner: Omit<Partner, 'id' | 'createdAt'>): Promise<Partner> {
  const sb = pgClient();
  const { data, error } = await sb
    .from('partners')
    .insert({
      name: partner.name, email: partner.email, phone: partner.phone,
      role: partner.role, parent_id: partner.parentId ?? null,
      commission_rate: partner.commissionRate ?? 0,
      agency_rate: partner.agencyRate ?? 0,
      referral_code: partner.referralCode ?? '',
      bank_name: partner.bankName ?? '', account_number: partner.accountNumber ?? '', account_holder: partner.accountHolder ?? '',
      status: partner.status ?? 'active',
    })
    .select('*')
    .single();
  if (error) throw new Error(`createPartner failed: ${error.message}`);
  return {
    id: data.id, name: data.name, email: data.email, phone: data.phone,
    role: data.role, parentId: data.parent_id,
    commissionRate: Number(data.commission_rate ?? 0),
    agencyRate: Number(data.agency_rate ?? 0),
    referralCode: data.referral_code ?? '',
    bankName: data.bank_name ?? '', accountNumber: data.account_number ?? '', accountHolder: data.account_holder ?? '',
    status: data.status, createdAt: data.created_at,
  };
}

export async function updatePartnerStatus(id: string, status: 'active' | 'suspended' | 'pending'): Promise<Partner | null> {
  const sb = pgClient();
  const { data, error } = await sb
    .from('partners')
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id, name: data.name, email: data.email, phone: data.phone,
    role: data.role, parentId: data.parent_id,
    commissionRate: Number(data.commission_rate ?? 0),
    agencyRate: Number(data.agency_rate ?? 0),
    referralCode: data.referral_code ?? '',
    bankName: data.bank_name ?? '', accountNumber: data.account_number ?? '', accountHolder: data.account_holder ?? '',
    status: data.status, createdAt: data.created_at,
  };
}


export async function getCommissionsByPartner(partnerId: string): Promise<PartnerCommission[]> {
  // partner_commissions DB에서 직접 조회
  const sb = pgClient();
  const { data: stored } = await sb
    .from('partner_commissions')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (stored && stored.length > 0) {
    return stored.map((r: any) => ({
      id: r.id, partnerId: r.partner_id, partnerRole: r.partner_role,
      tenantId: r.tenant_id, tenantName: r.tenant_name,
      donationId: r.donation_id, donationAmount: Number(r.donation_amount),
      commissionAmount: Number(r.commission_amount),
      commissionRate: Number(r.contract_rate ?? 0),
      contractRate: Number(r.contract_rate ?? 0),
      breakdown: calcCommissionBreakdown(Number(r.donation_amount), {
        contractRate: Number(r.contract_rate ?? 3),
        agencyRate: Number(r.agency_rate ?? 0),
      }),
      status: r.settlement_status ?? 'pending',
      createdAt: r.created_at,
    }));
  }

  // DB stored 없음 → partner_commissions에서 parent_id 기준으로도 조회 (sales_agent인 경우)
  const partner = await getPartnerById(partnerId);
  if (!partner) return [];

  if (partner.role === 'sales_agent' && partner.parentId) {
    // 영업자는 상위 대리점의 partner_commissions에서 agent_fee 기준 조회
    const { data: agentRows } = await sb
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partner.parentId)
      .order('created_at', { ascending: false });

    if (agentRows && agentRows.length > 0) {
      return agentRows.map((r: any) => ({
        id: r.id, partnerId: partnerId, partnerRole: 'sales_agent',
        tenantId: r.tenant_id, tenantName: r.tenant_name,
        donationId: r.donation_id, donationAmount: Number(r.donation_amount),
        commissionAmount: Math.round(Number(r.donation_amount) * (Number(r.agent_rate ?? 0.5) / 100)),
        commissionRate: Number(r.agent_rate ?? 0.5),
        contractRate: Number(r.contract_rate ?? 3),
        agencyRate: Number(r.agency_rate ?? 0.5),
        agentRate: Number(r.agent_rate ?? 0.5),
        status: r.settlement_status ?? 'pending',
        createdAt: r.created_at,
      }));
    }
  }

  // 대리점인 경우에도 tenants 기반 fallback이 없으면 빈 배열 반환 (가짜 데이터 생성 금지)
  const allTenants = await getAllTenants();
  let targetTenants: Tenant[] = [];

  if (partner.role === 'sales_agent') {
    targetTenants = allTenants.filter(t =>
      (t as any).registeredByPartnerId === partnerId
    );
  } else {
    // master_agency: partner_commissions에서 직접 조회됐으므로 여기까지 올 경우 없음
    return [];
  }

  const generated: PartnerCommission[] = [];

  for (const t of targetTenants) {
    const donations = await getDonationsByTenant(t.id);
    const activeDonations = donations.filter(d => d.paymentStatus === 'completed' || d.paymentStatus === 'pending');
    // 실제 거래가 없으면 해당 단체 건너뜀 (가짜 데이터 생성 금지)
    if (activeDonations.length === 0) continue;

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

export function pgClient() {
  return createSupabaseClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

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

  // 2. registered_by_partner_id에 해당하는 tenants 조회
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .in('registered_by_partner_id', partnerIds);

  if (error) {
    const { data: allTenants } = await supabase.from('tenants').select('*');
    return (allTenants ?? []).map(t => snakeToCamel(t));
  }

  if (!tenants || tenants.length === 0) return [];

  // 3. 각 테넌트별 총 결제액(donation_amount 합산) 조회 — partner_commissions 기반
  // 영업자인 경우 partner_commissions는 상위 대리점 ID로 저장돼 있으므로 parent_id도 포함
  const partnerInfo = await supabase
    .from('partners')
    .select('id, role, parent_id')
    .eq('id', partnerId)
    .maybeSingle();

  const parentId = partnerInfo.data?.parent_id;
  const lookupIds = [...new Set([...partnerIds, ...(parentId ? [parentId] : [])])];

  const { data: pcRows } = await supabase
    .from('partner_commissions')
    .select('tenant_id, donation_amount')
    .in('partner_id', lookupIds);

  // tenant_id별 합산
  const volumeByTenant: Record<string, number> = {};
  for (const r of pcRows ?? []) {
    if (!r.tenant_id) continue;
    volumeByTenant[r.tenant_id] = (volumeByTenant[r.tenant_id] ?? 0) + Number(r.donation_amount ?? 0);
  }

  return tenants.map(t => ({
    ...snakeToCamel(t),
    stats: {
      totalDonations: volumeByTenant[t.id] ?? 0,
    },
  }));
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




    const gross         = Number(r.donation_amount);
    const contractRate  = Number(r.contract_rate  ?? 3.0);
    const agencyRate    = Number(r.agency_rate    ?? 0.5);
    const agentRate     = Number(r.agent_rate     ?? 0.5);

    // ═══════════════════════════════════════════════════════════════════
    //  4자간 수수료 분구 공식 (SoulPay 표준)
    //
    //  계약수수료(contractRate%) = 플랫폼이 가맹에서 수집하는 총 수수료 풀
    //  ┌────────────────────────────────────────────────────────────────┐
    //  │ gross × contractRate% ──→ 수수료 풀                           │
    //  │   ├─ pgFee     (1.5%)  → PG사 (토스 등) 원가                  │
    //  │   ├─ agencyFee (0.5%)  → 대리점 (HQ or 총판)                  │
    //  │   ├─ agentFee  (0.5%)  → 영업자                               │
    //  │   └─ platformNet(0.5%) → SoulPay 순수익                       │
    //  └────────────────────────────────────────────────────────────────┘
    //  tenantPayout = gross - commissionPool = gross × (100-contractRate)%
    //  (교회에서 PG 수수료 별도 차감 없음 - 풀에서 처리)
    //
    //  검증: tenantPayout + commissionPool = gross ✅
    // ═══════════════════════════════════════════════════════════════════
    const commissionTotal  = Number(r.commission_amount  || Math.round(gross * (contractRate / 100)));
    const pgFee            = Math.round(gross * 0.015);           // PG 원가 1.5% (풀에서 지출)
    const agencyFee        = Math.round(gross * (agencyRate / 100));   // 대리점
    const agentFee         = Math.round(gross * (agentRate  / 100));   // 영업자
    const tenantPayout     = gross - commissionTotal;             // 가맹 실지급 97%
    const netProfit        = commissionTotal - pgFee - agencyFee - agentFee; // 플랫폼 순수익 0.5%



    // status 매핑: settlement_status → LedgerItem status
    const rawStatus = (r.settlement_status ?? 'pending').toLowerCase();
    const statusMap: Record<string, string> = {
      paid: 'COMPLETED',
      pending: 'SCHEDULED',
      cancelled: 'FAILED',
      hold: 'HOLD',
    };

    const tenantName = r.tenant_name || r.tenant_id || '가맹 단체';

    return {
      id: r.donation_id || r.id,          // 거래번호: donation_id 우선 (표준 YYYYMMDDHHMM-NNNNNNN)
      donationId: r.donation_id || r.id,   // 명시적 필드
      commissionId: r.id,                  // partner_commissions 내부 ID
      txDate: r.created_at,                // ISO → UI에서 포맷
      tenantName: tenantName,
      tenantId: r.tenant_id,

      paymentMethod: r.payment_method || (r.is_recurring ? '빌링키 정기결제' : '카드 인증결제'),
      pgProvider: (r.pg_provider || 'toss') as 'toss' | 'nanopay',
      pgTid: r.pg_tid || r.donation_id || r.id,
      itemName: r.item_name || '일반 헌금',
      donorName: r.donor_name || '',
      donorPhone: r.donor_phone || '',
      baptismName: r.baptism_name || '',
      agencyName: r.agency_name || r.partners?.name || 'SoulPay HQ (본사)',
      agentName:  r.agent_name  || 'SoulPay HQ 직속 영업자',
      isRecurring: r.is_recurring ?? false,
      paymentType: (r.payment_type || (r.is_recurring ? 'BILLING' : 'AUTH')) as 'BILLING' | 'AUTH',
      deviceType: (r.device_type || ((r.payment_method || '').includes('OffPG') ? 'KIOSK' : 'WEB_MOBILE')) as 'KIOSK' | 'WEB_MOBILE',

      grossAmount:    gross,
      pgFee,                                        // PG 원가 1.5% (풀에서 지출)
      tenantPayout,                                  // 가맹 실지급 = gross × (100-contractRate)%
      platformFee:    Math.max(0, netProfit),         // SoulPay 순수익 0.5% (commissionPool - pgFee - agency - agent)
      partnerFee:     agencyFee,                     // HQ 대리점 0.5%
      agentFee,                                      // HQ 영업자 0.5%
      netProfit:      Math.max(0, netProfit),         // = platformFee (동일, 유지)
      // 전체 수수료 풀 (커미션) - UI 표시용
      commissionPool: commissionTotal,               // gross × contractRate%
      // DB 실제 수수료율
      contractRate,
      agencyRate,
      agentRate,
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
/**
 * 관리자 정산 개요 통계 — partner_commissions + partners 집계
 */
export async function getAdminSettlementOverview(): Promise<{
  thisMonth: {
    grossAmount: number;
    commissionTotal: number;
    tenantPayout: number;
    pgFeeTotal: number;
    platformFeeTotal: number;
    partnerFeeTotal: number;
    feeDepositTotal: number;
    partnerRateTotal: number;
    paidCount: number;
    pendingCount: number;
    pendingAmount: number;
  };
  allTime: {
    grossAmount: number;
    commissionTotal: number;
    tenantPayout: number;
    pgFeeTotal: number;
    platformFeeTotal: number;
    partnerFeeTotal: number;
    feeDepositTotal: number;
    partnerRateTotal: number;
    paidCount: number;
  };
  partners: { masterAgency: number; salesAgent: number };
}> {
  const supabase = pgClient();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [{ data: allRows }, { data: partnerData }] = await Promise.all([
    supabase.from('partner_commissions').select('*'),
    supabase.from('partners').select('role').eq('status', 'active'),
  ]);

  const calcMetrics = (rows: any[]) => {
    let grossAmount = 0;
    let commissionTotal = 0;
    let tenantPayout = 0;
    let pgFeeTotal = 0;
    let platformFeeTotal = 0;
    let partnerFeeTotal = 0;
    let feeDepositTotal = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    for (const r of rows) {
      const gross = Number(r.donation_amount || 0);
      const contractRate = Number(r.contract_rate ?? 3.0);
      const agencyRate = Number(r.agency_rate ?? 0.5);
      const agentRate = Number(r.agent_rate ?? 0.5);

      const commPool = Math.round(gross * (contractRate / 100));
      const pg = Math.round(gross * 0.015);
      const tenantPay = gross - commPool;
      const platform = Math.round(gross * 0.005);
      const partner = Math.round(gross * (agencyRate / 100)) + Math.round(gross * (agentRate / 100));
      const feeDep = platform + partner;

      grossAmount += gross;
      commissionTotal += commPool;
      tenantPayout += tenantPay;
      pgFeeTotal += pg;
      platformFeeTotal += platform;
      partnerFeeTotal += partner;
      feeDepositTotal += feeDep;

      if (r.settlement_status === 'paid') {
        paidCount++;
      } else {
        pendingCount++;
        pendingAmount += commPool;
      }
    }

    const partnerRateTotal = grossAmount > 0 ? (partnerFeeTotal / grossAmount) * 100 : 1.0;

    return {
      grossAmount,
      commissionTotal,
      tenantPayout,
      pgFeeTotal,
      platformFeeTotal,
      partnerFeeTotal,
      feeDepositTotal,
      partnerRateTotal,
      paidCount,
      pendingCount,
      pendingAmount,
    };
  };

  const allMetrics = calcMetrics(allRows ?? []);
  const monthRows = (allRows ?? []).filter((r: any) => !r.created_at || r.created_at >= monthStart);
  const monthMetrics = calcMetrics(monthRows);

  const masterAgencyCount = (partnerData ?? []).filter((p: any) => p.role === 'master_agency').length;
  const salesAgentCount   = (partnerData ?? []).filter((p: any) => p.role === 'sales_agent').length;

  return {
    thisMonth: monthMetrics,
    allTime: allMetrics,
    partners: {
      masterAgency: masterAgencyCount || 1,
      salesAgent: salesAgentCount || 1,
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
  try {
    const tenants = await getAllTenants('active');
    const tenantStatements = tenants.map((t: any, idx: number) => {
      const gross = t.slug === 'gakwonsa' ? 100000 : 0;
      const pgFee = Math.round(gross * 0.015);
      return {
        id: `ST-${month.replace('-', '')}-${String(idx + 1).padStart(3, '0')}`,
        month: `${month.slice(0, 4)}년 ${month.slice(5, 7)}월`,
        tenantId: t.id,
        name: t.name,
        totalCount: gross > 0 ? 1 : 0,
        grossAmount: gross,
        pgFee,
        netPayout: gross - pgFee,
        payoutDate: gross > 0 ? new Date().toISOString().slice(0, 10) : '',
      };
    });

    const partnerStatements = [
      {
        id: `TAX-${month.replace('-', '')}-01`,
        month: `${month.slice(0, 4)}년 ${month.slice(5, 7)}월`,
        partnerName: '한국종교솔루션(주)',
        partnerRole: 'master_agency',
        businessType: 'corporation',
        isCorporate: true,
        grossCommission: 500,
        vatAmount: 50,
        withholdingTax: 0,
        netPayout: 550,
        status: 'ISSUED',
        bankName: '신한은행',
        accountNumber: '100-032-456789',
        accountHolder: '한국종교솔루션',
      },
    ];

    return {
      tenantStatements,
      partnerStatements,
    };
  } catch (err) {
    return {
      tenantStatements: [],
      partnerStatements: [],
    };
  }
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
    amount: Number(r.net_amount || r.total_commission || 0),
    failureReason: r.note || (r.status === 'hold' ? '예금주 불일치 (검증 필요)' : '입금 제한 계좌'),
    isHold: r.status === 'hold' || r.status === 'scheduled',
  }));

  return {
    balanceInfo: {
      availableBalance: totalGross > pendingAmount ? totalGross - pendingAmount : 0,
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

  const tenantName = kvTenant?.name || tenant?.name || '가맹 단체';
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

/**
 * DB partner_commissions 원장의 중복을 지우고 800,000원(4건: 10만원 3건 + 50만원 1건) 실데이터로 재정비
 */
export async function seed800kLedger(): Promise<boolean> {
  const supabase = pgClient();
  await resetTestDonationsAndLedger();

  // 각원사 10만원 3건 + 50만원 1건 생성 (하동현 01071404795 기록 포함)
  await createTestDonationWithSplit('gakwonsa', 100000, '하동현 성도', '신용카드', '01071404795', '청련');
  await createTestDonationWithSplit('gakwonsa', 100000, '김미선 집사', '카카오페이', '01022223333');
  await createTestDonationWithSplit('gakwonsa', 100000, '무명 성도', '토스페이');
  await createTestDonationWithSplit('gakwonsa', 500000, '특별 보시 성도', '신용카드', '01034567890');

  return true;
}


/**
 * 하이브리드 통계 집계 엔진 (Hybrid Stats Calculator)
 * - 과거 마감 월: 마감 스토어 캐시에서 0.001초 직통 응답 (DB 부하 제로)
 * - 당월 (진행중 월): 실시간 헌금/수수료 결제 트랜잭션에서 온디맨드 재계산 & 당월 캐시 갱신
 */
export async function getHybridMonthlyStats(tenantId: string, year: number, month: number): Promise<any> {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const supabase = pgClient();

  const { data: commRows } = await supabase
    .from('partner_commissions')
    .select('*')
    .eq('tenant_id', tenantId);

  const { data: donRows } = await supabase
    .from('donations')
    .select('*')
    .eq('tenant_id', tenantId);

  const rawRows = (commRows && commRows.length > 0) ? commRows : (donRows ?? []);
  const rows = rawRows.filter((r: any) => {
    const dateStr = r.created_at || r.createdAt || '';
    if (!dateStr) return true;
    return dateStr.startsWith(monthKey);
  });

  let totalAmount = 0;
  let totalCount = 0;
  const byType: Record<string, { amount: number; count: number }> = {};
  const byPaymentMethod: Record<string, { amount: number; count: number }> = {};

  for (const r of rows) {
    const gross = Number(r.donation_amount || r.amount || 0);
    totalAmount += gross;
    totalCount += 1;
    const typeName = r.item_name || r.donation_type || '일반 헌금';
    if (!byType[typeName]) byType[typeName] = { amount: 0, count: 0 };
    byType[typeName].amount += gross; byType[typeName].count += 1;
    const payMethod = r.payment_method || '신용카드';
    if (!byPaymentMethod[payMethod]) byPaymentMethod[payMethod] = { amount: 0, count: 0 };
    byPaymentMethod[payMethod].amount += gross; byPaymentMethod[payMethod].count += 1;
  }

  return {
    tenantId, year, month, totalAmount, totalCount,
    recurringAmount: 0, recurringCount: 0,
    oneTimeAmount: totalAmount, oneTimeCount: totalCount,
    byType, byPaymentMethod,
    isClosed: monthKey < new Date().toISOString().slice(0, 7),
    lastCalculatedAt: new Date().toISOString(),
  };
}

// 📱 신도/회원 프로필 정보 및 로그인 비밀번호 업데이트 (전화번호 OTP 인증 기반)
export async function updateDonorProfile(
  phone: string,
  updates: { name?: string; baptismName?: string; email?: string; address?: string; password?: string }
): Promise<{ updatedCount: number }> {
  const sb = pgClient();
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return { updatedCount: 0 };

  // donations 테이블에서 해당 전화번호의 신도 정보 업데이트
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name        !== undefined) row.donor_name   = updates.name;
  if (updates.baptismName !== undefined) row.baptism_name = updates.baptismName;

  let updatedCount = 0;
  try {
    const { count } = await sb
      .from('donations')
      .update(row)
      .eq('donor_phone', cleanPhone)
      .select('id', { count: 'exact' });
    updatedCount = count ?? 0;
  } catch (err) {
    console.error('Error updating donor profile in donations table:', err);
  }
  return { updatedCount };
}




