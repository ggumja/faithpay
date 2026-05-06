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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  async delete(id: string): Promise<APIResponse<void>> {
    return fetchAPI<void>(`/tenants/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== PAYMENT CONFIG API ====================

export const paymentAPI = {
  async getConfig(tenantId: string): Promise<APIResponse<PaymentConfig>> {
    return fetchAPI<PaymentConfig>(`/payment/${tenantId}`);
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