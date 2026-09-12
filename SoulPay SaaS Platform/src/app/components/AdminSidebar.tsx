import { useNavigate, Link } from 'react-router';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Separator } from './ui/separator';
import {
  LayoutDashboard,
  Heart,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  DollarSign,
  LogOut,
  Image as ImageIcon,
  ExternalLink,
  UserCheck,
  Building2,
  Palette,
  ShieldCheck,
  TrendingUp,
  LifeBuoy,
  KeyRound,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { useTenantTerms } from '../hooks/useTenantTerms';
import { toast } from 'sonner';
import { adminAPI } from '../api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';

import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { isAdminPortalDomain, getPayPortalUrl } from '../utils/domainUtils';

interface AdminSidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

export function AdminSidebar({ tenantSlug, currentPath }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { currentAdmin, setCurrentAdmin, currentTenant, setCurrentTenant, tenants } = useApp();

  // 🔑 비밀번호 변경 모달 상태
  const [isPwModalOpen, setIsPwModalOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isPwChanging, setIsPwChanging] = useState(false);

  const openPwModal = () => {
    setNewPw(''); setConfirmPw('');
    setShowNewPw(false); setShowConfirmPw(false);
    setIsPwModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin?.email || !currentTenant?.id) { toast.error('로그인 정보를 확인할 수 없습니다.'); return; }
    if (!newPw || !confirmPw) { toast.error('새 비밀번호를 입력해 주세요.'); return; }
    if (newPw.length < 8) { toast.error('새 비밀번호는 8자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { toast.error('비밀번호가 일치하지 않습니다.'); return; }
    setIsPwChanging(true);
    try {
      const res = await adminAPI.changeTenantAdminPassword(
        currentTenant.id, currentAdmin.email, newPw
      );
      if (res.success) {
        toast.success('✅ 비밀번호가 성공적으로 변경되었습니다.');
        setIsPwModalOpen(false);
      } else {
        toast.error(res.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      toast.error('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsPwChanging(false);
    }
  };
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

  const normalizedCurrent = currentPath.replace(/\/admin(?=\/|$)/, '') || '/';

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

  // 1. 대시보드
  const dashboardFullPath = tenantSlug
    ? (prefix || '/' === '/' ? `/${tenantSlug}` : `/${tenantSlug}${prefix}`)
    : (prefix || '/');
  const isDashboardActive =
    currentPath === dashboardFullPath ||
    normalizedCurrent === '/' ||
    normalizedCurrent === '' ||
    normalizedCurrent === `/${tenantSlug}`;

  // 2. 운영 관리 그룹
  const operationItems = [
    {
      id: 'donations',
      label: terms.donationHistory,
      icon: Heart,
      path: `${prefix}/donations`,
      isActive: normalizedCurrent.includes('/donations'),
    },
    {
      id: 'recurring_pending',
      label: terms.recurringPending,
      icon: Calendar,
      path: `${prefix}/recurring-pending`,
      isActive: normalizedCurrent.includes('/recurring-pending'),
    },
    {
      id: 'members',
      label: terms.memberManagement || '회원 관리',
      icon: Users,
      path: `${prefix}/members`,
      isActive: normalizedCurrent.includes('/members'),
    },
    {
      id: 'prayers',
      label: terms.prayer,
      icon: MessageSquare,
      path: `${prefix}/prayers`,
      isActive: normalizedCurrent.includes('/prayers'),
    },
    {
      id: 'menu',
      label: terms.donationItems,
      icon: FileText,
      path: `${prefix}/menu`,
      isActive: normalizedCurrent.includes('/menu'),
    },
  ].filter((item) => canAccessMenu(item.id));

  // 3. 통계 & 정산 그룹
  const analyticsItems = [
    {
      id: 'statistics',
      label: '마감 통계',
      icon: TrendingUp,
      path: `${prefix}/statistics`,
      isActive: normalizedCurrent.includes('/statistics'),
    },
    {
      id: 'settlement',
      label: '정산(추정) 집계',
      icon: DollarSign,
      path: `${prefix}/settlement`,
      isActive: normalizedCurrent.includes('/settlement'),
    },
  ].filter((item) => canAccessMenu(item.id));

  // 4. 설정 그룹 (배너 관리 포함)
  const settingsItems = [
    {
      id: 'settings',
      label: '기본정보',
      icon: Building2,
      path: `${prefix}/settings`,
      isActive:
        normalizedCurrent.endsWith('/settings') ||
        normalizedCurrent.endsWith('/settings/basic'),
    },
    {
      id: 'settings',
      label: '디자인',
      icon: Palette,
      path: `${prefix}/settings/design`,
      isActive: normalizedCurrent.includes('/settings/design'),
    },
    {
      id: 'banners',
      label: '배너 관리',
      icon: ImageIcon,
      path: `${prefix}/settings/banners`,
      isActive: normalizedCurrent.includes('/banners'),
    },
    {
      id: 'settings',
      label: '단체서류',
      icon: ShieldCheck,
      path: `${prefix}/settings/documents`,
      isActive: normalizedCurrent.includes('/settings/documents'),
    },
  ].filter((item) => canAccessMenu(item.id));

  // 5. 계정 그룹
  const accountItems = [
    {
      id: 'accounts',
      label: '관리자 계정 관리',
      icon: UserCheck,
      path: `${prefix}/accounts`,
      isActive: normalizedCurrent.includes('/accounts'),
    },
  ].filter((item) => canAccessMenu(item.id));

  return (
    <div className="w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 p-5 flex flex-col overflow-y-auto shrink-0 z-20 font-sans">
      {/* Brand Header */}
      <div className="mb-5 px-1">
        <h2 className="text-2xl font-black text-blue-600 tracking-tight">
          SoulPay
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">관리자 대시보드</p>
      </div>

      {/* Admin Profile Card */}
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
          <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />

            <div className="space-y-1.5 pt-0.5">
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

              <p className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                {adminDisplayName}
              </p>

              {/* 비밀번호 변경 버튼 */}
              <button
                onClick={openPwModal}
                className="mt-1 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <KeyRound className="h-3 w-3" />
                비밀번호 변경
              </button>
            </div>
          </div>
        );
      })()}

      {/* 🔑 비밀번호 변경 모달 */}
      <Dialog open={isPwModalOpen} onOpenChange={setIsPwModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
              내 비밀번호 변경
            </DialogTitle>
            <DialogDescription className="text-xs">
              새 비밀번호를 입력하세요. 8자 이상이어야 합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            {/* 새 비밀번호 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">새 비밀번호 <span className="text-slate-400 font-normal">(8자 이상)</span></Label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">새 비밀번호 확인</Label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="새 비밀번호 재입력"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowConfirmPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPw && newPw && (
                <p className={`text-xs mt-1 ${newPw === confirmPw ? 'text-green-600' : 'text-red-500'}`}>
                  {newPw === confirmPw ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPwChanging || !newPw || !confirmPw || newPw !== confirmPw}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
            >
              {isPwChanging ? (
                <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> 변경 중...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> 비밀번호 변경</span>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>


      {/* Navigation Group Sections */}
      <nav className="space-y-4 flex-1">
        {/* 1. 대시보드 (단독) */}
        {canAccessMenu('dashboard') && (
          <div>
            <Link to={tenantSlug ? `/${tenantSlug}${prefix || ''}` : (prefix || '/')}>
              <div
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  isDashboardActive
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                }`}
              >
                <div className="flex items-center min-w-0">
                  <LayoutDashboard className={`h-4 w-4 mr-2.5 shrink-0 ${isDashboardActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="truncate">대시보드</span>
                </div>
                {getMenuPermission('dashboard') === 'read' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                    조회
                  </span>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* 2. 운영 관리 그룹 */}
        {operationItems.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider">
              운영 관리
            </div>
            <div className="space-y-0.5">
              {operationItems.map((item) => {
                const fullPath = tenantSlug ? `/${tenantSlug}${item.path}` : item.path;
                const Icon = item.icon;
                const perm = getMenuPermission(item.id);

                return (
                  <Link key={item.path} to={fullPath}>
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Icon className={`h-4 w-4 mr-2.5 shrink-0 ${item.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {perm === 'read' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                          조회
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. 통계 & 정산 그룹 */}
        {analyticsItems.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider">
              통계 & 정산
            </div>
            <div className="space-y-0.5">
              {analyticsItems.map((item) => {
                const fullPath = tenantSlug ? `/${tenantSlug}${item.path}` : item.path;
                const Icon = item.icon;
                const perm = getMenuPermission(item.id);

                return (
                  <Link key={item.path} to={fullPath}>
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Icon className={`h-4 w-4 mr-2.5 shrink-0 ${item.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {perm === 'read' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                          조회
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. 설정 그룹 (배너 관리 포함) */}
        {settingsItems.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider">
              설정
            </div>
            <div className="space-y-0.5">
              {settingsItems.map((item) => {
                const fullPath = tenantSlug ? `/${tenantSlug}${item.path}` : item.path;
                const Icon = item.icon;
                const perm = getMenuPermission(item.id);

                return (
                  <Link key={item.path} to={fullPath}>
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Icon className={`h-4 w-4 mr-2.5 shrink-0 ${item.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {perm === 'read' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                          조회
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. 계정 그룹 */}
        {accountItems.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider">
              계정
            </div>
            <div className="space-y-0.5">
              {accountItems.map((item) => {
                const fullPath = tenantSlug ? `/${tenantSlug}${item.path}` : item.path;
                const Icon = item.icon;
                const perm = getMenuPermission(item.id);

                return (
                  <Link key={item.path} to={fullPath}>
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Icon className={`h-4 w-4 mr-2.5 shrink-0 ${item.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {perm === 'read' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                          조회
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. 고객 문의 (고정 링크 — 모든 관리자 노출) */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider">
            지원
          </div>
          <div className="space-y-0.5">
            <Link to={tenantSlug ? `/${tenantSlug}${prefix}/support` : `${prefix}/support`}>
              <div
                className={`w-full flex items-center px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  normalizedCurrent.includes('/support')
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <LifeBuoy className={`h-4 w-4 mr-2.5 shrink-0 ${normalizedCurrent.includes('/support') ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="truncate">고객 문의</span>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <Separator className="my-4" />

      {/* Bottom Shortcuts & Logout */}
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