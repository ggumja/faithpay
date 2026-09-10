import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppProvider } from '../context/AppContext';
import { Toaster } from '../components/ui/sonner';
import PageLoadingFallback from '../components/common/PageLoadingFallback';
import { getForwardUrlFromRootDomain } from '../utils/domainUtils';

export default function RootLayout() {
  const location = useLocation();

  if (typeof window !== 'undefined') {
    const forwardUrl = getForwardUrlFromRootDomain(location.pathname, location.search);
    if (forwardUrl) {
      window.location.replace(forwardUrl);
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-semibold text-slate-300">스마트 헌금/수납 결제 포털로 이동 중입니다...</p>
          </div>
        </div>
      );
    }
  }

  return (
    <AppProvider>
      <Suspense fallback={<PageLoadingFallback />}>
        <Outlet />
      </Suspense>
      <Toaster position="top-center" richColors closeButton />
    </AppProvider>
  );
}
