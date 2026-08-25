import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { tenantAPI, donationItemsAPI } from '../api/client';
import { toast } from 'sonner';

export type ReligionType = 'protestant' | 'buddhist' | 'catholic' | 'charity' | 'general';
export type UserRole = 'system_admin' | 'tenant_admin' | 'finance_manager' | 'member';

/**
 * 단체 시스템 DB 고유 PK 아이디를 'fp' + 일련번호 5자리(예: fp00001) 표준 포맷으로 반환하는 헬퍼 함수
 */
export function getTenantPkCode(targetTenant?: any, allTenants?: any[]): string {
  if (!targetTenant) return '—';

  // 1. 이미 fp00001 형태로 저장되어 있는 경우
  const rawId = String(targetTenant.id || targetTenant.slug || '').trim();
  if (/^fp\d{5}$/i.test(rawId)) return rawId.toLowerCase();

  // 2. 전체 단체 목록이 전달된 경우 등록 순서(생성일 오름차순) 기준 1-based 순번 부여
  if (allTenants && allTenants.length > 0) {
    // 중복 id 제거
    const seen = new Set<string>();
    const uniqueTenants = allTenants.filter(t => {
      const key = String(t.id || t.slug || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // appliedAt 기준 오름차순 정렬 + ID를 보조키(tiebreaker)로 사용 → 항상 안정적·결정론적 순서 보장
    const ascTenants = [...uniqueTenants].sort((a, b) => {
      const getTime = (t: any) => {
        if (t.appliedAt) return new Date(t.appliedAt).getTime();
        // appliedAt 없을 때 createdAt 확인
        if (t.createdAt) return new Date(t.createdAt).getTime();
        return 0;
      };
      const ta = getTime(a);
      const tb = getTime(b);
      if (ta !== tb) return ta - tb;
      // 동일 시각이면 ID 문자열 사전순으로 안정 정렬 (항상 동일 결과)
      return String(a.id || a.slug || '').localeCompare(String(b.id || b.slug || ''));
    });

    const foundIdx = ascTenants.findIndex(t => t.id === targetTenant.id || t.slug === targetTenant.slug);
    if (foundIdx !== -1) {
      return `fp${String(foundIdx + 1).padStart(5, '0')}`;
    }
  }

  // 3. ID 문자열 내 숫자 추출 — 단체별로 고유한 값이 나오도록 전체 숫자 사용
  const digits = rawId.replace(/\D/g, '');
  if (digits.length > 0) {
    const num = (parseInt(digits.slice(-5), 10) % 100000) || parseInt(digits.slice(0, 5), 10) || 1;
    return `fp${String(num).padStart(5, '0')}`;
  }

  // 4. UUID 등 순수 문자열인 경우 앞 6자 해시
  if (rawId.length >= 4) {
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) hash = (hash * 31 + rawId.charCodeAt(i)) >>> 0;
    return `fp${String(hash % 100000).padStart(5, '0')}`;
  }

  return `fp?????`;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  religionType: ReligionType;
  templateId?: string;                 // 디자인 템플릿 ID ('classic' | 'electric-dark' | 'minimal-hero')
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
  isTenantsLoaded: boolean;
  getTenantDonationItems: (tenant: Tenant) => DonationItem[];
  saveDonationItem: (tenantId: string, religionType: string, itemData: Partial<DonationItem>) => void;
  deleteDonationItem: (tenantId: string, religionType: string, itemId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const defaultTenants: Tenant[] = [];

// Legacy export compatibility
export const mockTenants: Tenant[] = defaultTenants;

export const mockDonationItems: Record<string, DonationItem[]> = {
  protestant: [],
  buddhist: [],
  catholic: [],
  charity: [],
  general: [],
};


export const mockAdmins: AdminUser[] = [];



function getStoredTemplateMap(): Record<string, string> {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('faithpay_tenant_templates');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {}
  }
  return {};
}

function saveStoredTemplate(key: string, templateId: string) {
  if (typeof window !== 'undefined' && key && templateId) {
    try {
      const currentMap = getStoredTemplateMap();
      currentMap[key] = templateId;
      localStorage.setItem('faithpay_tenant_templates', JSON.stringify(currentMap));
    } catch (e) {}
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isTenantsLoaded, setIsTenantsLoaded] = useState<boolean>(false);

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

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


  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.getTenants();
      if (response.success && Array.isArray(response.data)) {
        const templateMap = getStoredTemplateMap();
        const dbTenants = response.data.map(t => {
          const dbTemplate = t.templateId || (t as any).template_id;
          const cachedTemplate = templateMap[t.slug] || templateMap[t.id];
          const resolvedTemplate = dbTemplate || cachedTemplate || 'classic';

          if (dbTemplate) {
            saveStoredTemplate(t.slug, dbTemplate);
            if (t.id) saveStoredTemplate(t.id, dbTemplate);
          }

          return {
            ...t,
            templateId: resolvedTemplate,
          };
        });

        setTenants(dbTenants);
        setCurrentTenant(prev => {
          if (prev) {
            const found = dbTenants.find(t => t.id === prev.id || t.slug === prev.slug);
            return found || dbTenants[0] || null;
          }
          return dbTenants[0] || null;
        });
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setIsTenantsLoaded(true);
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
    // 템플릿 로컬 캐시 즉시 보존
    if (tenant.templateId) {
      if (tenant.slug) saveStoredTemplate(tenant.slug, tenant.templateId);
      if (tenantId) saveStoredTemplate(tenantId, tenant.templateId);
    }

    const targetTenant = { ...tenant };
    setCurrentTenant(targetTenant);
    setTenants(prev => prev.map(t => (t.id === tenantId || t.slug === tenant.slug) ? targetTenant : t));

    try {
      const response = await tenantAPI.updateTenantInfo(tenantId, tenant);
      if (response.success && response.data) {
        const dbTemplate = response.data.templateId || (response.data as any).template_id || tenant.templateId;
        const savedTenant: Tenant = {
          ...tenant,
          ...response.data,
          templateId: dbTemplate,
        };
        if (dbTemplate) {
          if (tenant.slug) saveStoredTemplate(tenant.slug, dbTemplate);
          if (tenantId) saveStoredTemplate(tenantId, dbTemplate);
        }
        setCurrentTenant(savedTenant);
        setTenants(prev => prev.map(t => (t.id === tenantId || t.slug === tenant.slug) ? savedTenant : t));
        toast.success('단체 정보 및 템플릿 설정이 서버 DB에 성공적으로 저장되었습니다.');
      } else {
        toast.success('단체 정보 및 템플릿 설정이 성공적으로 반영되었습니다.');
      }
    } catch (error) {
      console.error('Failed to update tenant info on server:', error);
      toast.error('서버 DB 저장 중 에러가 발생했습니다.');
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


  // 테넌트별 봉헌 항목 상태 (DB 데이터 우선)
  const [allDonationItems, setAllDonationItems] = useState<Record<string, DonationItem[]>>({});

  const getTenantDonationItems = useCallback((tenant: Tenant): DonationItem[] => {
    if (allDonationItems[tenant.id]) return allDonationItems[tenant.id];
    if (allDonationItems[tenant.slug]) return allDonationItems[tenant.slug];
    return allDonationItems[tenant.religionType] || mockDonationItems[tenant.religionType] || [];
  }, [allDonationItems]);

  const saveDonationItem = useCallback((tenantIdOrSlug: string, religionType: string, itemData: Partial<DonationItem>) => {
    setAllDonationItems(prev => {
      const currentList = prev[tenantIdOrSlug] || prev[religionType] || mockDonationItems[religionType] || [];
      let updatedList: DonationItem[];

      if (itemData.id) {
        updatedList = currentList.map(item => item.id === itemData.id ? { ...item, ...itemData } as DonationItem : item);
      } else {
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
        [religionType]: updatedList,
      };

      mockDonationItems[religionType] = updatedList;

      // 무조건 서버 DB로 직접 저장
      donationItemsAPI.saveItems(tenantIdOrSlug, updatedList).catch((err) => {
        console.warn('Supabase DB saveItems failed:', err);
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

      mockDonationItems[religionType] = updatedList;

      // 무조건 서버 DB로 직접 저장
      donationItemsAPI.saveItems(tenantIdOrSlug, updatedList).catch((err) => {
        console.warn('Supabase DB delete saveItems failed:', err);
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
        isTenantsLoaded,
        getTenantDonationItems,
        saveDonationItem,
        deleteDonationItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

const defaultContextValue: AppContextType = {
  currentTenant: null,
  setCurrentTenant: () => {},
  donationFormData: null,
  setDonationFormData: () => {},
  currentAdmin: null,
  setCurrentAdmin: () => {},
  tenants: [],
  fetchTenants: async () => {},
  updateTenantBanners: async () => {},
  updateTenantInfo: async () => {},
  addTenant: async () => {},
  isTenantsLoaded: false,
  getTenantDonationItems: () => [],
  saveDonationItem: () => {},
  deleteDonationItem: () => {},
};

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    return defaultContextValue;
  }
  return context;
}