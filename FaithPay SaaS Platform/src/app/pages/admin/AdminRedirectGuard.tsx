import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';

export default function AdminRedirectGuard() {
  const navigate = useNavigate();
  const { currentAdmin, currentTenant } = useApp();

  useEffect(() => {
    if (currentAdmin?.role === 'system_admin') {
      navigate('/system/admin', { replace: true });
    } else if (currentAdmin?.role === 'tenant_admin' && currentTenant?.slug) {
      navigate(`/${currentTenant.slug}/admin`, { replace: true });
    } else {
      navigate('/system/admin', { replace: true });
    }
  }, [currentAdmin, currentTenant, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm font-semibold text-slate-400">관리자 포털로 이동 중입니다...</p>
      </div>
    </div>
  );
}
