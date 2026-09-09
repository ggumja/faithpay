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
const RecurringPendingPage = lazy(() => import("../app/pages/admin/RecurringPendingPage"));
const AdminAccountManagement = lazy(() => import("../app/pages/admin/AdminAccountManagement"));
const OnboardingFlow = lazy(() => import("../app/pages/OnboardingFlow"));
const NotFound = lazy(() => import("../app/pages/NotFound"));

export const adminRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", Component: AdminRedirectGuard },
      { path: "/admin", Component: AdminRedirectGuard },
      { path: "/admin/login", Component: AdminLogin },
      { path: "/:tenantSlug/admin/login", Component: AdminLogin },
      { path: "/onboarding", Component: OnboardingFlow },
      { path: "/:tenantSlug/admin", Component: AdminDashboard },
      { path: "/:tenantSlug/admin/donations", Component: DonationHistory },
      { path: "/:tenantSlug/admin/prayers", Component: PrayerManagement },
      { path: "/:tenantSlug/admin/menu", Component: DonationMenuManagement },
      { path: "/:tenantSlug/admin/members", Component: MemberManagement },
      { path: "/:tenantSlug/admin/members/:memberId", Component: MemberDetailPage },
      { path: "/:tenantSlug/admin/settlement", Component: SettlementReports },
      { path: "/:tenantSlug/admin/banners", Component: BannerManagement },
      { path: "/:tenantSlug/admin/accounts", Component: AdminAccountManagement },
      { path: "/:tenantSlug/admin/settings", Component: OrganizationSettings },
      { path: "/:tenantSlug/admin/recurring-pending", Component: RecurringPendingPage },
      { path: "/:tenantSlug/admin/statistics", Component: TenantStatisticsPage },
      { path: "*", Component: NotFound },
    ],
  },
], { basename: import.meta.env.BASE_URL });
