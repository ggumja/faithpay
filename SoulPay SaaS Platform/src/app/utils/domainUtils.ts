/**
 * SoulPay 도메인 및 포털 간 라우팅 유틸리티 (Domain & Portal Routing Utilities)
 * 
 * 상용 환경(soulpay.kr)은 Cloudflare Pages를 통해 역할별 도메인으로 분리 배포됩니다:
 * - pay.soulpay.kr: 기부자/신도 모바일 결제 포털
 * - admin.soulpay.kr: 가맹 단체 관리자 포털 (대시보드, 헌금내역, 통계 등)
 * - ops.soulpay.kr: 시스템 최고 관리자 포털
 * - kiosk.soulpay.kr: 현장 무인 키오스크
 * - partner.soulpay.kr: 영업 파트너 포털
 */

/**
 * 현재 브라우저 호스트가 soulpay.kr 상용/운영 도메인인지 확인
 */
export function isSoulPayProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'soulpay.kr' || hostname.endsWith('.soulpay.kr');
}

/**
 * 단체 관리자 포털 URL 반환
 * - 상용 환경: https://admin.soulpay.kr/:tenantSlug (또는 https://admin.soulpay.kr)
 * - 로컬/개발 환경: /:tenantSlug/admin/login (또는 /admin/login)
 */
export function getAdminPortalUrl(tenantSlug?: string): string {
  if (isSoulPayProduction()) {
    return tenantSlug ? `https://admin.soulpay.kr/${tenantSlug}` : 'https://admin.soulpay.kr';
  }
  return tenantSlug ? `/${tenantSlug}/admin/login` : '/admin/login';
}

/**
 * 기부자/신도 모바일 결제 포털 URL 반환
 * - 상용 환경: https://pay.soulpay.kr/:tenantSlug
 * - 로컬/개발 환경: /:tenantSlug
 */
export function getPayPortalUrl(tenantSlug?: string): string {
  if (isSoulPayProduction()) {
    return tenantSlug ? `https://pay.soulpay.kr/${tenantSlug}` : 'https://pay.soulpay.kr';
  }
  return tenantSlug ? `/${tenantSlug}` : '/';
}

/**
 * 관리자 로그인/포털로 이동 핸들러
 * - 상용 환경에서는 admin.soulpay.kr로 도메인 브라우저 이동(window.location.href)
 * - 로컬/개발 환경에서는 SPA navigate 사용
 */
export function navigateToAdminPortal(tenantSlug?: string, navigate?: (to: string) => void): void {
  const targetUrl = getAdminPortalUrl(tenantSlug);
  if (isSoulPayProduction()) {
    window.location.href = targetUrl;
    return;
  }
  if (navigate) {
    navigate(targetUrl);
  } else {
    window.location.href = targetUrl;
  }
}
