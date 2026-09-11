import { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronRight,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { useTenantTerms } from '../hooks/useTenantTerms';
import { toast } from 'sonner';

import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { isAdminPortalDomain, getPayPortalUrl } from '../utils/domainUtils';

interface AdminSidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

export function AdminSidebar({ tenantSlug, currentPath }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { currentAdmin, setCurrentAdmin, currentTenant, setCurrentTenant, tenants } = useApp();
  const decodedSlug = tenantSlug ? decodeURIComponent(tenantSlug).trim().toLowerCase() : '';
  const effectiveTenant = (decodedSlug
    ? tenants.find(
        (t) =>
          (t.slug && t.slug.toLowerCase() === decodedSlug) ||
          (t.id && t.id.toLowerCase() === decodedSlug) ||
          (t.name && t.name.toLowerCase() === decodedSlug) ||
          (t.slug && decodeURIComponent(t.slug).toLowerCase() === decodedSlug)
      )
    : null) || currentTenant;
  const terms = useTenantTerms(effectiveTenant);
  const { canAccessMenu, getMenuPermission } = useAdminPermissions();

  // admin.soulpay.kr 또는 URL에 /admin 프리픽스가 없는 단독 관리자 경로 환경 판별
  const isDedicatedAdmin = isAdminPortalDomain() || !currentPath.includes('/admin');
  const prefix = isDedicatedAdmin ? '' : '/admin';

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: prefix || '/' },
    { id: 'donations', icon: Heart, label: terms.donationHistory, path: `${prefix}/donations` },
    { id: 'recurring_pending', icon: Calendar, label: terms.recurringPending, path: `${prefix}/recurring-pending` },
    { id: 'statistics', icon: BarChart3, label: '마감 통계', path: `${prefix}/statistics` },
    { id: 'prayers', icon: MessageSquare, label: terms.prayer, path: `${prefix}/prayers` },
    { id: 'menu', icon: FileText, label: terms.donationItems, path: `${prefix}/menu` },
    { id: 'members', icon: Users, label: terms.memberManagement || '회원 관리', path: `${prefix}/members` },
    { id: 'settlement', icon: DollarSign, label: '정산(추정) 집계', path: `${prefix}/settlement` },
    { id: 'banners', icon: Image, label: '배너 관리', path: `${prefix}/banners` },
    { id: 'accounts', icon: UserCheck, label: '관리자 계정 관리', path: `${prefix}/accounts` },
    { id: 'settings', icon: Settings, label: '설정', path: `${prefix}/settings` },
  ];

  const accessibleMenuItems = menuItems.filter((item) => canAccessMenu(item.id));

  const handleLogout = () => {
    setCurrentAdmin(null);
    setCurrentTenant(null);
    toast.success('로그아웃되었습니다');
    const loginTarget = tenantSlug
      ? (isDedicatedAdmin ? `/${tenantSlug}/login` : `/${tenantSlug}/admin/login`)
      : (isDedicatedAdmin ? '/login' : '/admin/login');
    navigate(loginTarget);
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

  const isSettingsActive = currentPath.includes('/settings');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  useEffect(() => {
    if (isSettingsActive) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsActive]);

  const settingsSubItems = [
    {
      id: 'settings_basic',
      label: '기본정보',
      icon: Building2,
      path: `${prefix}/settings`,
      isActive: (normCurr: string, normFull: string) =>
        normCurr === normFull ||
        normCurr.endsWith('/settings') ||
        normCurr.endsWith('/settings/basic'),
    },
    {
      id: 'settings_design',
      label: '디자인',
      icon: Palette,
      path: `${prefix}/settings/design`,
      isActive: (normCurr: string) => normCurr.includes('/settings/design'),
    },
    {
      id: 'settings_docs',
      label: '단체서류',
      icon: ShieldCheck,
      path: `${prefix}/settings/documents`,
      isActive: (normCurr: string) => normCurr.includes('/settings/documents'),
    },
  ];

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
          effectiveTenant?.adminName ||
          effectiveTenant?.businessInfo?.representativeName ||
          effectiveTenant?.contact?.name ||
          '대표 관리자';

        const adminRole = currentAdmin?.role === 'system_admin' ? 'tenant_admin' : (currentAdmin?.role || 'tenant_admin');

        return (
          <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
            
            <div className="space-y-1.5 pt-0.5">
              {/* Organization Name & Role */}
              <div className="flex items-center justify-between gap-2">
                {effectiveTenant?.name && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{effectiveTenant.name}</span>
                  </div>
                )}
                <span className="inline-flex items-center px-2 py-0.5 bg-white text-blue-700 text-[11px] font-bold rounded-full border border-blue-200 shadow-2xs whitespace-nowrap shrink-0">
                  {getRoleName(adminRole)}
                </span>
              </div>

              {/* Admin Display Name */}
              <p className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                {adminDisplayName}
              </p>
            </div>
          </div>
        );
      })()}

      <nav className="space-y-0.5 flex-1">
        {accessibleMenuItems.map((item) => {
          const fullPath = tenantSlug
            ? (item.path === '/' ? `/${tenantSlug}` : `/${tenantSlug}${item.path}`)
            : item.path;
          
          // /gakwonsa/settings 및 /gakwonsa/admin/settings 양방향 활성화 지원
          const normalizedCurrent = currentPath.replace(/\/admin(?=\/|$)/, '') || '/';
          const normalizedFull = fullPath.replace(/\/admin(?=\/|$)/, '') || '/';
          const isActive = currentPath === fullPath || normalizedCurrent === normalizedFull;
          const permLevel = getMenuPermission(item.id);

          // 설정 메뉴인 경우 하위메뉴 아코디언 렌더링
          if (item.id === 'settings') {
            const isSettingsParentActive = isSettingsActive;

            return (
              <div key={item.id} className="space-y-0.5">
                <div
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer select-none ${
                    isSettingsParentActive
                      ? 'bg-blue-50/70 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <item.icon className={`h-4 w-4 mr-2.5 shrink-0 ${isSettingsParentActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {permLevel === 'read' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                        조회
                      </span>
                    )}
                    {isSettingsOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* 설정 하위메뉴 목록 */}
                {isSettingsOpen && (
                  <div className="ml-4 pl-3 border-l-2 border-slate-100 space-y-0.5 pt-0.5 pb-1">
                    {settingsSubItems.map((sub) => {
                      const subFullPath = tenantSlug
                        ? `/${tenantSlug}${sub.path}`
                        : sub.path;
                      const subNormalizedFull = subFullPath.replace(/\/admin(?=\/|$)/, '') || '/';
                      const isSubActive = sub.isActive(normalizedCurrent, subNormalizedFull);
                      const SubIcon = sub.icon;

                      return (
                        <Link key={sub.id} to={subFullPath}>
                          <div
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`}
                          >
                            <SubIcon className={`h-3 w-3 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{sub.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
          onClick={() => {
            const payUrl = getPayPortalUrl(tenantSlug);
            if (payUrl.startsWith('http')) {
              window.open(payUrl, '_blank');
            } else {
              navigate(payUrl);
            }
          }}
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