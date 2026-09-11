import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { isAdminPortalDomain } from '../../utils/domainUtils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  ArrowUpRight,
  AlertCircle,
  Menu,
  Bell,
  AlertTriangle,
  AlertOctagon,
  X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';

import { donationAPI, settingsAPI } from '../../api/client';
import { assignSequentialDonationIds } from './DonationHistory';
import { useTenantTerms } from '../../hooks/useTenantTerms';

const normalizeDonation = (d: any) => {
  const rawDate = d.createdAt ?? d.created_at ?? d.date;
  let validCreatedAt = new Date().toISOString();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      validCreatedAt = parsed.toISOString();
    }
  }

  const rawName = d.donorName ?? d.donor_name ?? d.name;
  const nameStr = rawName ? String(rawName).trim() : '';
  const isAnon = !nameStr || nameStr === '무기명' || nameStr.includes('무명') || nameStr.includes('익명');
  const donorName = isAnon ? '무기명' : nameStr;

  const rawMethod = d.paymentMethod ?? d.payment_method ?? d.method;
  const paymentMethod = rawMethod ? (String(rawMethod).includes('카드') ? '신용카드' : String(rawMethod)) : '신용카드';

  const rawStatus = d.paymentStatus ?? d.payment_status ?? d.status;
  let paymentStatus = (rawStatus && String(rawStatus).trim().length > 0) ? String(rawStatus).trim() : 'completed';

  if (paymentStatus === 'pending') {
    const isInstantPayment = paymentMethod === '신용카드' || paymentMethod === '카카오페이' || paymentMethod === '네이버페이' || paymentMethod.includes('카드');
    if (isInstantPayment) {
      const createdTime = new Date(validCreatedAt).getTime();
      const nowTime = Date.now();
      const elapsedMinutes = (nowTime - createdTime) / (1000 * 60);
      if (elapsedMinutes > 30) {
        paymentStatus = 'failed';
      }
    }
  }

  return {
    ...d,
    createdAt: validCreatedAt,
    donorName,
    paymentMethod,
    paymentStatus,
    amount: Number(d.amount) || 0,
  };
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold">결제완료</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold">결제대기</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 font-semibold">결제실패</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 font-semibold">결제취소</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function AdminDashboard() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin, isTenantsLoaded } = useApp();

  const decodedSlug = tenantSlug ? decodeURIComponent(tenantSlug).trim().toLowerCase() : '';
  const reservedSlugs = ['partner', 'system', 'admin', 'agency', 'agent', 'onboarding'];
  const isReserved = reservedSlugs.includes(decodedSlug);

  // 1. 현재 URL의 tenantSlug와 일치하는 테넌트를 tenants 목록에서 우선 동기 탐색
  const matchedTenant = decodedSlug
    ? tenants.find(
        (t) =>
          (t.slug && t.slug.toLowerCase() === decodedSlug) ||
          (t.id && t.id.toLowerCase() === decodedSlug) ||
          (t.name && t.name.toLowerCase() === decodedSlug) ||
          (t.slug && decodeURIComponent(t.slug).toLowerCase() === decodedSlug)
      )
    : currentTenant;

  // 2. 일치하는 테넌트가 있다면 그것을 effectiveTenant로 확정, 없으면 currentTenant가 해당 슬러그와 일치할 때만 허용
  const effectiveTenant = matchedTenant || (
    currentTenant &&
    ((currentTenant.slug && currentTenant.slug.toLowerCase() === decodedSlug) ||
     (currentTenant.id && currentTenant.id.toLowerCase() === decodedSlug) ||
     (!tenantSlug))
      ? currentTenant
      : null
  );

  const terms = useTenantTerms(effectiveTenant);

  const [dbDonations, setDbDonations] = useState<any[]>([]);
  const [donationViewMode, setDonationViewMode] = useState<'today' | 'recent'>('today');
  const [totalMonthlyAmount, setTotalMonthlyAmount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalAllTimeAmount, setTotalAllTimeAmount] = useState<number>(0);
  const [totalAllTimeCount, setTotalAllTimeCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [pendingPrayerCount, setPendingPrayerCount] = useState<number>(0);

  // 현재 시스템 시계 기준 최근 3개월 동적 라벨 및 YYYY-MM 키 생성
  const now = new Date();
  const d3 = new Date(now.getFullYear(), now.getMonth(), 1);
  const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const d1 = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const ymKey3 = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}`;
  const ymKey2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`;
  const ymKey1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}`;

  const mLabel3 = `${d3.getMonth() + 1}월(당월)`;
  const mLabel2 = `${d2.getMonth() + 1}월`;
  const mLabel1 = `${d1.getMonth() + 1}월`;

  const [chartData, setChartData] = useState<{ month: string; amount: number }[]>([
    { month: mLabel1, amount: 0 },
    { month: mLabel2, amount: 0 },
    { month: mLabel3, amount: 0 },
  ]);
  const [cumulativeChartData, setCumulativeChartData] = useState<{ month: string; cumulativeAmount: number }[]>([
    { month: mLabel1, cumulativeAmount: 0 },
    { month: mLabel2, cumulativeAmount: 0 },
    { month: mLabel3, cumulativeAmount: 0 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [broadcastNotice, setBroadcastNotice] = useState<any>(null);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState<boolean>(false);

  // 전체 사찰/교회 실시간 브로드캐스트 공지 조회
  useEffect(() => {
    let isMounted = true;
    async function fetchBroadcastNotice() {
      try {
        const res = await settingsAPI.get('global_broadcast_notice');
        if (res.success && res.data) {
          const raw = res.data;
          const notice = (raw.value && typeof raw.value === 'object') ? raw.value : raw;
          if (isMounted && notice && notice.isActive) {
            setBroadcastNotice(notice);
            const dismissedKey = `soulpay_dismissed_notice_${notice.id}`;
            if (sessionStorage.getItem(dismissedKey)) {
              setIsNoticeDismissed(true);
            }
          } else if (isMounted) {
            setBroadcastNotice(null);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch broadcast notice:', err);
      }
    }
    fetchBroadcastNotice();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    // DB 테넌트 목록 조회가 완료될 때까지 비동기 평가 유예
    if (!isTenantsLoaded) return;

    // 예약어 경로(partner, system, agency 등) 예외 방어
    if (isReserved) {
      setIsLoading(false);
      return;
    }

    if (effectiveTenant) {
      if (effectiveTenant.id !== currentTenant?.id) {
        setCurrentTenant(effectiveTenant);
      }

      // Supabase DB 비동기 수납 실데이터 조율
      donationAPI.getByTenant(effectiveTenant.id).then((res) => {
        if (res.success && res.data) {
          const list = assignSequentialDonationIds(res.data);
          setDbDonations(list);

          // 1. 정상 결제완료(completed) 건만 수납 총액 및 건수 집계에 포함
          const completedDonations = list.filter((d) => d.paymentStatus === 'completed');
          const allTimeSum = completedDonations.reduce((acc, d) => acc + (d.amount || 0), 0);
          setTotalAllTimeAmount(allTimeSum);
          setTotalAllTimeCount(completedDonations.length);

          // 2. 신도 수 & 기도문 미인쇄 건수 실제 DB 계산
          const prayers = list.filter(d => d.prayerText && d.prayerText.trim().length > 0);
          setPendingPrayerCount(prayers.length);

          const uniqueDonors = new Set(
            list.filter(d => d.donorPhone).map(d => normalizePhoneNumber(d.donorPhone))
          );
          setMemberCount(uniqueDonors.size);

          // 3. 최근 3개월 YYYY-MM 키 기반 정밀 수납액 집계 (completed 기준)
          const monthlySums: Record<string, number> = {
            [ymKey1]: 0,
            [ymKey2]: 0,
            [ymKey3]: 0,
          };
          const monthlyCounts: Record<string, number> = {
            [ymKey1]: 0,
            [ymKey2]: 0,
            [ymKey3]: 0,
          };

          completedDonations.forEach(item => {
            if (item.createdAt) {
              const itemDate = new Date(item.createdAt);
              if (!isNaN(itemDate.getTime())) {
                const kst = new Date(itemDate.getTime() + 9 * 60 * 60 * 1000);
                const itemYm = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
                if (monthlySums[itemYm] !== undefined) {
                  monthlySums[itemYm] += item.amount || 0;
                  monthlyCounts[itemYm] = (monthlyCounts[itemYm] || 0) + 1;
                }
              }
            }
          });

          const amt1 = monthlySums[ymKey1];
          const amt2 = monthlySums[ymKey2];
          const amt3 = monthlySums[ymKey3];

          // 당월(이번 달) 수납액 및 건수 설정
          setTotalMonthlyAmount(amt3);
          setTotalCount(monthlyCounts[ymKey3] || 0);

          setChartData([
            { month: mLabel1, amount: amt1 },
            { month: mLabel2, amount: amt2 },
            { month: mLabel3, amount: amt3 },
          ]);

          // 4. 누적 수납액 계산 (Cumulative Summation)
          const cum1 = amt1;
          const cum2 = cum1 + amt2;
          const cum3 = cum2 + amt3;

          setCumulativeChartData([
            { month: mLabel1, cumulativeAmount: cum1 },
            { month: mLabel2, cumulativeAmount: cum2 },
            { month: mLabel3, cumulativeAmount: cum3 },
          ]);
        }
      }).catch((err) => {
        console.warn('DB load notice in AdminDashboard:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [tenantSlug, isTenantsLoaded, effectiveTenant?.id]);

  // 1. 단체 목록 로딩 중 상태 (전체 DB 테넌트 목록 조회가 끝날 때까지 스피너 유지)
  if (!isTenantsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  const isDedicated = isAdminPortalDomain();
  const defaultLoginTarget = tenantSlug
    ? (isDedicated ? `/${tenantSlug}/login` : `/${tenantSlug}/admin/login`)
    : (isDedicated ? '/login' : '/admin/login');

  // 2. 가맹 단체를 찾을 수 없는 경우: 전체 단체 목록 조회가 완료(isTenantsLoaded)되었음에도 해당 단체가 없을 때만 명확한 에러 카드 표출
  const isInvalidTenant = Boolean(
    isTenantsLoaded &&
    tenantSlug &&
    (isReserved || !effectiveTenant)
  );

  if (isInvalidTenant || !effectiveTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-sm rounded-2xl bg-white p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600 mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">가맹 단체를 찾을 수 없습니다</h2>
            <p className="text-xs text-slate-500">
              요청하신 경로('{tenantSlug}')에 해당하는 가맹 단체 정보가 존재하지 않습니다.
            </p>
          </div>
          <Button
            onClick={() => navigate(defaultLoginTarget)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-10 cursor-pointer"
          >
            단체 관리자 로그인으로 이동
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentAdmin) {
    return <Navigate to={defaultLoginTarget} replace />;
  }

  // 타 단체 관리자 권한으로 다른 단체 대시보드 접근 차단 (system_admin 제외)
  if (
    currentAdmin.role !== 'system_admin' &&
    effectiveTenant &&
    currentAdmin.tenantId !== effectiveTenant.id &&
    currentAdmin.tenantId !== effectiveTenant.slug
  ) {
    return <Navigate to={defaultLoginTarget} replace />;
  }

  const currentPath = `/${tenantSlug}/admin`;

  const todayKstStr = (() => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
  })();

  const todayDonations = dbDonations.filter((d) => {
    if (!d.createdAt) return false;
    const dDate = new Date(d.createdAt);
    if (isNaN(dDate.getTime())) return false;
    const kst = new Date(dDate.getTime() + 9 * 60 * 60 * 1000);
    const dStr = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
    return dStr === todayKstStr;
  });

  const displayedDonations = donationViewMode === 'today' ? todayDonations : dbDonations.slice(0, 10);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">관리자 메뉴 네비게이션</SheetTitle>
            <SheetDescription className="sr-only">관리자 페이지 사이드바 메뉴</SheetDescription>
            <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                대시보드
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                {effectiveTenant.name}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate(`/${tenantSlug}`)}>
              {terms.donor} 페이지 보기
            </Button>
          </div>

          {/* 전체 사찰/교회 실시간 브로드캐스트 공지 배너 */}
          {broadcastNotice && broadcastNotice.isActive && !isNoticeDismissed && (
            <div
              className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-sm relative overflow-hidden ${
                broadcastNotice.noticeType === 'urgent'
                  ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/20'
                  : broadcastNotice.noticeType === 'warning'
                  ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/20'
                  : 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    broadcastNotice.noticeType === 'urgent'
                      ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600'
                      : broadcastNotice.noticeType === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600'
                      : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600'
                  }`}>
                    {broadcastNotice.noticeType === 'urgent' ? (
                      <AlertOctagon className="w-5 h-5 animate-pulse" />
                    ) : broadcastNotice.noticeType === 'warning' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        broadcastNotice.noticeType === 'urgent'
                          ? 'bg-rose-200/80 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                          : broadcastNotice.noticeType === 'warning'
                          ? 'bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-blue-200/80 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {broadcastNotice.noticeType === 'urgent' ? '🚨 긴급 점검' : broadcastNotice.noticeType === 'warning' ? '⚠️ PG/서식 업데이트' : '📢 전체 공지'}
                      </span>
                      {broadcastNotice.isMaintenanceMode && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                          결제 일시 점검 가드 활성화
                        </span>
                      )}
                      <h3 className="text-sm sm:text-base font-bold tracking-tight">
                        {broadcastNotice.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed opacity-90">
                      {broadcastNotice.content}
                    </p>
                    <div className="text-[11px] opacity-60 pt-0.5">
                      게재 시각: {broadcastNotice.createdAt ? new Date(broadcastNotice.createdAt).toLocaleString('ko-KR') : '방금 전'} • {broadcastNotice.createdBy || '시스템 관리자'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsNoticeDismissed(true);
                    if (broadcastNotice.id) {
                      sessionStorage.setItem(`soulpay_dismissed_notice_${broadcastNotice.id}`, 'true');
                    }
                  }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                  title="공지 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                이번 달 총 {terms.donation}액
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: effectiveTenant.primaryColor }}>
                {totalMonthlyAmount.toLocaleString()}원
              </div>
              <p className="text-xs text-slate-400">
                당월 <span className="text-blue-600 dark:text-blue-400 font-semibold">{totalCount}건</span> 결제 완료
                {totalAllTimeAmount > totalMonthlyAmount && (
                  <span className="text-slate-400 block sm:inline sm:ml-1.5 font-normal">
                    (전체 누적 {totalAllTimeAmount.toLocaleString()}원 / {totalAllTimeCount}건)
                  </span>
                )}
              </p>
            </Card>

            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                  신규 {terms.donor}
                </span>
                <Link
                  to={`/${tenantSlug}/admin/members`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  회원 관리
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {memberCount}명
              </div>
              <p className="text-xs text-slate-400">등록된 전체 회원 실시간 동기화</p>
            </Card>

            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                  대기중인 {terms.prayer}
                </span>
                <Link
                  to={`/${tenantSlug}/admin/prayers`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  기도문 관리
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {pendingPrayerCount}건
              </div>
              <p className="text-xs text-slate-400">라벨 미인쇄 대기 건수</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  월별 {terms.donation}액 추이
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  DB 수납 데이터 실시간 반영
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                    <Bar dataKey="amount" fill={effectiveTenant.primaryColor} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  월별 {terms.donation}액 추이 (꺾은선)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  월별 수납 금액 변동 추이 (결제완료 기준)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={effectiveTenant.primaryColor}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Donations */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  실시간 {terms.donation} 내역
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {donationViewMode === 'today'
                    ? `오늘(${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}) 접수된 ${terms.donation} 내역 (${todayDonations.length}건)`
                    : `최근 접수된 실시간 ${terms.donation} 내역 (최신 ${Math.min(dbDonations.length, 10)}건)`}
                </CardDescription>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-zinc-800 p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDonationViewMode('today')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    donationViewMode === 'today'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  오늘 접수 ({todayDonations.length}건)
                </button>
                <button
                  type="button"
                  onClick={() => setDonationViewMode('recent')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    donationViewMode === 'recent'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  전체 최근 10건
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>접수번호</TableHead>
                    <TableHead>{terms.donor}명</TableHead>
                    <TableHead>{terms.donation} 항목</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>시간</TableHead>
                    <TableHead>결제상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedDonations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {donationViewMode === 'today' ? (
                          <div className="space-y-2">
                            <p>오늘 접수된 {terms.donation} 내역이 없습니다.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDonationViewMode('recent')}
                              className="text-xs h-8"
                            >
                              전체 최근 내역 보기
                            </Button>
                          </div>
                        ) : (
                          `접수된 ${terms.donation} 내역이 없습니다.`
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedDonations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="font-mono text-xs">{donation.id}</TableCell>
                        <TableCell className="font-medium">{donation.donorName}</TableCell>
                        <TableCell>{donation.itemName}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          donation.paymentStatus === 'cancelled'
                            ? 'text-slate-400 line-through'
                            : donation.paymentStatus === 'failed'
                            ? 'text-rose-500 line-through'
                            : 'text-emerald-600'
                        }`}>
                          {donation.amount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {donation.createdAt ? new Date(donation.createdAt).toLocaleString('ko-KR') : '방금 전'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(donation.paymentStatus)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}