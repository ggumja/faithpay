import { useMemo } from 'react';

export interface TenantTerms {
  donation: string;          // 예: '수납/후원' | '봉헌' | '보시'
  donationHistory: string;   // 예: '수납/후원 내역' | '봉헌 내역' | '보시 내역'
  donationItems: string;     // 예: '수납/후원 항목' | '봉헌 메뉴' | '보시/불사 항목'
  recurringPending: string;  // 예: '정기결제 대기' | '정기봉헌 대기'
  prayer: string;            // 예: '메시지/지향 관리' | '기도문/지향 관리' | '발원문 관리'
  donor: string;             // 예: '후원자/기부자' | '교우/성도' | '불자/신도'
  prayerInputLabel: string;  // 예: '응원/소원 메시지' | '기도지향' | '발원문'
}

export const TENANT_TERMINOLOGY: Record<string, TenantTerms> = {
  // 1. 공통 / 비영리 / NPO / 사회복지재단 / 기부단체 (기본값)
  default: {
    donation: '수납/후원',
    donationHistory: '수납/후원 내역',
    donationItems: '수납/후원 항목',
    recurringPending: '정기결제 대기',
    prayer: '메시지/지향 관리',
    donor: '후원자/기부자',
    prayerInputLabel: '응원/소원 메시지',
  },
  // 2. 개신교 / 가톨릭 (교회 / 성당)
  church: {
    donation: '봉헌',
    donationHistory: '봉헌 내역',
    donationItems: '봉헌 메뉴',
    recurringPending: '정기결제 대기',
    prayer: '기도문/지향 관리',
    donor: '교우/성도',
    prayerInputLabel: '기도지향/미사지향',
  },
  // 3. 불교 (사찰 / 암자)
  temple: {
    donation: '보시',
    donationHistory: '보시 내역',
    donationItems: '보시/불사 항목',
    recurringPending: '정기보시 대기',
    prayer: '발원문 관리',
    donor: '불자/신도',
    prayerInputLabel: '발원문/소원',
  },
};

/**
 * 단체 유형(orgType)에 따라 맞춤 용어 딕셔너리를 반환하는 커스텀 훅
 * @param orgType 'church' | 'temple' | 'npo' | string
 */
export function useTenantTerms(orgType?: string): TenantTerms {
  return useMemo(() => {
    if (!orgType) return TENANT_TERMINOLOGY.default;
    const normalized = orgType.toLowerCase();
    if (normalized === 'church' || normalized === 'catholic' || normalized === 'christian') {
      return TENANT_TERMINOLOGY.church;
    }
    if (normalized === 'temple' || normalized === 'buddhism') {
      return TENANT_TERMINOLOGY.temple;
    }
    return TENANT_TERMINOLOGY.default;
  }, [orgType]);
}
