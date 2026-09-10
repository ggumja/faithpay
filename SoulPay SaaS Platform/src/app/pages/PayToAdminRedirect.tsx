import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getAdminPortalUrl } from '../utils/domainUtils';

export default function PayToAdminRedirect() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const targetUrl = getAdminPortalUrl(tenantSlug);
    const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

    if (isExternal) {
      window.location.replace(targetUrl);
    } else {
      // 로컬/Dev 단일 포트 환경에서 혹시나 payRouter로 접근된 경우
      navigate(targetUrl, { replace: true });
    }
  }, [tenantSlug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm font-semibold text-slate-300">관리자 포털로 이동 중입니다...</p>
      </div>
    </div>
  );
}
