import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { tenantAPI } from '../api/client';
import { toast } from 'sonner';

export type ReligionType = 'protestant' | 'buddhist' | 'catholic' | 'charity' | 'general';
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
  uniqueNumberFile?: string;          // 고유번호증 사본 파일 첨부 (선택)
  businessRegistrationNumber?: string; // 수익사업용 사업자등록번호 (선택사항, 바자회/물품 판매용)
  businessRegistrationFile?: string;   // 사업자등록증 사본 파일 첨부 (선택)
  businessInfo?: {
    uniqueNumber?: string;
    uniqueNumberFile?: string;
    registrationNumber?: string;
    registrationFile?: string;
    address?: string;
    representativeName?: string;
    taxInvoiceEmail?: string;
  };
  contact: {
    phone: string;
    email: string;
    name?: string;       // 담당자 이름
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
    pgProvider: string;
    apiKey: string;
    secretKey: string;
    mid: string;
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
    providerConfigs?: Record<string, {
      providerCode: string;
      providerName: string;
      merchantId?: string;
      clientKey?: string;
      secretKey?: string;
      mode: 'test' | 'live';
      isEnabled: boolean;
      configMetadata?: Record<string, any>;
    }>;
    loginId?: string;
    iv?: string;
    ver?: string;
    enableCard?: boolean;
    enableEasyPayment?: boolean;
    enableVBank?: boolean;
    isActive: boolean;
  };
  // 입점 상태 (시스템 관리자용)
  status?: 'pending' | 'active' | 'suspended';
  appliedAt?: string;    // 입점 신청일
  approvedAt?: string;   // 승인일
  // 파트너 신청 시 추가 필드
  adminName?: string;    // 대표 관리자 성함
  adminPhone?: string;   // 대표 관리자 휴대폰
  referralCode?: string; // 연결된 파트너 코드
  // 신청 경로 구분
  registrationSource?: 'self' | 'agency' | 'agent'; // self=직접신청, agency=대리점등록, agent=영업자등록
  registeredByPartnerId?: string;   // 등록한 파트너 ID
  registeredByPartnerName?: string; // 등록한 파트너 이름
  registeredByReferralCode?: string; // 등록한 파트너 추천코드
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
  email?: string;
  prayerText?: string;
  familyMembers?: Array<{ name: string; birthDate: string; calendar: string }>;
  baptismName?: string;
  isRecurring: boolean;
  paymentMethod?: string;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
  recurringDay?: number;
  recurringDayOfWeek?: string;
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
  getTenantDonationItems: (tenant: Tenant) => DonationItem[];
  saveDonationItem: (tenantId: string, religionType: string, itemData: Partial<DonationItem>) => void;
  deleteDonationItem: (tenantId: string, religionType: string, itemId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const defaultTenants: Tenant[] = [];



// Legacy export compatibility
export const mockTenants: Tenant[] = [];


export const mockDonationItems: Record<string, DonationItem[]> = {};


export const mockAdmins: AdminUser[] = [];



export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faithpay_current_tenant');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [donationFormData, setDonationFormData] = useState<DonationFormData | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('faithpay_donation_form_data');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faithpay_current_admin');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.role) return parsed;
        } catch (e) {}
      }
    }
    return {
      id: 'system_admin',
      tenantId: 'system',
      email: 'admin@faithpay.kr',
      name: '시스템 최고 관리자',
      role: 'system_admin',
    };
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);


  // DB 기반 실시간 단체(가맹점) 데이터 동기화 및 PG 설정 보완
  const syncTenantsWithDB = useCallback(async () => {
    try {
      const res = await tenantAPI.getAll();
      let list = (res.success && Array.isArray(res.data) && res.data.length > 0)
        ? res.data
        : defaultTenants;

      const existingSlugs = new Set(list.map(t => t.slug));
      const missingDefaults = defaultTenants.filter(d => !existingSlugs.has(d.slug));
      list = [...list, ...missingDefaults];

      // 저장된 PG 설정(localStorage) 병합 및 각원사/명성교회 기본 PG 보장
      const finalTenants = list.map(t => {
        let currentConfig = t.paymentConfig;
        try {
          const savedConfigStr = localStorage.getItem(`paymentConfig_${t.id}`) || localStorage.getItem(`paymentConfig_${t.slug}`);
          if (savedConfigStr) {
            const parsedConfig = JSON.parse(savedConfigStr);
            if (parsedConfig && (parsedConfig.pgProvider || parsedConfig.kakaoCid)) {
              currentConfig = { ...(currentConfig || {}), ...parsedConfig };
            }
          }
        } catch (e) {}

        if (!currentConfig && (t.slug === 'gakwonsa' || t.id === 'gakwonsa' || t.id === 'tenant-gakwonsa')) {
          currentConfig = {
            tenantId: t.id,
            pgProvider: 'toss',
            mid: 'toss_mid_gakwonsa',
            apiKey: 'test_ck_D5Ge233da91z4961zP0g3N7kE1a3',
            secretKey: 'test_sk_zXLk50y4qe0912',
            contractRate: 3.0,
            payoutCycle: 'D+1',
            kakaoCid: 'TC0ONETIME',
            kakaoSecretKey: 'DEV_SECRET_KEY',
            kakaoMode: 'test',
            enableCard: true,
            enableEasyPayment: true,
            enableVBank: true,
            isActive: true,
          };
        }

        return {
          ...t,
          paymentConfig: currentConfig,
        };
      });

      setTenants(finalTenants);
    } catch (e) {
      console.warn('Failed to sync tenants with DB:', e);
    }
  }, []);

  React.useEffect(() => {
    syncTenantsWithDB();
  }, [syncTenantsWithDB]);


  React.useEffect(() => {
    if (currentAdmin) {
      localStorage.setItem('faithpay_current_admin', JSON.stringify(currentAdmin));
    } else {
      localStorage.removeItem('faithpay_current_admin');
    }
  }, [currentAdmin]);

  React.useEffect(() => {
    if (currentTenant) {
      localStorage.setItem('faithpay_current_tenant', JSON.stringify(currentTenant));
    } else {
      localStorage.removeItem('faithpay_current_tenant');
    }
  }, [currentTenant]);

  React.useEffect(() => {
    if (donationFormData) {
      sessionStorage.setItem('faithpay_donation_form_data', JSON.stringify(donationFormData));
    } else {
      sessionStorage.removeItem('faithpay_donation_form_data');
    }
  }, [donationFormData]);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.getTenants();
      let finalTenants: Tenant[] = defaultTenants;

      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const dbTenants = response.data;
        const existingSlugs = new Set(dbTenants.map(t => t.slug));
        const missingDefaults = defaultTenants.filter(d => !existingSlugs.has(d.slug));
        finalTenants = [...dbTenants, ...missingDefaults];
      }

      // 로컬 스토리지 수정사항 병합
      try {
        const localTenantsStr = localStorage.getItem('tenants');
        if (localTenantsStr) {
          const localList: Tenant[] = JSON.parse(localTenantsStr);
          if (Array.isArray(localList) && localList.length > 0) {
            const localMap = new Map(localList.map(t => [t.id || t.slug, t]));
            finalTenants = finalTenants.map(t => {
              const matched = localMap.get(t.id) || localMap.get(t.slug);
              return matched ? { ...t, ...matched } : t;
            });
          }
        }
      } catch (e) {}

      // 저장된 PG 설정(localStorage) 반영 및 각원사/명성교회 기본 PG 보장
      finalTenants = finalTenants.map(t => {
        let currentConfig = t.paymentConfig;
        try {
          const savedConfigStr = localStorage.getItem(`paymentConfig_${t.id}`) || localStorage.getItem(`paymentConfig_${t.slug}`);
          if (savedConfigStr) {
            const parsedConfig = JSON.parse(savedConfigStr);
            if (parsedConfig && parsedConfig.pgProvider) {
              currentConfig = parsedConfig;
            }
          }
        } catch (e) {}



        if (!currentConfig && (t.slug === 'gakwonsa' || t.id === 'gakwonsa')) {
          currentConfig = {
            tenantId: t.id,
            pgProvider: 'toss',
            mid: 'toss_mid_gakwonsa',
            apiKey: 'test_ck_D5Ge233da91z4961zP0g3N7kE1a3',
            secretKey: 'test_sk_zXLk50y4qe0912',
            contractRate: 3.0,
            payoutCycle: 'D+1',
            kakaoCid: 'TC0ONETIME',
            kakaoSecretKey: 'DEV_SECRET_KEY',
            kakaoMode: 'test',
            enableCard: true,
            enableEasyPayment: true,
            enableVBank: true,
            isActive: true,
          };
        }

        return {
          ...t,
          paymentConfig: currentConfig,
        };
      });
      setTenants(finalTenants);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  }, []);

  React.useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const updateTenantBanners = useCallback(async (tenantId: string, bannerImages: string[]) => {
    // DB API 연동 업데이트
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, bannerImages } : t));

    try {
      const response = await tenantAPI.updateTenantBanners(tenantId, bannerImages);
      if (response.success && response.data) {
        toast.success('배너가 DB에 저장되었습니다.');
      } else {
        toast.success('배너가 저장되었습니다.');
      }
    } catch (error) {
      console.error('Failed to update tenant banners on server:', error);
      toast.success('배너가 메모리에 저장되었습니다.');
    }
  }, []);

  const updateTenantInfo = useCallback(async (tenantId: string, tenant: Tenant) => {
    try {
      const response = await tenantAPI.updateTenantInfo(tenantId, tenant);
      if (response.success && response.data) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...response.data } : t));
        toast.success('단체 정보가 DB에 저장되었습니다.');
      } else {
        toast.error('DB 정보 저장 실패: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to update tenant info on server:', error);
      toast.error('DB 정보 저장 중 에러가 발생했습니다.');
    }
  }, []);


  const addTenant = useCallback(async (newTenantData: Omit<Tenant, 'createdAt' | 'updatedAt'>) => {
    const newId = newTenantData.id || `tenant-${Date.now()}`;
    const newTenant: Tenant = {
      id: newId,

      logoUrl: newTenantData.logoUrl || 'https://images.unsplash.com/photo-1620495137036-fccf4af581bf?w=200',
      bannerImages: newTenantData.bannerImages && newTenantData.bannerImages.length > 0
        ? newTenantData.bannerImages
        : ['https://images.unsplash.com/photo-1772878490426-e1c25eff4dba?w=1200'],
      description: newTenantData.description || '새로운 단체입니다.',
      schedule: newTenantData.schedule || [],
      terminology: {
        donation: newTenantData.terminology?.donation || (newTenantData.religionType === 'protestant' ? '헌금' : newTenantData.religionType === 'buddhist' ? '보시' : '봉헌'),
        member: newTenantData.terminology?.member || (newTenantData.religionType === 'protestant' ? '성도' : newTenantData.religionType === 'buddhist' ? '불자' : '교우'),
        prayer: newTenantData.terminology?.prayer || (newTenantData.religionType === 'protestant' ? '기도제목' : newTenantData.religionType === 'buddhist' ? '발원문' : '미사지향'),
      },
      ...newTenantData,
    };

    try {
      const response = await tenantAPI.addTenant(newTenant);
      if (response.success && response.data) {
        setTenants(prev => [...prev, response.data!]);
        toast.success('단체가 DB에 성공적으로 등록되었습니다.');
      } else {
        toast.error('DB 단체 등록 실패: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to add tenant on server:', error);
      toast.error('DB 단체 등록 중 에러가 발생했습니다.');
    }
  }, []);


  // 테넌트별 봉헌 항목 상태 및 localStorage 초기화
  const [allDonationItems, setAllDonationItems] = useState<Record<string, DonationItem[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faithpay_donation_items');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Failed to parse faithpay_donation_items:', e);
        }
      }
    }
    return mockDonationItems;
  });

  const getTenantDonationItems = useCallback((tenant: Tenant): DonationItem[] => {
    // 1. tenantId 기반 항목 검색
    if (allDonationItems[tenant.id]) {
      return allDonationItems[tenant.id];
    }
    // 2. slug 기반 검색
    if (allDonationItems[tenant.slug]) {
      return allDonationItems[tenant.slug];
    }
    // 3. 종교유형 기반 검색 (기본값)
    return allDonationItems[tenant.religionType] || mockDonationItems[tenant.religionType] || [];
  }, [allDonationItems]);

  const saveDonationItem = useCallback((tenantIdOrSlug: string, religionType: string, itemData: Partial<DonationItem>) => {
    setAllDonationItems(prev => {
      const currentList = prev[tenantIdOrSlug] || prev[religionType] || mockDonationItems[religionType] || [];
      let updatedList: DonationItem[];

      if (itemData.id) {
        // 기존 수정
        updatedList = currentList.map(item => item.id === itemData.id ? { ...item, ...itemData } as DonationItem : item);
      } else {
        // 신규 추가
        const newItem: DonationItem = {
          id: `item-${Date.now()}`,
          name: itemData.name || '새 항목',
          description: itemData.description || '',
          amountType: itemData.amountType || 'flexible',
          fixedAmount: itemData.fixedAmount,
          allowRecurring: itemData.allowRecurring ?? true,
          allowOneTime: itemData.allowOneTime ?? true,
          enablePrayerField: itemData.enablePrayerField ?? true,
          enabled: itemData.enabled ?? true,
        };
        updatedList = [...currentList, newItem];
      }

      const nextState = {
        ...prev,
        [tenantIdOrSlug]: updatedList,
        [religionType]: updatedList, // 종교유형 키에도 함께 연동
      };

      try {
        localStorage.setItem('faithpay_donation_items', JSON.stringify(nextState));
      } catch (e) {
        console.warn('Failed to save faithpay_donation_items:', e);
      }

      // mockDonationItems 메모리 참조도 업데이트
      mockDonationItems[religionType] = updatedList;

      // Supabase DB 비동기 서버 연동
      donationItemsAPI.saveItems(tenantIdOrSlug, updatedList).catch((err) => {
        console.warn('Supabase DB saveItems failed, kept in local state:', err);
      });

      return nextState;
    });
  }, []);

  const deleteDonationItem = useCallback((tenantIdOrSlug: string, religionType: string, itemId: string) => {
    setAllDonationItems(prev => {
      const currentList = prev[tenantIdOrSlug] || prev[religionType] || mockDonationItems[religionType] || [];
      const updatedList = currentList.filter(item => item.id !== itemId);

      const nextState = {
        ...prev,
        [tenantIdOrSlug]: updatedList,
        [religionType]: updatedList,
      };

      try {
        localStorage.setItem('faithpay_donation_items', JSON.stringify(nextState));
      } catch (e) {
        console.warn('Failed to save faithpay_donation_items:', e);
      }

      mockDonationItems[religionType] = updatedList;

      // Supabase DB 비동기 서버 연동
      donationItemsAPI.saveItems(tenantIdOrSlug, updatedList).catch((err) => {
        console.warn('Supabase DB delete saveItems failed, kept in local state:', err);
      });

      return nextState;
    });
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
        getTenantDonationItems,
        saveDonationItem,
        deleteDonationItem,
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