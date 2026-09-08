import { useMemo } from 'react';

export interface TenantTerms {
  donation: string;          // 예: '후원' | '헌금' | '봉헌' | '보시'
  donationHistory: string;   // 예: '후원 내역' | '헌금 내역' | '봉헌 내역' | '보시 내역'
  donationItems: string;     // 예: '후원 항목' | '헌금 종류' | '봉헌 메뉴' | '보시/불사 항목'
  recurringPending: string;  // 예: '정기후원 대기' | '정기헌금 대기' | '정기봉헌 대기' | '정기보시 대기'
  prayer: string;            // 예: '응원메시지 관리' | '기도제목 관리' | '미사지향 관리' | '발원문 관리'
  donor: string;             // 예: '후원자' | '성도' | '교우' | '불자'
  memberManagement: string;  // 예: '후원자 관리' | '성도 관리' | '교우 관리' | '신도(불자) 관리'
  publicPageLabel: string;   // 예: '후원 페이지 보기' | '온라인 헌금 페이지 보기' | '봉헌 페이지 보기' | '온라인 보시 페이지 보기'
  prayerInputLabel: string;  // 예: '응원/소원 메시지' | '기도제목' | '미사지향' | '발원문'
  
  // 영수증 전용 종교별 명확한 구분 표기
  receiptTitle: string;            // '헌 금  영 수 증' | '봉 헌  영 수 증' | '보 시  영 수 증' | '후 원 금  영 수 증'
  cancelReceiptTitle: string;      // '헌 금  결 제  취 소  영 수 증' | '봉 헌  결 제  취 소  영 수 증' | '보 시  결 제  취 소  영 수 증' | '후 원 금  결 제  취 소  영 수 증'
  receiptModalTitle: string;       // '헌금 영수증' | '봉헌 영수증' | '보시 영수증' | '후원금 영수증'
  cancelReceiptModalTitle: string; // '헌금 결제 취소 영수증' | '봉헌 결제 취소 영수증' | '보시 결제 취소 영수증' | '후원금 결제 취소 영수증'
  receiptDonorLabel: string;       // '봉 헌 자' | '보 시 자' | '후 원 자'
  receiptItemLabel: string;        // '헌 금 항 목' | '봉 헌 항 목' | '보 시 항 목' | '후 원 항 목'
  receiptAmountLabel: string;      // '헌 금 금 액' | '봉 헌 금 액' | '보 시 금 액' | '후 원 금 액'
  receiptPrayerLabel: string;      // '기도제목 / 봉헌기도' | '미사지향 / 기도 내용' | '발원문 / 축원 내용' | '응원 / 후원 메시지'
  receiptGratitudeText: string;    // 종교별 수령 감사 및 축복 문구
  receiptCancelConfirmText: string;// 종교별 승인 취소 확인 문구
  receiptEnglishTitle: string;     // 영문 영수증 타이틀
  receiptEnglishCancelTitle: string; // 영문 취소 영수증 타이틀
}

