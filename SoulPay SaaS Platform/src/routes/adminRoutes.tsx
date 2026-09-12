import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import RootLayout from "../app/layouts/RootLayout";

// ── 단체 관리자 포털 전용 컴포넌트 ──
const AdminLogin = lazy(() => import("../app/pages/AdminLogin"));
const AdminRedirectGuard = lazy(() => import("../app/pages/admin/AdminRedirectGuard"));
const AdminDashboard = lazy(() => import("../app/pages/admin/AdminDashboard"));
const DonationHistory = lazy(() => import("../app/pages/admin/DonationHistory"));
const TenantStatisticsPage = lazy(() => import("../app/pages/admin/TenantStatisticsPage"));
const PrayerManagement = lazy(() => import("../app/pages/admin/PrayerManagement"));
const DonationMenuManagement = lazy(() => import("../app/pages/admin/DonationMenuManagement"));
const MemberManagement = lazy(() => import("../app/pages/admin/MemberManagement"));
const MemberDetailPage = lazy(() => import("../app/pages/admin/MemberDetailPage"));
const SettlementReports = lazy(() => import("../app/pages/admin/SettlementReports"));
const BannerManagement = lazy(() => import("../app/pages/admin/BannerManagement"));
const OrganizationSettings = lazy(() => import("../app/pages/admin/OrganizationSettings"));
const TenantDesignSettings = lazy(() => import("../app/pages/admin/TenantDesignSettings"));
const TenantDocumentsSettings = lazy(() => import("../app/pages/admin/TenantDocumentsSettings"));
const RecurringPendingPage = lazy(() => import("../app/pages/admin/RecurringPendingPage"));
const AdminAccountManagement = lazy(() => import("../app/pages/admin/AdminAccountManagement"));
const OnboardingFlow = lazy(() => import("../app/pages/OnboardingFlow"));
const SupportPage = lazy(() => import("../app/pages/admin/SupportPage"));
const NotFound = lazy(() => import("../app/pages/NotFound"));
const TenantAdminRouteGuard = lazy(() => import("../app/components/TenantAdminRouteGuard"));

export const adminRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", Component: AdminLogin },
      { path: "/login", Component: AdminLogin },
      { path: "/admin", Component: AdminLogin },
      { path: "/admin/login", Component: AdminLogin },
      { path: "/onboarding", Component: OnboardingFlow },
      // 단체 관리자 로그인 경로는 가드 제외 (공개 접근)
      { path: "/:tenantSlug/login", Component: AdminLogin },
      { path: "/:tenantSlug/admin/login", Component: AdminLogin },
      // 단체 슬러그 기반 보호된 관리자 경로 (TenantAdminRouteGuard 적용)
      {
        Component: TenantAdminRouteGuard,
        children: [
          { path: "/:tenantSlug", Component: AdminDashboard },
          { path: "/:tenantSlug/admin", Component: AdminDashboard },
          { path: "/:tenantSlug/donations", Component: DonationHistory },
          { path: "/:tenantSlug/admin/donations", Component: DonationHistory },
          { path: "/:tenantSlug/prayers", Component: PrayerManagement },
          { path: "/:tenantSlug/admin/prayers", Component: PrayerManagement },
          { path: "/:tenantSlug/menu", Component: DonationMenuManagement },
          { path: "/:tenantSlug/admin/menu", Component: DonationMenuManagement },
          { path: "/:tenantSlug/members", Component: MemberManagement },
          { path: "/:tenantSlug/admin/members", Component: MemberManagement },
          { path: "/:tenantSlug/members/:memberId", Component: MemberDetailPage },
          { path: "/:tenantSlug/admin/members/:memberId", Component: MemberDetailPage },
          { path: "/:tenantSlug/settlement", Component: SettlementReports },
          { path: "/:tenantSlug/admin/settlement", Component: SettlementReports },
          { path: "/:tenantSlug/banners", Component: BannerManagement },
          { path: "/:tenantSlug/admin/banners", Component: BannerManagement },
          { path: "/:tenantSlug/accounts", Component: AdminAccountManagement },
          { path: "/:tenantSlug/admin/accounts", Component: AdminAccountManagement },
          { path: "/:tenantSlug/settings", Component: OrganizationSettings },
          { path: "/:tenantSlug/admin/settings", Component: OrganizationSettings },
          { path: "/:tenantSlug/settings/basic", Component: OrganizationSettings },
          { path: "/:tenantSlug/admin/settings/basic", Component: OrganizationSettings },
          { path: "/:tenantSlug/settings/design", Component: TenantDesignSettings },
          { path: "/:tenantSlug/admin/settings/design", Component: TenantDesignSettings },
          { path: "/:tenantSlug/settings/banners", Component: BannerManagement },
          { path: "/:tenantSlug/admin/settings/banners", Component: BannerManagement },
          { path: "/:tenantSlug/settings/documents", Component: TenantDocumentsSettings },
          { path: "/:tenantSlug/admin/settings/documents", Component: TenantDocumentsSettings },
          { path: "/:tenantSlug/settings/accounts", Component: AdminAccountManagement },
          { path: "/:tenantSlug/admin/settings/accounts", Component: AdminAccountManagement },
          { path: "/:tenantSlug/recurring-pending", Component: RecurringPendingPage },
          { path: "/:tenantSlug/admin/recurring-pending", Component: RecurringPendingPage },
          { path: "/:tenantSlug/statistics", Component: TenantStatisticsPage },
          { path: "/:tenantSlug/admin/statistics", Component: TenantStatisticsPage },
          { path: "/:tenantSlug/support", Component: SupportPage },
          { path: "/:tenantSlug/admin/support", Component: SupportPage },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
], { basename: import.meta.env.BASE_URL });
