/**
 * API Client for FaithPay Backend
 * 
 * Supabase Edge Function과 통신하는 클라이언트입니다.
 */

import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import type { Tenant, DonationItem, AdminUser } from '../context/AppContext';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7`;

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Donation {
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

interface PaymentConfig {
  tenantId: string;
  pgProvider: string;
  apiKey: string;
  secretKey: string;
  mid: string;
  loginId?: string;
  iv?: string;
  ver?: string;
  isActive: boolean;
  updatedAt: string;
}

interface MonthlyStats {
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

// ==================== HELPER FUNCTIONS ====================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    const cleanEndpoint = endpoint.replace(/^\/make-server-d0d82cc7/, '');
    const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API Error (${endpoint}):`, data);
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error(`Network Error (${endpoint}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ==================== TENANT API ====================

export const tenantAPI = {
  async getTenants(): Promise<APIResponse<Tenant[]>> {
    return fetchAPI<Tenant[]>('/tenants');
  },

  async getAll(): Promise<APIResponse<Tenant[]>> {
    return fetchAPI<Tenant[]>('/tenants');
  },

  async getById(id: string): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}`);
  },

  async getBySlug(slug: string): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/slug/${slug}`);
  },

  async create(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenant),
    });
  },

  async addTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenant),
    });
  },

  async update(id: string, updates: Partial<Tenant>): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async updateTenantInfo(id: string, tenant: Tenant): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenant),
    });
  },

  async updateTenantBanners(id: string, bannerImages: string[]): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ bannerImages }),
    });
  },

  async approveTenant(id: string, tempPassword?: string): Promise<APIResponse<{ tenant: Tenant; tempPassword: string }>> {
    return fetchAPI<{ tenant: Tenant; tempPassword: string }>(`/tenants/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ tempPassword }),
    });
  },

  async updateStatus(id: string, status: 'active' | 'pending' | 'suspended'): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async delete(id: string): Promise<APIResponse<void>> {
    return fetchAPI<void>(`/tenants/${id}`, {
      method: 'DELETE',
    });
  },

  // 승인 대기 단체 목록
  async getPending(): Promise<APIResponse<Tenant[]>> {
    return fetchAPI<Tenant[]>('/tenants/pending');
  },

  // 단체 입점 승인 (새 엔드포인트)
  async approvePending(id: string): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}/approve`, {
      method: 'PUT',
    });
  },

  // 단체 입점 거절
  async rejectPending(id: string): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/tenants/${id}/reject`, {
      method: 'PUT',
    });
  },
};

// ==================== PAYMENT CONFIG API ====================

