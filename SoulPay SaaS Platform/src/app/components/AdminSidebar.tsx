import { useNavigate, Link } from 'react-router';
import { useApp } from '../context/AppContext';
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
  const terms = useTenantTerms(currentTenant);
  const { canAccessMenu, getMenuPermission } = useAdminPermissions();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: `/admin` },
    { id: 'donations', icon: Heart, label: terms.donationHistory, path: `/admin/donations` },
    { id: 'recurring_pending', icon: Calendar, label: terms.recurringPending, path: `/admin/recurring-pending` },
    { id: 'statistics', icon: BarChart3, label: '마감 통계', path: `/admin/statistics` },
    { id: 'prayers', icon: MessageSquare, label: terms.prayer, path: `/admin/prayers` },
    { id: 'menu', icon: FileText, label: terms.donationItems, path: `/admin/menu` },
    { id: 'members', icon: Users, label: terms.memberManagement || '회원 관리', path: `/admin/members` },
    { id: 'settlement', icon: DollarSign, label: '정산(추정) 집계', path: `/admin/settlement` },
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
    <div className="w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 p-6 flex flex-col overflow-y-auto shrink-0 z-20 font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-blue-600 tracking-tight">
          SoulPay
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">관리자 대시보드</p>
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
          <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
            
            <div className="flex items-start gap-3 pt-1">
              {/* Avatar Circle */}
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white mt-0.5">
                {initialChar}
              </div>

              {/* Text Container */}
              <div className="min-w-0 flex-1 space-y-1">
                {/* Organization Name */}
                {currentTenant?.name && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                    <span className="truncate">{currentTenant.name}</span>
                  </div>
                )}

                {/* Admin Display Name */}
                <p className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                  {adminDisplayName}
                </p>

                {/* Role Badge */}
                <div className="pt-0.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-white text-blue-700 text-[11px] font-bold rounded-full border border-blue-200 shadow-2xs whitespace-nowrap">
                    {getRoleName(adminRole)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <nav className="space-y-0.5 flex-1">
        {accessibleMenuItems.map((item) => {
          const fullPath = tenantSlug ? `/${tenantSlug}${item.path}` : item.path;
          const isActive = currentPath === fullPath;
          const permLevel = getMenuPermission(item.id);

          return (
            <Link key={item.id} to={fullPath}>
              <div
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center min-w-0">
                  <item.icon className={`h-4 w-4 mr-2.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {permLevel === 'read' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                    조회
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4" />

      <div className="space-y-1.5">
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          onClick={() => navigate(tenantSlug ? `/${tenantSlug}` : '/')}
        >
          <span className="truncate">{terms.publicPageLabel || '온라인 수납 페이지 보기'}</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
        </button>

        <button
          className="w-full flex items-center justify-start px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2.5 text-rose-500" />
          로그아웃
        </button>
      </div>
    </div>
  );
}