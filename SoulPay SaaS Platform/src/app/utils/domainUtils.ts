/**
 * SoulPay 도메인 및 포털 간 라우팅 유틸리티 (Domain & Portal Routing Utilities)
 * 
 * 1. 상용 환경 (pay.soulpay.kr, admin.soulpay.kr):
 *    - Cloudflare Pages로 도메인이 분리 배포되어 있으므로 도메인 간 브라우저 이동(window.location.href) 수행
 * 2. Cloudflare Pages 프리뷰 환경 (*.pages.dev):
 *    - soulpay-pay.pages.dev <-> soulpay-admin.pages.dev 자동 상호 전환 지원
 * 3. 로컬 개발 환경 (localhost / 127.0.0.1):
 *    - 통합 라우터(routes.tsx)를 사용하는 단일 포트 SPA이므로, 브라우저 새로고침 없는 React Router SPA navigate() 동작
 * 4. Dev / Staging 환경 (dev.soulpay.kr, staging 등):
 *    - 상용 admin.soulpay.kr로 튕기지 않고 해당 테스트 도메인 내의 SPA 경로 유지
 * 5. 환경변수 커스텀 (VITE_ADMIN_URL, VITE_PAY_URL):
 *    - 별도 지정된 포털 베이스 주소가 있을 경우 최우선 적용
 */

/**
 * 현재 환경이 상용(Production) 멀티 도메인 환경인지 확인
 * - pay.soulpay.kr, admin.soulpay.kr, soulpay.kr 등 상용 도메인
 * - dev.soulpay.kr, staging 등 개발/스테이징 서브도메인은 상용 리다이렉트 대상에서 제외
 */
export function isSoulPayProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();

  // 로컬 개발 환경 제외
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return false;
  }

  // 개발 / 스테이징 서브도메인 제외 (통합 테스트 환경)
  if (host.startsWith('dev.') || host.startsWith('stage.') || host.startsWith('staging.') || host.startsWith('test.')) {
    return false;
  }

  // 상용 soulpay.kr 도메인 및 정규 서브도메인
  return host === 'soulpay.kr' || host.endsWith('.soulpay.kr');
}

/**
 * 현재 환경이 Cloudflare Pages 프리뷰(*.pages.dev) 환경인지 확인
 */
export function isPagesPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.toLowerCase().endsWith('.pages.dev');
}

/**
 * 단체 관리자 포털 URL 반환
 * - VITE_ADMIN_URL 환경변수 지정 시: 해당 URL 기반
 * - 상용(pay.soulpay.kr): https://admin.soulpay.kr/:tenantSlug
 * - Pages 프리뷰(soulpay-pay.pages.dev): https://soulpay-admin.pages.dev/:tenantSlug
 * - 로컬/Dev(localhost, dev.soulpay.kr): /:tenantSlug/admin/login (또는 /admin/login)
 */
export function getAdminPortalUrl(tenantSlug?: string): string {
  // 1. 커스텀 환경변수 우선 확인
  const envAdminUrl = import.meta.env.VITE_ADMIN_URL;
  if (envAdminUrl && typeof envAdminUrl === 'string') {
    const base = envAdminUrl.replace(/\/$/, '');
    return tenantSlug ? `${base}/${tenantSlug}` : base;
  }

  // 2. 상용 운영 환경
  if (isSoulPayProduction()) {
    return tenantSlug ? `https://admin.soulpay.kr/${tenantSlug}` : 'https://admin.soulpay.kr';
  }

  // 3. Cloudflare Pages 프리뷰 환경
  if (isPagesPreview()) {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('soulpay-pay')) {
      const adminHost = host.replace('soulpay-pay', 'soulpay-admin');
      const protocol = window.location.protocol;
      return tenantSlug ? `${protocol}//${adminHost}/${tenantSlug}` : `${protocol}//${adminHost}`;
    }
  }

  // 4. 로컬 개발 환경 (localhost) 및 Dev/Staging 환경: SPA 내부 라우팅
  return tenantSlug ? `/${tenantSlug}/admin/login` : '/admin/login';
}

/**
 * 기부자/신도 모바일 결제 포털 URL 반환
 * - VITE_PAY_URL 환경변수 지정 시: 해당 URL 기반
 * - 상용(admin.soulpay.kr): https://pay.soulpay.kr/:tenantSlug
 * - Pages 프리뷰(soulpay-admin.pages.dev): https://soulpay-pay.pages.dev/:tenantSlug
 * - 로컬/Dev: /:tenantSlug
 */
export function getPayPortalUrl(tenantSlug?: string): string {
  // 1. 커스텀 환경변수 우선 확인
  const envPayUrl = import.meta.env.VITE_PAY_URL;
  if (envPayUrl && typeof envPayUrl === 'string') {
    const base = envPayUrl.replace(/\/$/, '');
    return tenantSlug ? `${base}/${tenantSlug}` : base;
  }

  // 2. 상용 운영 환경
  if (isSoulPayProduction()) {
    return tenantSlug ? `https://pay.soulpay.kr/${tenantSlug}` : 'https://pay.soulpay.kr';
  }

  // 3. Cloudflare Pages 프리뷰 환경
  if (isPagesPreview()) {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('soulpay-admin')) {
      const payHost = host.replace('soulpay-admin', 'soulpay-pay');
      const protocol = window.location.protocol;
      return tenantSlug ? `${protocol}//${payHost}/${tenantSlug}` : `${protocol}//${payHost}`;
    }
  }

  // 4. 로컬 개발 환경 및 Dev/Staging 환경: SPA 내부 라우팅
  return tenantSlug ? `/${tenantSlug}` : '/';
}

/**
 * 관리자 로그인/포털로 이동 핸들러
 * - 외부 도메인(상용, Pages 프리뷰 등) 이동 시: window.location.href
 * - 로컬/Dev SPA 환경: React Router navigate()로 페이지 깜빡임 없이 즉시 전환
 */
export function navigateToAdminPortal(tenantSlug?: string, navigate?: (to: string) => void): void {
  const targetUrl = getAdminPortalUrl(tenantSlug);
  const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

  if (isExternal) {
    window.location.href = targetUrl;
    return;
  }

  // 로컬/Dev 환경: React Router SPA navigate 사용
  if (navigate) {
    navigate(targetUrl);
  } else {
    window.location.href = targetUrl;
  }
}
