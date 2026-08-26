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
        const rawName = currentAdmin?.name && currentAdmin.name !== '시스템 최고 관리자' ? currentAdmin.name : '';
        const adminDisplayName =
          rawName ||
          currentTenant?.adminName ||
          currentTenant?.businessInfo?.representativeName ||
          currentTenant?.contact?.name ||
          '대표 관리자';

        const adminRole = currentAdmin?.role === 'system_admin' ? 'tenant_admin' : (currentAdmin?.role || 'tenant_admin');
        const initialChar = adminDisplayName ? adminDisplayName[0] : '관';

        return (
          <div className="mb-6 p-3.5 bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-zinc-900 dark:to-zinc-900/60 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs relative overflow-hidden">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <div className="flex items-start gap-3 pt-1">
              {/* Avatar Circle */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-200/60 dark:shadow-none ring-2 ring-white dark:ring-zinc-800 mt-0.5">
                {initialChar}
              </div>

              {/* Text Container */}
              <div className="min-w-0 flex-1 space-y-1">
                {/* Organization Name */}
                {currentTenant?.name && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    <Building2 className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{currentTenant.name}</span>
                  </div>
                )}

                {/* Admin Display Name */}
                <p className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 truncate leading-snug">
                  {adminDisplayName}
                </p>

                {/* Role Badge & Status */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-full border border-indigo-200/80 shadow-2xs whitespace-nowrap shrink-0">
                    {getRoleName(adminRole)}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    온라인
                  </span>
                </div>
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