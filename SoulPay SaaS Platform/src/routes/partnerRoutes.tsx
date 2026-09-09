import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import RootLayout from "../app/layouts/RootLayout";

// ── 파트너 / 총판 / 대리점 / 에이전트 포털 전용 컴포넌트 ──
const PartnerLogin = lazy(() => import("../app/pages/partner/PartnerLogin"));
const PartnerApply = lazy(() => import("../app/pages/partner/PartnerApply"));
const PartnerDashboard = lazy(() => import("../app/pages/partner/PartnerDashboard"));
const PartnerTenantCreate = lazy(() => import("../app/pages/partner/PartnerTenantCreate"));
const AgentDashboard = lazy(() => import("../app/pages/agent/AgentDashboard"));
const NotFound = lazy(() => import("../app/pages/NotFound"));

export const partnerRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", Component: PartnerLogin },
      { path: "/login", Component: PartnerLogin },
      { path: "/partner/login", Component: PartnerLogin },
      { path: "/agency/login", Component: PartnerLogin },
      { path: "/apply", Component: PartnerApply },
      { path: "/partner/apply", Component: PartnerApply },
      { path: "/dashboard", Component: PartnerDashboard },
      { path: "/partner/dashboard", Component: PartnerDashboard },
      { path: "/agency/dashboard", Component: PartnerDashboard },
      { path: "/agent/dashboard", Component: AgentDashboard },
      { path: "/partner/tenants/new", Component: PartnerTenantCreate },
      { path: "*", Component: NotFound },
    ],
  },
], { basename: import.meta.env.BASE_URL });
