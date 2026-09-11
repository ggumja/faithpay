import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';

export default function AdminRedirectGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAdmin, currentTenant, tenants } = useApp();

  useEffect(() => {
    const subpath = location.pathname.replace(/^\/admin/, '') || '';
    const targetSlug = currentTenant?.slug || tenants.find(t => t.id === currentAdmin?.tenantId)?.slug;

    if (currentAdmin?.role === 'system_admin') {
      navigate('/system/admin' + subpath, { replace: true });
    } else if (targetSlug) {
      navigate(`/${targetSlug}/admin${subpath}`, { replace: true });
    } else if (currentAdmin && tenants.length === 0) {
      // 테넌트 목록 로딩 중 대기
      return;
    } else {
      navigate('/admin/login', { replace: true });
    }
  }, [currentAdmin, currentTenant, tenants, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm font-semibold text-slate-400">관리자 포털로 이동 중입니다...</p>
      </div>
    </div>
  );
}
