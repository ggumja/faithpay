import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import RootLayout from "./layouts/RootLayout";

// ── 공통 / 일반 페이지 ──
const Root = lazy(() => import("./pages/Root"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OnboardingFlow = lazy(() => import("./pages/OnboardingFlow"));
const KakaoPaySandbox = lazy(() => import("./pages/KakaoPaySandbox"));
const KakaoPayApprovePage = lazy(() => import("./pages/KakaoPayApprovePage"));
const KakaoAuthCallback = lazy(() => import("./pages/KakaoAuthCallback"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const SystemAdminLogin = lazy(() => import("./pages/admin/SystemAdminLogin"));
const AdminRedirectGuard = lazy(() => import("./pages/admin/AdminRedirectGuard"));

// ── [Group 1] 사용자 결제 / 기부 코어 (User Donation Core) ──
const TenantHome = lazy(() => import("./pages/TenantHome"));
const DonationFlow = lazy(() => import("./pages/DonationFlow"));
const PaymentSelection = lazy(() => import("./pages/PaymentSelection"));
const DonationComplete = lazy(() => import("./pages/DonationComplete"));
const TenantKiosk = lazy(() => import("./pages/TenantKiosk"));
const MyDonations = lazy(() => import("./pages/MyDonations"));
const TaxReceiptCenter = lazy(() => import("./pages/TaxReceiptCenter"));

// ── [Group 2] 단체 관리자 포털 (Tenant Admin Portal) ──
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const DonationHistory = lazy(() => import("./pages/admin/DonationHistory"));
const TenantStatisticsPage = lazy(() => import("./pages/admin/TenantStatisticsPage"));
const PrayerManagement = lazy(() => import("./pages/admin/PrayerManagement"));
const DonationMenuManagement = lazy(() => import("./pages/admin/DonationMenuManagement"));
const MemberManagement = lazy(() => import("./pages/admin/MemberManagement"));
const MemberDetailPage = lazy(() => import("./pages/admin/MemberDetailPage"));
const SettlementReports = lazy(() => import("./pages/admin/SettlementReports"));
const BannerManagement = lazy(() => import("./pages/admin/BannerManagement"));
const OrganizationSettings = lazy(() => import("./pages/admin/OrganizationSettings"));
const RecurringPendingPage = lazy(() => import("./pages/admin/RecurringPendingPage"));
const AdminAccountManagement = lazy(() => import("./pages/admin/AdminAccountManagement"));
const TenantAdminRouteGuard = lazy(() => import("./components/TenantAdminRouteGuard"));

// ── [Group 3] 파트너 / 총판 관리자 포털 (Partner Portal) ──
const PartnerLogin = lazy(() => import("./pages/partner/PartnerLogin"));
const PartnerApply = lazy(() => import("./pages/partner/PartnerApply"));
const PartnerDashboard = lazy(() => import("./pages/partner/PartnerDashboard"));
const PartnerTenantCreate = lazy(() => import("./pages/partner/PartnerTenantCreate"));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard"));

// ── [Group 4] 시스템 최고 관리자 포털 (System Admin Portal) ──
const SystemAdminShell = lazy(() => import("./pages/admin/SystemAdminShell"));
const SystemAdminOverview = lazy(() => import("./pages/admin/SystemAdminOverview"));
const SystemAdminDashboard = lazy(() => import("./pages/admin/SystemAdminDashboard"));
const SystemAdminTenantCreate = lazy(() => import("./pages/admin/SystemAdminTenantCreate"));
const PendingTenantDetailPage = lazy(() => import("./pages/admin/PendingTenantDetailPage"));
const TenantDetailPage = lazy(() => import("./pages/admin/TenantDetailPage"));
const SettlementCenterPage = lazy(() => import("./pages/admin/SettlementCenterPage"));
const TenantStatsPage = lazy(() => import("./pages/admin/TenantStatsPage"));
const PartnerManagement = lazy(() => import("./pages/admin/PartnerManagement"));
const PartnerDetailPage = lazy(() => import("./pages/admin/PartnerDetailPage"));
const CommissionStatsPage = lazy(() => import("./pages/admin/CommissionStatsPage"));
const MultiPartySettlementLedger = lazy(() => import("./pages/admin/components/MultiPartySettlementLedger"));
const SystemSettingsPage = lazy(() => import("./pages/admin/SystemSettingsPage"));
const SystemAdminAccountPage = lazy(() => import("./pages/admin/SystemAdminAccountPage"));
const RecurringSchedulerPage = lazy(() => import("./pages/admin/RecurringSchedulerPage"));

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Root,
      },
      {
        path: "/kakaopay/sandbox",
        Component: KakaoPaySandbox,
      },
      {
        path: "/kakaopay/approve",
        Component: KakaoPayApprovePage,
      },
      {
        path: "/oauth/kakao/callback",
        Component: KakaoAuthCallback,
      },
      {
        path: "/partner/login",
        Component: PartnerLogin,
      },
      {
        path: "/partner/admin",
        Component: PartnerDashboard,
      },
      {
        path: "/agency/login",
        Component: PartnerLogin,
      },
      {
        path: "/agency/admin",
        Component: PartnerDashboard,
      },
      {
        path: "/partner/apply",
        Component: PartnerApply,
      },
      {
        path: "/partner/dashboard",
        Component: PartnerDashboard,
      },
      {
        path: "/agency/dashboard",
        Component: PartnerDashboard,
      },
      {
        path: "/agent/dashboard",
        Component: AgentDashboard,
      },
      {
        path: "/partner/tenants/new",
        Component: PartnerTenantCreate,
      },
      {
        path: "/admin",
        Component: AdminRedirectGuard,
      },
      {
        path: "/admin/login",
        Component: AdminLogin,
      },
      {
        path: "/:tenantSlug/admin/login",
        Component: AdminLogin,
      },
      {
        path: "/system/login",
        Component: SystemAdminLogin,
      },
      // ── System Admin (공통 사이드바 셸) ──
      {
        Component: SystemAdminShell,
        children: [
          { path: "/system/admin",                  Component: SystemAdminOverview },
          { path: "/system/admin/dashboard",        Component: SystemAdminOverview },
          { path: "/system/admin/tenants",          Component: SystemAdminDashboard },
          { path: "/system/admin/tenants/new",      Component: SystemAdminTenantCreate },
          { path: "/system/admin/tenants/pending",  Component: SystemAdminDashboard },
          { path: "/system/admin/tenants/pending/:id", Component: PendingTenantDetailPage },
          { path: "/system/admin/settlement-center", Component: SettlementCenterPage },
          { path: "/system/admin/stats",            Component: TenantStatsPage },

          { path: "/system/admin/partners",         Component: PartnerManagement    },
          { path: "/system/admin/partners/:id",      Component: PartnerDetailPage    },
          { path: "/system/admin/commissions",      Component: CommissionStatsPage  },
          { path: "/system/admin/ledger",           Component: MultiPartySettlementLedger },

          { path: "/system/admin/tenant/:id",       Component: TenantDetailPage     },
          { path: "/system/admin/settings",          Component: SystemSettingsPage   },
          { path: "/system/admin/system-admin-accounts", Component: SystemAdminAccountPage },
          { path: "/system/admin/scheduler",        Component: RecurringSchedulerPage },
        ],
      },
      {
        path: "/onboarding",
        Component: OnboardingFlow,
      },
      {
        path: "/:tenantSlug",
        Component: TenantHome,
      },
      {
        path: "/:tenantSlug/donate",
        Component: DonationFlow,
      },
      {
        path: "/:tenantSlug/kiosk",
        Component: TenantKiosk,
      },
      {
        path: "/:tenantSlug/payment",
        Component: PaymentSelection,
      },
      {
        path: "/:tenantSlug/complete",
        Component: DonationComplete,
      },
      {
        path: "/:tenantSlug/my-donations",
        Component: MyDonations,
      },
      {
        path: "/:tenantSlug/tax-receipt",
        Component: TaxReceiptCenter,
      },
      // ── 단체 관리자 포털 보호 라우트 (TenantAdminRouteGuard 적용) ──
      {
        Component: TenantAdminRouteGuard,
        children: [
          {
            path: "/:tenantSlug/admin",
            Component: AdminDashboard,
          },
          {
            path: "/:tenantSlug/admin/prayers",
            Component: PrayerManagement,
          },
          {
            path: "/:tenantSlug/admin/menu",
            Component: DonationMenuManagement,
          },
          {
            path: "/:tenantSlug/admin/members",
            Component: MemberManagement,
          },
          {
            path: "/:tenantSlug/admin/members/:memberId",
            Component: MemberDetailPage,
          },
          {
            path: "/:tenantSlug/admin/settlement",
            Component: SettlementReports,
          },
          {
            path: "/:tenantSlug/admin/banners",
            Component: BannerManagement,
          },
          {
            path: "/:tenantSlug/admin/accounts",
            Component: AdminAccountManagement,
          },
          {
            path: "/:tenantSlug/admin/settings",
            Component: OrganizationSettings,
          },
          {
            path: "/:tenantSlug/admin/donations",
            Component: DonationHistory,
          },
          {
            path: "/:tenantSlug/admin/recurring-pending",
            Component: RecurringPendingPage,
          },
          {
            path: "/:tenantSlug/admin/statistics",
            Component: TenantStatisticsPage,
          },
        ],
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
], { basename: import.meta.env.BASE_URL });