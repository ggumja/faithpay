import { Navigate, Outlet, useParams, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { isAdminPortalDomain } from '../utils/domainUtils';

/**
 * 단체 관리자 포털 전용 라우트 가드 (Tenant Admin Route Guard)
 * - 미인증 사용자 접근 시 해당 단체의 관리자 로그인 페이지로 리다이렉트
 *   (admin.soulpay.kr 등 전용 도메인: /:tenantSlug/login, 로컬/통합: /:tenantSlug/admin/login)
 * - 타 단체 관리자 권한으로 다른 단체 관리자 화면에 접근하는 권한 탈취 차단 (system_admin 제외)
 */
export default function TenantAdminRouteGuard() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { currentAdmin, currentTenant, tenants } = useApp();

  const isDedicatedAdmin = isAdminPortalDomain() || !location.pathname.includes('/admin');

  // 1. 미로그인 상태: 로그인 페이지로 리다이렉트
  if (!currentAdmin) {
    const loginTarget = tenantSlug
      ? (isDedicatedAdmin ? `/${tenantSlug}/login` : `/${tenantSlug}/admin/login`)
      : (isDedicatedAdmin ? '/login' : '/admin/login');
    return <Navigate to={loginTarget} replace state={{ from: location }} />;
  }

  // 2. 단체 관리자(tenant_admin, finance_manager 등)가 타 단체 대시보드에 접근하려 할 때 차단
  // (단, 최고 시스템 관리자 system_admin은 전역 모니터링 허용)
  if (currentAdmin.role !== 'system_admin' && tenantSlug) {
    const decodedSlug = decodeURIComponent(tenantSlug).trim().toLowerCase();
    const targetTenant =
      tenants.find(
        t =>
          (t.slug && t.slug.toLowerCase() === decodedSlug) ||
          (t.id && t.id.toLowerCase() === decodedSlug) ||
          (t.name && t.name.toLowerCase() === decodedSlug) ||
          (t.slug && decodeURIComponent(t.slug).toLowerCase() === decodedSlug)
      ) ||
      (currentTenant && (
        (currentTenant.slug && currentTenant.slug.toLowerCase() === decodedSlug) ||
        (currentTenant.id && currentTenant.id.toLowerCase() === decodedSlug)
      ) ? currentTenant : null);

    if (
      targetTenant &&
      currentAdmin.tenantId !== targetTenant.id &&
      currentAdmin.tenantId !== targetTenant.slug
    ) {
      const loginTarget = isDedicatedAdmin ? `/${tenantSlug}/login` : `/${tenantSlug}/admin/login`;
      return <Navigate to={loginTarget} replace state={{ from: location }} />;
    }
  }

  return <Outlet />;
}