export const paymentAPI = {
  async getConfig(tenantId: string): Promise<APIResponse<PaymentConfig>> {
    try {
      const res = await fetchAPI<PaymentConfig>(`/payment/${tenantId}`);
      if (res.success && res.data) {
        return res;
      }
      throw new Error(res.error || 'Config not found');
    } catch (e) {
      console.warn('getConfig failed, falling back to localStorage:', e);
      const local = localStorage.getItem(`paymentConfig_${tenantId}`);
      if (local) {
        return { success: true, data: JSON.parse(local) };
      }
      return { success: false, error: 'Config not found' };
    }
  },

  async saveConfig(
    tenantId: string,
    config: Omit<PaymentConfig, 'tenantId' | 'updatedAt'>
  ): Promise<APIResponse<PaymentConfig>> {
    return fetchAPI<PaymentConfig>(`/payment/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async deleteConfig(tenantId: string): Promise<APIResponse<void>> {
    return fetchAPI<void>(`/payment/${tenantId}`, {
      method: 'DELETE',
    });
  },

  async processManual(payload: any): Promise<APIResponse<any>> {
    return fetchAPI<any>('/payment/process/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async processCertRequest(payload: {
    tenantId: string;
    donationData: any;
    deviceType: 'pc' | 'mobile';
    payWay: 'card' | 'vbank' | 'dbank';
  }): Promise<APIResponse<any>> {
    return fetchAPI<any>('/payment/process/cert/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancelPayment(tenantId: string, donationId: string): Promise<APIResponse<any>> {
    return fetchAPI<any>('/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ tenantId, donationId }),
    });
  },

  async processBillKeyRequest(payload: { tenantId: string; donationData: any }): Promise<APIResponse<any>> {
    return fetchAPI<any>('/payment/process/billkey/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ==================== SMS OTP & SUBSCRIPTION API ====================

export const otpAuthAPI = {
  async sendOtp(phone: string): Promise<APIResponse<{ message: string }>> {
    return fetchAPI<{ message: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(phone: string, otpCode: string): Promise<APIResponse<{ token: string; subscriptions: any[]; donations: any[] }>> {
    return fetchAPI<{ token: string; subscriptions: any[]; donations: any[] }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otpCode }),
    });
  },
};

export const subscriptionAPI = {
  async updateStatus(id: string, status: 'active' | 'paused' | 'cancelled'): Promise<APIResponse<{ subscription: any }>> {
    return fetchAPI<{ subscription: any }>(`/subscriptions/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};

// ==================== DONATION ITEMS API ====================

export const donationItemsAPI = {
  async getItems(tenantId: string): Promise<APIResponse<DonationItem[]>> {
    return fetchAPI<DonationItem[]>(`/donation-items/${tenantId}`);
  },

  async saveItems(tenantId: string, items: DonationItem[]): Promise<APIResponse<DonationItem[]>> {
    return fetchAPI<DonationItem[]>(`/donation-items/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(items),
    });
  },
};

// ==================== DONATION API ====================

export const donationAPI = {
  async getAll(): Promise<APIResponse<Donation[]>> {
    return fetchAPI<Donation[]>('/donations');
  },

  async getByTenant(tenantId: string): Promise<APIResponse<Donation[]>> {
    return fetchAPI<Donation[]>(`/donations/${tenantId}`);
  },

  async create(donation: Omit<Donation, 'createdAt' | 'updatedAt'>): Promise<APIResponse<Donation>> {
    return fetchAPI<Donation>('/donations', {
      method: 'POST',
      body: JSON.stringify(donation),
    });
  },

  async update(
    tenantId: string,
    id: string,
    updates: Partial<Donation>
  ): Promise<APIResponse<Donation>> {
    return fetchAPI<Donation>(`/donations/${tenantId}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ==================== ADMIN API ====================

export const adminAPI = {
  async login(email: string, password: string): Promise<APIResponse<AdminUser>> {
    return fetchAPI<AdminUser>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(admin: Omit<AdminUser, 'createdAt' | 'updatedAt'>): Promise<APIResponse<AdminUser>> {
    return fetchAPI<AdminUser>('/admin/register', {
      method: 'POST',
      body: JSON.stringify(admin),
    });
  },

  async getAll(): Promise<APIResponse<AdminUser[]>> {
    return fetchAPI<AdminUser[]>('/admin');
  },
};

// ==================== PARTNER API ====================

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'master_agency' | 'sales_agent'; // 대리점 vs 영업자
  parentId?: string; // 상위 대리점 ID
  commissionRate: number; // 수수료율 (%)
  referralCode: string; // 영업자 추천코드 (예: AGENT_KIM)
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  tenantId: string;
  tenantName: string;
  donationId: string;
  donationAmount: number;
  commissionAmount: number;
  settlementStatus: 'pending' | 'paid';
  createdAt: string;
  agencyRate?: number;    // 대리점 마진율
  floorRate?: number;     // 영업자 베이스 수수료율
  contractRate?: number;  // 가맹점 계약 수수료율
}

/** 메인 관리자 집행 정산 (batch 단위 입금 확정본) */
export interface PartnerSettlement {
  id: string;
  partnerId: string;
  partnerName: string;
  periodStart: string;         // 정산 대상 시작일
  periodEnd: string;           // 정산 대상 종료일
  totalCommission: number;     // 수수료 합계
  taxAmount: number;           // 세무 처리금액 (VAT 10% or 원천징수 3.3%)
  netAmount: number;           // 실수령액 (= totalCommission +/- taxAmount)
  taxType: 'vat' | 'withholding'; // 세무 유형
  status: 'scheduled' | 'processing' | 'paid' | 'cancelled';
  settledAt?: string;          // 실제 입금일
  note?: string;
  agentBreakdowns?: {          // 영업자별 하위 지급 명세 (대리점 전용)
    agentId: string;
    agentName: string;
    commissionAmount: number;
    agencyMargin: number;      // 대리점 차감 마진
    agentReceived: number;     // 영업자 실수령액
  }[];
  createdAt: string;
}

export const partnerAPI = {
  async getAll(): Promise<APIResponse<Partner[]>> {
    return fetchAPI<Partner[]>('/partners');
  },

  async getPartners(): Promise<APIResponse<Partner[]>> {
    return fetchAPI<Partner[]>('/partners');
  },

  async getById(id: string): Promise<APIResponse<Partner>> {
    return fetchAPI<Partner>(`/partners/${id}`);
  },

  async createPartner(partner: Omit<Partner, 'id' | 'createdAt'>): Promise<APIResponse<Partner>> {
    return fetchAPI<Partner>('/partners', {
      method: 'POST',
      body: JSON.stringify(partner),
    });
  },

  async getCommissions(partnerId: string): Promise<APIResponse<PartnerCommission[]>> {
    return fetchAPI<PartnerCommission[]>(`/partners/${partnerId}/commissions`);
  },

  async getByParent(parentId: string): Promise<APIResponse<Partner[]>> {
    return fetchAPI<Partner[]>(`/partners?parentId=${parentId}`);
  },

  /** 대리점이 소속 영업자의 channelShareRate(채널풀 배분율 %)를 설정 */
  async updateAgentRate(agentId: string, channelShareRate: number): Promise<APIResponse<Partner>> {
    return fetchAPI<Partner>(`/partners/${agentId}/channel-share`, {
      method: 'PATCH',
      body: JSON.stringify({ channelShareRate }),
    });
  },

  async createTenantByPartner(partnerId: string, tenantData: any): Promise<APIResponse<Tenant>> {
    return fetchAPI<Tenant>(`/partners/${partnerId}/tenants`, {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  },

  /** 대리점 정산 내역 조회 (API 없으면 localStorage mock fallback) */
  async getSettlements(partnerId: string): Promise<APIResponse<PartnerSettlement[]>> {
    try {
      const res = await fetchAPI<PartnerSettlement[]>(`/partners/${partnerId}/settlements`);
      if (res.success && res.data && res.data.length > 0) return res;
    } catch {}
    // localStorage mock (API 구현 전 데모데이터)
    const key = `faithpay:settlements:${partnerId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { success: true, data: JSON.parse(raw) };
    } catch {}
    // 기본 데모 데이터
    const demo: PartnerSettlement[] = [
      {
        id: 'stl-001', partnerId, partnerName: '',
        periodStart: '2026-08-01', periodEnd: '2026-08-15',
        totalCommission: 284000, taxAmount: 28400, netAmount: 312400,
        taxType: 'vat', status: 'paid', settledAt: '2026-08-16T09:00:00',
        note: '8월 상반기 정산', createdAt: '2026-08-16T09:00:00',
        agentBreakdowns: [
          { agentId: 'ag-1', agentName: '이수진', commissionAmount: 120000, agencyMargin: 12000, agentReceived: 108000 },
          { agentId: 'ag-2', agentName: '한수진', commissionAmount: 96000,  agencyMargin: 9600,  agentReceived: 86400 },
        ],
      },
      {
        id: 'stl-002', partnerId, partnerName: '',
        periodStart: '2026-07-16', periodEnd: '2026-07-31',
        totalCommission: 196000, taxAmount: 19600, netAmount: 215600,
        taxType: 'vat', status: 'paid', settledAt: '2026-08-01T09:00:00',
        note: '7월 하반기 정산', createdAt: '2026-08-01T09:00:00',
        agentBreakdowns: [
          { agentId: 'ag-1', agentName: '이수진', commissionAmount: 84000, agencyMargin: 8400, agentReceived: 75600 },
          { agentId: 'ag-2', agentName: '한수진', commissionAmount: 72000, agencyMargin: 7200, agentReceived: 64800 },
        ],
      },
      {
        id: 'stl-003', partnerId, partnerName: '',
        periodStart: '2026-08-16', periodEnd: '2026-08-31',
        totalCommission: 0, taxAmount: 0, netAmount: 0,
        taxType: 'vat', status: 'scheduled',
        note: '8월 하반기 정산 (예정)', createdAt: new Date().toISOString(),
      },
    ];
    return { success: true, data: demo };
  },

  /** 영업자 포털 전용 선상위 대리점으로부터의 렬다운 정산 */
  async getAgentSettlements(agentId: string): Promise<APIResponse<PartnerSettlement[]>> {
    try {
      const res = await fetchAPI<PartnerSettlement[]>(`/partners/${agentId}/agent-settlements`);
      if (res.success && res.data && res.data.length > 0) return res;
    } catch {}
    const demo: PartnerSettlement[] = [
      {
        id: 'astl-001', partnerId: agentId, partnerName: '',
        periodStart: '2026-08-01', periodEnd: '2026-08-15',
        totalCommission: 108000, taxAmount: 3564, netAmount: 104436,
        taxType: 'withholding', status: 'paid', settledAt: '2026-08-16T09:00:00',
        note: '8월 상반기 정산 (대리점 지급)', createdAt: '2026-08-16T09:00:00',
      },
      {
        id: 'astl-002', partnerId: agentId, partnerName: '',
        periodStart: '2026-07-16', periodEnd: '2026-07-31',
        totalCommission: 75600, taxAmount: 2494, netAmount: 73106,
        taxType: 'withholding', status: 'paid', settledAt: '2026-08-01T09:00:00',
        note: '7월 하반기 정산 (대리점 지급)', createdAt: '2026-08-01T09:00:00',
      },
      {
        id: 'astl-003', partnerId: agentId, partnerName: '',
        periodStart: '2026-08-16', periodEnd: '2026-08-31',
        totalCommission: 0, taxAmount: 0, netAmount: 0,
        taxType: 'withholding', status: 'scheduled',
        note: '8월 하반기 정산 예정', createdAt: new Date().toISOString(),
      },
    ];
    return { success: true, data: demo };
  },

  /** updateProfile: 연락정보 + 정산계좌 수정 */
};

// ==================== STATISTICS API ====================

export const statsAPI = {
  async getMonthly(
    tenantId: string,
    year: number,
    month: number
  ): Promise<APIResponse<MonthlyStats>> {
    return fetchAPI<MonthlyStats>(`/stats/${tenantId}/${year}/${month}`);
  },

  async recalculate(
    tenantId: string,
    year: number,
    month: number
  ): Promise<APIResponse<MonthlyStats>> {
    return fetchAPI<MonthlyStats>(`/stats/${tenantId}/${year}/${month}/recalculate`, {
      method: 'POST',
    });
  },
};

// ==================== HEALTH CHECK ====================

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Export all
export type { Donation, PaymentConfig, MonthlyStats };