import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { tenantAPI } from '../api/client';

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
  paymentConfig?: {
    pgProvider: string; // 'toss' | 'inicis' | 'nice' | 'danal' 등
    apiKey: string;
    secretKey: string;
    mid: string; // Merchant ID
    isActive: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface DonationItem {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  amountType: 'fixed' | 'flexible';
  fixedAmount?: number;
  allowRecurring: boolean;
  allowOneTime: boolean;
  enablePrayerField: boolean;
  enabled: boolean;
}

export interface DonationFormData {
  itemId: string;
  itemName: string;
  amount: number;
  name: string;
  phone: string;
  prayerText?: string;
  familyMembers?: Array<{ name: string; birthDate: string; calendar: string }>;
  baptismName?: string;
  isRecurring: boolean;
  recurringDay?: number;
}

export interface AdminUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AppContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  donationFormData: DonationFormData | null;
  setDonationFormData: (data: DonationFormData | null) => void;
  currentAdmin: AdminUser | null;
  setCurrentAdmin: (admin: AdminUser | null) => void;
  tenants: Tenant[];
  fetchTenants: () => Promise<void>;
  updateTenantBanners: (tenantId: string, bannerImages: string[]) => Promise<void>;
  updateTenantInfo: (tenantId: string, tenant: Tenant) => Promise<void>;
  addTenant: (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const mockTenants: Tenant[] = [
  {
    id: '1',
    slug: 'joyful-church',
    name: '기쁨의교회',
    religionType: 'protestant',
    primaryColor: '#1976d2',
    logoUrl: 'https://images.unsplash.com/photo-1620495137036-fccf4af581bf?w=200',
    bannerImages: [
      'https://images.unsplash.com/photo-1772878490426-e1c25eff4dba?w=1200',
      'https://images.unsplash.com/photo-1620495137036-fccf4af581bf?w=1200',
    ],
    description: '예수 그리스도의 사랑과 은혜를 경험하고 나누는 교회입니다. 모든 사람이 환영받고, 하나님의 말씀으로 성장하며, 서로 랑하는 공동체를 만들어갑니다.',
    address: '서울특별시 강남구 테헤란로 123',
    contact: {
      phone: '02-1234-5678',
      email: 'info@joyful-church.org',
    },
    schedule: [
      { label: '주일 1부 예배', time: '오전 9:00' },
      { label: '주일 2부 예배', time: '오전 11:00' },
      { label: '수요예배', time: '오후 7:30' },
      { label: '금요기도회', time: '오후 7:30' },
    ],
    terminology: {
      donation: '헌금',
      member: '성도',
      prayer: '기도제목',
    },
  },
  {
    id: '2',
    slug: 'serenity-temple',
    name: '평화사찰',
    religionType: 'buddhist',
    primaryColor: '#ff6f00',
    logoUrl: 'https://images.unsplash.com/photo-1770149682823-0befb39aa86e?w=200',
    bannerImages: [
      'https://images.unsplash.com/photo-1573285702030-f7952e595655?w=1200',
      'https://images.unsplash.com/photo-1770149682823-0befb39aa86e?w=1200',
    ],
    description: '부처님의 자비와 지혜로 평화와 행복을 찾는 도량입니다. 참선과 수행을 통해 마음의 평안을 얻고, 자비와 나눔의 실천으로 세상에 빛을 전합니다.',
    address: '서울특별시 종로구 인사동길 45',
    contact: {
      phone: '02-2345-6789',
      email: 'info@serenity-temple.org',
    },
    schedule: [
      { label: '새벽예불', time: '오전 5:30' },
      { label: '일요법회', time: '오전 10:00' },
      { label: '수요법회', time: '오후 7:00' },
      { label: '참선수행', time: '매주 토요일 오후 2:00' },
    ],
    terminology: {
      donation: '보시',
      member: '불자',
      prayer: '발원문',
    },
  },
  {
    id: '3',
    slug: 'grace-cathedral',
    name: '은혜성당',
    religionType: 'catholic',
    primaryColor: '#7b1fa2',
    logoUrl: 'https://images.unsplash.com/photo-1761316945926-51b6c682c190?w=200',
    bannerImages: [
      'https://images.unsplash.com/photo-1623351151870-302b4199cee3?w=1200',
      'https://images.unsplash.com/photo-1761316945926-51b6c682c190?w=1200',
    ],
    description: '하느님의 사랑과 은총 안에서 신앙을 키우고 실천하는 본당입니다. 성찬의 신비를 체험하고, 이웃 사랑을 실천하며, 복음의 기쁨을 전하는 공동체입니다.',
    address: '서울특별시 중구 명동길 74',
    contact: {
      phone: '02-3456-7890',
      email: 'info@grace-cathedral.org',
    },
    schedule: [
      { label: '주일미사', time: '오전 9:00, 11:00, 오후 5:00' },
      { label: '평일미사', time: '오전 6:30, 오후 7:00' },
      { label: '토요미사', time: '오후 6:00' },
      { label: '고해성사', time: '매주 토요일 오후 4:00-5:30' },
    ],
    terminology: {
      donation: '봉헌',
      member: '교우',
      prayer: '미사지향',
    },
  },
];

export const mockDonationItems: Record<string, DonationItem[]> = {
  'protestant': [
    {
      id: '1',
      name: '십일조',
      description: '수입의 1/10을 드리는 정기 헌금입니다.',
      amountType: 'flexible',
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
    {
      id: '2',
      name: '감사헌금',
      description: '하나님의 은혜에 감사드리는 헌금입니다.',
      amountType: 'flexible',
      allowRecurring: false,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
    {
      id: '3',
      name: '건축헌금',
      description: '교회 건물 신축을 위한 특별헌금입니다.',
      amountType: 'flexible',
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: false,
      enabled: true,
    },
  ],
  'buddhist': [
    {
      id: '1',
      name: '인등보시',
      description: '법당 인등을 켜는 보시입니다.',
      amountType: 'fixed',
      fixedAmount: 30000,
      allowRecurring: false,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
    {
      id: '2',
      name: '불사공양',
      description: '사찰 불사를 위한 공양입니다.',
      amountType: 'flexible',
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
    {
      id: '3',
      name: '기도보시',
      description: '기도 정성을 담은 보시입니다.',
      amountType: 'flexible',
      allowRecurring: false,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
  ],
  'catholic': [
    {
      id: '1',
      name: '교무금',
      description: '본당 운영을 위한 정기 봉헌입니다.',
      amountType: 'flexible',
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: false,
      enabled: true,
    },
    {
      id: '2',
      name: '미사예물',
      description: '미사 지향을 위한 예물입니다.',
      amountType: 'fixed',
      fixedAmount: 10000,
      allowRecurring: false,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
    {
      id: '3',
      name: '특별봉헌',
      description: '특별한 의향을 위한 봉헌입니다.',
      amountType: 'flexible',
      allowRecurring: false,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
  ],
};

// Mock admin users - 각 단체별로 관리자 계정
export const mockAdmins: AdminUser[] = [
  {
    id: 'system_admin',
    tenantId: 'system', // 통합관리자는 특정 단체에 속하지 않음
    email: 'admin@faithpay.com',
    name: '시스템 관리자',
    role: 'system_admin',
  },
  {
    id: 'admin1',
    tenantId: '1',
    email: 'admin@joyful-church.org',
    name: '김목사',
    role: 'tenant_admin',
  },
  {
    id: 'admin2',
    tenantId: '2',
    email: 'admin@serenity-temple.org',
    name: '혜민스님',
    role: 'tenant_admin',
  },
  {
    id: 'admin3',
    tenantId: '3',
    email: 'admin@grace-cathedral.org',
    name: '베드로신부',
    role: 'tenant_admin',
  },
  {
    id: 'finance1',
    tenantId: '1',
    email: 'finance@joyful-church.org',
    name: '이집사',
    role: 'finance_manager',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [donationFormData, setDonationFormData] = useState<DonationFormData | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.getTenants();
      if (response.success && response.data) {
        setTenants(response.data);
      } else {
        console.error('Failed to fetch tenants:', response.error);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  }, []);

  const updateTenantBanners = useCallback(async (tenantId: string, bannerImages: string[]) => {
    try {
      const response = await tenantAPI.updateTenantBanners(tenantId, bannerImages);
      if (response.success && response.data) {
        setTenants(prevTenants =>
          prevTenants.map(tenant =>
            tenant.id === tenantId ? { ...tenant, bannerImages: response.data!.bannerImages } : tenant
          )
        );
      } else {
        console.error('Failed to update tenant banners:', response.error);
      }
    } catch (error) {
      console.error('Failed to update tenant banners:', error);
    }
  }, []);

  const updateTenantInfo = useCallback(async (tenantId: string, tenant: Tenant) => {
    try {
      const response = await tenantAPI.updateTenantInfo(tenantId, tenant);
      if (response.success && response.data) {
        setTenants(prevTenants =>
          prevTenants.map(t =>
            t.id === tenantId ? { ...t, ...response.data } : t
          )
        );
      } else {
        console.error('Failed to update tenant info:', response.error);
      }
    } catch (error) {
      console.error('Failed to update tenant info:', error);
    }
  }, []);

  const addTenant = useCallback(async (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await tenantAPI.addTenant(tenant);
      if (response.success && response.data) {
        setTenants(prevTenants => [...prevTenants, response.data!]);
      } else {
        console.error('Failed to add tenant:', response.error);
      }
    } catch (error) {
      console.error('Failed to add tenant:', error);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentTenant,
        setCurrentTenant,
        donationFormData,
        setDonationFormData,
        currentAdmin,
        setCurrentAdmin,
        tenants,
        fetchTenants,
        updateTenantBanners,
        updateTenantInfo,
        addTenant,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}