export const TENANT_TERMINOLOGY: Record<string, TenantTerms> = {
  // 1. 공통 / 비영리 / NPO / 사회복지재단 / 기부단체 (기본값)
  default: {
    donation: '후원',
    donationHistory: '후원 내역',
    donationItems: '후원 항목',
    recurringPending: '정기후원 대기',
    prayer: '응원메시지 관리',
    donor: '후원자',
    memberManagement: '후원자 관리',
    publicPageLabel: '후원 페이지 보기',
    prayerInputLabel: '응원/소원 메시지',
    receiptTitle: '후 원 금  영 수 증',
    cancelReceiptTitle: '후 원 금  결 제  취 소  영 수 증',
    receiptModalTitle: '후원금 영수증',
    cancelReceiptModalTitle: '후원금 결제 취소 영수증',
    receiptDonorLabel: '후 원 자',
    receiptItemLabel: '후 원 항 목',
    receiptAmountLabel: '후 원 금 액',
    receiptPrayerLabel: '응원 / 후원 메시지',
    receiptGratitudeText: '위 금액을 정성 어린 후원금으로 정히 수령하였습니다.\n따뜻한 나눔과 사랑에 진심으로 감사드립니다.',
    receiptCancelConfirmText: '위 후원금 결제건은 정상적으로 승인 취소 완료되었음을 확인합니다.',
    receiptEnglishTitle: 'OFFICIAL DONATION RECEIPT',
    receiptEnglishCancelTitle: 'OFFICIAL CANCELLATION RECEIPT (승인 취소 완료)',
  },
  // 2. 기독교 / 개신교 (교회)
  protestant: {
    donation: '헌금',
    donationHistory: '헌금 내역',
    donationItems: '헌금 종류',
    recurringPending: '정기헌금 대기',
    prayer: '기도제목 관리',
    donor: '성도',
    memberManagement: '교인(성도) 관리',
    publicPageLabel: '온라인 헌금 페이지 보기',
    prayerInputLabel: '기도제목',
    receiptTitle: '헌 금  영 수 증',
    cancelReceiptTitle: '헌 금  결 제  취 소  영 수 증',
    receiptModalTitle: '헌금 영수증',
    cancelReceiptModalTitle: '헌금 결제 취소 영수증',
    receiptDonorLabel: '봉 헌 자',
    receiptItemLabel: '헌 금 항 목',
    receiptAmountLabel: '헌 금 금 액',
    receiptPrayerLabel: '기도제목 / 봉헌기도',
    receiptGratitudeText: '위 금액을 정성 어린 헌금으로 정히 수령하였습니다.\n하나님의 은혜와 평강이 늘 충만하시기를 기도합니다.',
    receiptCancelConfirmText: '위 헌금 결제건은 정상적으로 승인 취소 완료되었음을 확인합니다.',
    receiptEnglishTitle: 'OFFICIAL CHURCH OFFERING RECEIPT',
    receiptEnglishCancelTitle: 'OFFICIAL CANCELLATION RECEIPT (승인 취소 완료)',
  },
  // 3. 천주교 / 가톨릭 (성당)
  catholic: {
    donation: '봉헌',
    donationHistory: '봉헌 내역',
    donationItems: '봉헌 메뉴',
    recurringPending: '정기봉헌 대기',
    prayer: '미사지향 관리',
    donor: '교우',
    memberManagement: '신자(교우) 관리',
    publicPageLabel: '온라인 봉헌 페이지 보기',
    prayerInputLabel: '미사지향',
    receiptTitle: '봉 헌  영 수 증',
    cancelReceiptTitle: '봉 헌  결 제  취 소  영 수 증',
    receiptModalTitle: '봉헌 영수증',
    cancelReceiptModalTitle: '봉헌 결제 취소 영수증',
    receiptDonorLabel: '봉 헌 자',
    receiptItemLabel: '봉 헌 항 목',
    receiptAmountLabel: '봉 헌 금 액',
    receiptPrayerLabel: '미사지향 / 기도 내용',
    receiptGratitudeText: '위 금액을 정성 어린 봉헌금으로 정히 수령하였습니다.\n주님의 은총과 평화가 늘 함께하시기를 기도합니다.',
    receiptCancelConfirmText: '위 봉헌 결제건은 정상적으로 승인 취소 완료되었음을 확인합니다.',
    receiptEnglishTitle: 'OFFICIAL CATHOLIC OFFERING RECEIPT',
    receiptEnglishCancelTitle: 'OFFICIAL CANCELLATION RECEIPT (승인 취소 완료)',
  },
  // 4. 불교 (사찰 / 암자)
  temple: {
    donation: '보시',
    donationHistory: '보시 내역',
    donationItems: '보시/불사 항목',
    recurringPending: '정기보시 대기',
    prayer: '발원문 관리',
    donor: '불자',
    memberManagement: '신도(불자) 관리',
    publicPageLabel: '온라인 보시 페이지 보기',
    prayerInputLabel: '발원문/소원',
    receiptTitle: '보 시  영 수 증',
    cancelReceiptTitle: '보 시  결 제  취 소  영 수 증',
    receiptModalTitle: '보시 영수증',
    cancelReceiptModalTitle: '보시 결제 취소 영수증',
    receiptDonorLabel: '보 시 자',
    receiptItemLabel: '보 시 항 목',
    receiptAmountLabel: '보 시 금 액',
    receiptPrayerLabel: '발원문 / 축원 내용',
    receiptGratitudeText: '위 금액을 정성 어린 보시금으로 정히 수령하였습니다.\n부처님의 자비와 가피가 늘 충만하시기를 발원합니다.',
    receiptCancelConfirmText: '위 보시 결제건은 정상적으로 승인 취소 완료되었음을 확인합니다.',
    receiptEnglishTitle: 'OFFICIAL BUDDHIST DONATION RECEIPT',
    receiptEnglishCancelTitle: 'OFFICIAL CANCELLATION RECEIPT (승인 취소 완료)',
  },
  // 5. 일반 비영리 / 기부 / 기타 단체
  general: {
    donation: '기부',
    donationHistory: '기부 내역',
    donationItems: '기부 항목',
    recurringPending: '정기기부 대기',
    prayer: '기부메시지 관리',
    donor: '기부자',
    memberManagement: '기부회원 관리',
    publicPageLabel: '온라인 기부 페이지 보기',
    prayerInputLabel: '기부 메시지',
    receiptTitle: '기 부 금  영 수 증',
    cancelReceiptTitle: '기 부 금  결 제  취 소  영 수 증',
    receiptModalTitle: '기부금 영수증',
    cancelReceiptModalTitle: '기부금 결제 취소 영수증',
    receiptDonorLabel: '기 부 자',
    receiptItemLabel: '기 부 항 목',
    receiptAmountLabel: '기 부 금 액',
    receiptPrayerLabel: '기부 / 응원 메시지',
    receiptGratitudeText: '위 금액을 정성 어린 기부금으로 정히 수령하였습니다.\n따뜻한 나눔에 진심으로 감사드립니다.',
    receiptCancelConfirmText: '위 기부금 결제건은 정상적으로 승인 취소 완료되었음을 확인합니다.',
    receiptEnglishTitle: 'OFFICIAL DONATION RECEIPT',
    receiptEnglishCancelTitle: 'OFFICIAL CANCELLATION RECEIPT (승인 취소 완료)',
  },
};

