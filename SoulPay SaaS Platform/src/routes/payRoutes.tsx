import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import RootLayout from "../app/layouts/RootLayout";

// ── 기부자 모바일 웹 결제 전용 컴포넌트 ──
const Root = lazy(() => import("../app/pages/Root"));
const NotFound = lazy(() => import("../app/pages/NotFound"));
const TenantHome = lazy(() => import("../app/pages/TenantHome"));
const DonationFlow = lazy(() => import("../app/pages/DonationFlow"));
const PaymentSelection = lazy(() => import("../app/pages/PaymentSelection"));
const DonationComplete = lazy(() => import("../app/pages/DonationComplete"));
const MyDonations = lazy(() => import("../app/pages/MyDonations"));
const TaxReceiptCenter = lazy(() => import("../app/pages/TaxReceiptCenter"));
const KakaoPaySandbox = lazy(() => import("../app/pages/KakaoPaySandbox"));
const KakaoPayApprovePage = lazy(() => import("../app/pages/KakaoPayApprovePage"));
const PayToAdminRedirect = lazy(() => import("../app/pages/PayToAdminRedirect"));

export const payRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", Component: Root },
      { path: "/kakaopay/sandbox", Component: KakaoPaySandbox },
      { path: "/kakaopay/approve", Component: KakaoPayApprovePage },
      { path: "/admin", Component: PayToAdminRedirect },
      { path: "/admin/*", Component: PayToAdminRedirect },
      { path: "/login", Component: PayToAdminRedirect },
      { path: "/:tenantSlug/admin", Component: PayToAdminRedirect },
      { path: "/:tenantSlug/admin/*", Component: PayToAdminRedirect },
      { path: "/:tenantSlug/login", Component: PayToAdminRedirect },
      { path: "/:tenantSlug", Component: TenantHome },
      { path: "/:tenantSlug/donate", Component: DonationFlow },
      { path: "/:tenantSlug/payment", Component: PaymentSelection },
      { path: "/:tenantSlug/complete", Component: DonationComplete },
      { path: "/:tenantSlug/my-donations", Component: MyDonations },
      { path: "/:tenantSlug/tax-receipt", Component: TaxReceiptCenter },
      { path: "*", Component: NotFound },
    ],
  },
], { basename: import.meta.env.BASE_URL });
