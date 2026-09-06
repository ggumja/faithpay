import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { Button } from './ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RBACRouteGuardProps {
  menuId: string;
  children: React.ReactNode;
}

export function RBACRouteGuard({ menuId, children }: RBACRouteGuardProps) {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { canAccessMenu, getMenuPermission } = useAdminPermissions();

  const isAllowed = canAccessMenu(menuId);
  const permLevel = getMenuPermission(menuId);

  if (!isAllowed || permLevel === 'none') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
              메뉴 접근 권한이 제한되었습니다
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
              소속된 관리자 그룹 권한에 따라 해당 메뉴에 대한 접근이 차단되어 있습니다.<br />
              필요 시 단체 최고 관리자(👑)에게 계정 권한 변경을 요청하세요.
            </p>
          </div>

          <Button
            onClick={() => navigate(tenantSlug ? `/${tenantSlug}/admin` : '/admin')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 rounded-xl text-xs py-2.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
