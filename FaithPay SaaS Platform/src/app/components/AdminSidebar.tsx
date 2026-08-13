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

interface AdminSidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

export function AdminSidebar({ tenantSlug, currentPath }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { currentAdmin, setCurrentAdmin, currentTenant, setCurrentTenant } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

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

  const handleLogout = () => {
    setCurrentAdmin(null);
    setCurrentTenant(null);
    toast.success('로그아웃되었습니다');
    navigate('/admin/login');
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return '단체 관리자';
      case 'finance_manager':
        return '재정 담당자';
      default:
        return '관리자';
    }
  };

  return (
    <div className="w-64 bg-white border-r h-screen sticky top-0 p-6 flex flex-col overflow-y-auto shrink-0 z-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FaithPay
        </h2>
        <p className="text-sm text-muted-foreground">관리자 대시보드</p>
      </div>

      {currentAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/20 relative overflow-hidden group">
          {/* Subtle background glow effect */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all duration-500" />
          
          <div className="flex items-start gap-3 relative z-10">
            {/* Avatar circle */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1.5px] shrink-0 shadow-md">
              <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center font-bold text-sm text-indigo-200">
                {currentAdmin.name ? currentAdmin.name[0] : '관'}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  접속 중
                </span>
                {currentTenant && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    /{currentTenant.slug}
                  </span>
                )}
              </div>

              <h4 className="font-bold text-sm text-white truncate mt-0.5" title={currentAdmin.name}>
                {currentAdmin.name}
              </h4>

              {currentTenant?.name && (
                <p className="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{currentTenant.name}</span>
                </p>
              )}

              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  <ShieldCheck className="w-2.5 h-2.5 mr-1 text-indigo-300" />
                  {getRoleName(currentAdmin.role)}
                </span>
                {currentTenant?.religionType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {currentTenant.religionType === 'buddhist' ? '🪷 불교' : currentTenant.religionType === 'catholic' ? '⛪ 천주교' : '✝️ 기독교'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const fullPath = `/${tenantSlug}${item.path}`;
          const isActive = currentPath === fullPath;
          return (
            <Link key={item.id} to={fullPath}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
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