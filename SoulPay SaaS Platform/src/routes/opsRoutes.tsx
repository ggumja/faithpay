import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import RootLayout from "../app/layouts/RootLayout";

// ── 시스템 최고 관리자 포털 전용 컴포넌트 ──
const SystemAdminLogin = lazy(() => import("../app/pages/admin/SystemAdminLogin"));
const SystemAdminShell = lazy(() => import("../app/pages/admin/SystemAdminShell"));
const SystemAdminDashboard = lazy(() => import("../app/pages/admin/SystemAdminDashboard"));
const PendingTenantDetailPage = lazy(() => import("../app/pages/admin/PendingTenantDetailPage"));
const TenantDetailPage = lazy(() => import("../app/pages/admin/TenantDetailPage"));
const SettlementCenterPage = lazy(() => import("../app/pages/admin/SettlementCenterPage"));
const TenantStatsPage = lazy(() => import("../app/pages/admin/TenantStatsPage"));
const PartnerManagement = lazy(() => import("../app/pages/admin/PartnerManagement"));
const PartnerDetailPage = lazy(() => import("../app/pages/admin/PartnerDetailPage"));
const CommissionStatsPage = lazy(() => import("../app/pages/admin/CommissionStatsPage"));
const MultiPartySettlementLedger = lazy(() => import("../app/pages/admin/components/MultiPartySettlementLedger"));
const SystemSettingsPage = lazy(() => import("../app/pages/admin/SystemSettingsPage"));
const SystemAdminAccountPage = lazy(() => import("../app/pages/admin/SystemAdminAccountPage"));
const NotFound = lazy(() => import("../app/pages/NotFound"));

export const opsRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", element: <Navigate to="/system/admin" replace /> },
      { path: "/login", Component: SystemAdminLogin },
      { path: "/system/login", Component: SystemAdminLogin },
      {
        Component: SystemAdminShell,
        children: [
          { path: "/system/admin", Component: SystemAdminDashboard },
          { path: "/system/admin/tenants", Component: SystemAdminDashboard },
          { path: "/system/admin/tenants/pending", Component: SystemAdminDashboard },
          { path: "/system/admin/tenants/pending/:id", Component: PendingTenantDetailPage },
          { path: "/system/admin/settlement-center", Component: SettlementCenterPage },
          { path: "/system/admin/stats", Component: TenantStatsPage },
          { path: "/system/admin/partners", Component: PartnerManagement },
          { path: "/system/admin/partners/:id", Component: PartnerDetailPage },
          { path: "/system/admin/commissions", Component: CommissionStatsPage },
          { path: "/system/admin/ledger", Component: MultiPartySettlementLedger },
          { path: "/system/admin/tenant/:id", Component: TenantDetailPage },
          { path: "/system/admin/settings", Component: SystemSettingsPage },
          { path: "/system/admin/system-admin-accounts", Component: SystemAdminAccountPage },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
], { basename: import.meta.env.BASE_URL });
