/**
 * SoulPay 무결성 보장 데이터 가드 유틸리티 (Data Integrity Guards)
 * 
 * 목적:
 * 컴포넌트나 비즈니스 로직에서 임의의 Fallback 데이터('dream', '01012345678', 50000원 등)를 
 * 하드코딩으로 주입하는 행위를 차단하고, 결측치를 안전하고 정직하게 처리하도록 표준화합니다.
 */

import { Tenant } from '../context/AppContext';

/**
 * 유효한 테넌트인지 검증. 없거나 불완전한 경우 Fallback 주입 대신 명시적인 예외를 던지거나 null을 반환합니다.
 */
export function requireValidTenant(
  tenant: Tenant | null | undefined,
  contextMessage = '유효한 가맹 단체(테넌트) 정보가 필요합니다.'
): Tenant {
  if (!tenant || !tenant.id || !tenant.slug) {
    throw new Error(`[DataGuard Error] ${contextMessage}`);
  }
  return tenant;
}

/**
 * 기부자 성명 안전 추출. 결측 시 임의의 가상 인물('홍길동' 등) 대신 명시적인 기본값('익명' 또는 빈 문자열)을 반환합니다.
 */
export function getSafeDonorName(name: string | null | undefined, defaultName = '익명'): string {
  if (!name || typeof name !== 'string') return defaultName;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : defaultName;
}

/**
 * 전화번호 정제 및 안전 검증.
 * 결측 시 임의의 테스트 번호('01012345678' 등)를 생성하지 않고, 빈 문자열을 반환합니다.
 */
export function sanitizeDonorPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * 기부/헌금 금액 안전 검증.
 * 누락되거나 유효하지 않은 경우 임의의 가상 금액(50,000원 등)을 채우지 않고 0을 반환합니다.
 */
export function sanitizeDonationAmount(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  const num = typeof amount === 'string' ? parseInt(amount.replace(/[^0-9]/g, ''), 10) : amount;
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * 고유 사용자 ID 생성기. 전화번호가 없더라도 가상 번호를 넣지 않고 타임스탬프와 난수로 안전하게 생성합니다.
 */
export function generateSafeUserId(phone: string | null | undefined, prefix = 'USER'): string {
  const cleanDigits = sanitizeDonorPhone(phone);
  if (cleanDigits.length >= 8) {
    return `${prefix}-${cleanDigits}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
}
