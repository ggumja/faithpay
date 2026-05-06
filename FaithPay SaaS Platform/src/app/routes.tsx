import { createBrowserRouter } from "react-router";
import RootLayout from "./layouts/RootLayout";
import Root from "./pages/Root";
import TenantHome from "./pages/TenantHome";
import DonationFlow from "./pages/DonationFlow";
import PaymentSelection from "./pages/PaymentSelection";
import DonationComplete from "./pages/DonationComplete";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemAdminDashboard from "./pages/admin/SystemAdminDashboard";
import TenantDetailPage from "./pages/admin/TenantDetailPage";
import DonationHistory from "./pages/admin/DonationHistory";
import PrayerManagement from "./pages/admin/PrayerManagement";
import DonationMenuManagement from "./pages/admin/DonationMenuManagement";
import MemberManagement from "./pages/admin/MemberManagement";
import SettlementReports from "./pages/admin/SettlementReports";
import BannerManagement from "./pages/admin/BannerManagement";
import OrganizationSettings from "./pages/admin/OrganizationSettings";
import MyDonations from "./pages/MyDonations";
import TaxReceiptCenter from "./pages/TaxReceiptCenter";
import OnboardingFlow from "./pages/OnboardingFlow";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Root,
      },
      {
        path: "/admin/login",
        Component: AdminLogin,
      },
      {
        path: "/system/admin",
        Component: SystemAdminDashboard,
      },
      {
        path: "/system/admin/tenant/:id",
        Component: TenantDetailPage,
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
        path: "/:tenantSlug/admin/settlement",
        Component: SettlementReports,
      },
      {
        path: "/:tenantSlug/admin/banners",
        Component: BannerManagement,
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
        path: "*",
        Component: NotFound,
      },
    ],
  },
], { basename: import.meta.env.BASE_URL });