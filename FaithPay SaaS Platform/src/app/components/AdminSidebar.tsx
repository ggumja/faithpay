import { useNavigate, Link } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  LayoutDashboard,
  Heart,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Settings,
  DollarSign,
  LogOut,
  Image,
  ExternalLink,
  BarChart3,
  UserCheck,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useTenantTerms } from '../hooks/useTenantTerms';
import { toast } from 'sonner';

import { useAdminPermissions } from '../hooks/useAdminPermissions';

interface AdminSidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

export function AdminSidebar({ tenantSlug, currentPath }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { currentAdmin, setCurrentAdmin, currentTenant, setCurrentTenant } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);
  const { canAccessMenu, getMenuPermission } = useAdminPermissions();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: `/admin` },
    { id: 'donations', icon: Heart, label: terms.donationHistory, path: `/admin/donations` },
    { id: 'recurring_pending', icon: Calendar, label: terms.recurringPending, path: `/admin/recurring-pending` },
    { id: 'statistics', icon: BarChart3, label: '마감 통계', path: `/admin/statistics` },
    { id: 'prayers', icon: MessageSquare, label: terms.prayer, path: `/admin/prayers` },
    { id: 'menu', icon: FileText, label: terms.donationItems, path: `/admin/menu` },
    { id: 'members', icon: Users, label: '회원 관리', path: `/admin/members` },
    { id: 'settlement', icon: DollarSign, label: '정산', path: `/admin/settlement` },
    { id: 'banners', icon: Image, label: '배너 관리', path: `/admin/banners` },
    { id: 'accounts', icon: UserCheck, label: '관리자 계정 관리', path: `/admin/accounts` },
    { id: 'settings', icon: Settings, label: '설정', path: `/admin/settings` },
  ];

  const accessibleMenuItems = menuItems.filter((item) => canAccessMenu(item.id));

  const handleLogout = () => {
    setCurrentAdmin(null);
    setCurrentTenant(null);
    toast.success('로그아웃되었습니다');
    navigate('/admin/login');
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return '👑 최고 관리자';
      case 'finance_manager':
        return '💳 재정 담당자';
      case 'staff':
        return '📝 일반 실무자';
      default:
        return '👥 관리자';
    }
  };

  return (
    <div className="w-64 bg-white border-r h-screen sticky top-0 p-6 flex flex-col overflow-y-auto shrink-0 z-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          SoulPay
        </h2>
        <p className="text-sm text-muted-foreground">관리자 대시보드</p>
      </div>

      {(() => {
        const adminDisplayName =
          (currentAdmin?.name && currentAdmin.name !== '시스템 최고 관리자' ? currentAdmin.name : '') ||
          currentTenant?.adminName ||
          currentTenant?.contact?.name ||
          currentTenant?.businessInfo?.representativeName ||
          (currentTenant?.name ? `${currentTenant.name} 최고 관리자` : '대표 관리자');

        const adminRole = currentAdmin?.role === 'system_admin' ? 'tenant_admin' : (currentAdmin?.role || 'tenant_admin');
        const initialChar = adminDisplayName ? adminDisplayName[0] : '관';

        return (
          <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
              {initialChar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-slate-800 truncate">{adminDisplayName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-md border border-blue-200/60">
                  {getRoleName(adminRole)}
                </span>
                {currentTenant?.name && (
                  <span className="text-[11px] text-slate-500 truncate">
                    · {currentTenant.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <nav className="space-y-2 flex-1">
        {accessibleMenuItems.map((item) => {
          const fullPath = `/${tenantSlug}${item.path}`;
          const isActive = currentPath === fullPath;
          const permLevel = getMenuPermission(item.id);

          return (
            <Link key={item.id} to={fullPath}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-between group"
              >
                <div className="flex items-center min-w-0">
                  <item.icon className="h-4 w-4 mr-3 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {permLevel === 'read' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold opacity-80 shrink-0">
                    조회
                  </span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4" />

      <div className="space-y-1">
        <Button
          variant="outline"
          className="w-full justify-between font-semibold border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800"
          onClick={() => navigate(tenantSlug ? `/${tenantSlug}` : '/')}
        >
          <span>신도 페이지 보기</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}