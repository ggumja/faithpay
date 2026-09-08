import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppProvider } from '../context/AppContext';
import { Toaster } from '../components/ui/sonner';
import PageLoadingFallback from '../components/common/PageLoadingFallback';

export default function RootLayout() {
  return (
    <AppProvider>
      <Suspense fallback={<PageLoadingFallback />}>
        <Outlet />
      </Suspense>
      <Toaster position="top-center" richColors closeButton />
    </AppProvider>
  );
}
