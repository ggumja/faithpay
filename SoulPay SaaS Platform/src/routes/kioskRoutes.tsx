import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import RootLayout from "../app/layouts/RootLayout";

// ── 현장 무인 터치 키오스크 전용 컴포넌트 ──
const Root = lazy(() => import("../app/pages/Root"));
const TenantKiosk = lazy(() => import("../app/pages/TenantKiosk"));
const NotFound = lazy(() => import("../app/pages/NotFound"));
const KakaoPaySandbox = lazy(() => import("../app/pages/KakaoPaySandbox"));
const KakaoPayApprovePage = lazy(() => import("../app/pages/KakaoPayApprovePage"));

export const kioskRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", Component: Root },
      { path: "/kakaopay/sandbox", Component: KakaoPaySandbox },
      { path: "/kakaopay/approve", Component: KakaoPayApprovePage },
      { path: "/kiosk/:tenantSlug", Component: TenantKiosk },
      { path: "/:tenantSlug/kiosk", Component: TenantKiosk },
      { path: "/:tenantSlug", Component: TenantKiosk },
      { path: "*", Component: NotFound },
    ],
  },
], { basename: import.meta.env.BASE_URL });