// 이전 버전 호환성용 alias
(TENANT_TERMINOLOGY as any).church = TENANT_TERMINOLOGY.protestant;
(TENANT_TERMINOLOGY as any).buddhist = TENANT_TERMINOLOGY.temple;
(TENANT_TERMINOLOGY as any).charity = TENANT_TERMINOLOGY.default;

/**
 * 단체 유형(orgType 또는 religionType) 또는 테넌트 객체에 따라 맞춤 용어 딕셔너리를 반환하는 커스텀 훅
 * @param orgOrReligionTypeOrTenant 단체 유형 문자열 또는 테넌트 객체
 */
export function useTenantTerms(orgOrReligionTypeOrTenant?: any): TenantTerms {
  return useMemo(() => {
    if (!orgOrReligionTypeOrTenant) return TENANT_TERMINOLOGY.default;
    
    // 객체로 넘어온 경우 religionType, orgType, terminology.donation 우선 확인
    let rawType = '';
    let customTerminology: any = null;
    if (typeof orgOrReligionTypeOrTenant === 'object') {
      const t = orgOrReligionTypeOrTenant;
      customTerminology = t.terminology;
      if (t.religionType) {
        rawType = t.religionType;
      } else if (t.orgType) {
        rawType = t.orgType;
      } else if (t.terminology?.donation) {
        if (t.terminology.donation.includes('보시')) rawType = 'buddhist';
        else if (t.terminology.donation.includes('헌금')) rawType = 'protestant';
        else if (t.terminology.donation.includes('봉헌')) rawType = 'catholic';
        else if (t.terminology.donation.includes('기부')) rawType = 'general';
      }
    } else if (typeof orgOrReligionTypeOrTenant === 'string') {
      rawType = orgOrReligionTypeOrTenant;
    }

    let baseTerms = TENANT_TERMINOLOGY.default;
    if (rawType) {
      const normalized = rawType.toLowerCase().trim();

      // 불교
      if (normalized === 'buddhist' || normalized === 'temple' || normalized === 'buddhism') {
        baseTerms = TENANT_TERMINOLOGY.temple;
      }
      // 천주교 / 가톨릭
      else if (normalized === 'catholic') {
        baseTerms = TENANT_TERMINOLOGY.catholic;
      }
      // 개신교 / 기독교 / 교회
      else if (normalized === 'protestant' || normalized === 'church' || normalized === 'christian') {
        baseTerms = TENANT_TERMINOLOGY.protestant;
      }
      // 일반 비영리 / 기부
      else if (normalized === 'general') {
        baseTerms = TENANT_TERMINOLOGY.general;
      }
      // 사회복지 / 구호 / 비영리
      else {
        baseTerms = TENANT_TERMINOLOGY.default;
      }
    }

    // 테넌트 객체에 별도 커스텀 용어가 설정되어 있는 경우 baseTerms 위에 덮어씌움
    if (customTerminology) {
      return {
        ...baseTerms,
        ...(customTerminology.donation ? { 
          donation: customTerminology.donation,
          donationHistory: `${customTerminology.donation} 내역`,
          donationItems: `${customTerminology.donation} 항목`,
          recurringPending: `정기${customTerminology.donation} 대기`,
        } : {}),
        ...(customTerminology.member ? { 
          donor: customTerminology.member,
          memberManagement: `${customTerminology.member} 관리`,
        } : {}),
        ...(customTerminology.donation ? {
          publicPageLabel: `온라인 ${customTerminology.donation} 페이지 보기`,
        } : {}),
        ...(customTerminology.prayer ? { 
          prayer: `${customTerminology.prayer} 관리`,
          prayerInputLabel: customTerminology.prayer,
        } : {}),
      };
    }

    return baseTerms;
  }, [orgOrReligionTypeOrTenant]);
}
