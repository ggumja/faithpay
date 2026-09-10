import { useEffect } from 'react';
import { useParams } from 'react-router';
import { getAdminPortalUrl } from '../utils/domainUtils';

export default function PayToAdminRedirect() {
  const { tenantSlug } = useParams();

  useEffect(() => {
    const targetUrl = getAdminPortalUrl(tenantSlug);
    window.location.replace(targetUrl);
  }, [tenantSlug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm font-semibold text-slate-300">관리자 포털(admin.soulpay.kr)로 이동 중입니다...</p>
      </div>
    </div>
  );
}
