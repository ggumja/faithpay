import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  XCircle,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { subscriptionAPI } from '../../api/client';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { toast } from 'sonner';

// 실제 DB 약정 인터페이스
export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  itemId: string;
  itemName: string;
  amount: number;
  billKey?: string;
  cardNo?: string;
  cardName?: string;
  recurringDay?: number;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
  recurringDayOfWeek?: number;
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate?: string;
  pausedUntil?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function RecurringPendingPage() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant } = useApp();
  const terms = useTenantTerms(currentTenant);

  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!tenants || tenants.length === 0) return;
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      fetchSubscriptions(tenant.id);
    } else {
      setIsLoading(false);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  const fetchSubscriptions = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await subscriptionAPI.getByTenant(tenantId);
      if (res.success && res.data) {
        setSubscriptions(res.data);
      } else {
        setSubscriptions([]);
      }
    } catch (e) {
      console.error('Failed to fetch subscriptions:', e);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 주기 텍스트 포맷 헬퍼
  const formatInterval = (sub: SubscriptionRecord) => {
    const interval = sub.recurringInterval || 'monthly';
    if (interval === 'daily') return '매일 결제';
    if (interval === 'weekly') {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dow = Number(sub.recurringDayOfWeek ?? 0);
      return `매주 (${dayNames[dow] || '일'})요일`;
    }
    return `매월 ${sub.recurringDay || 10}일`;
  };

  // 검색 필터링
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s) => {
      if (!searchTerm) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        (s.donorName || '').toLowerCase().includes(term) ||
        (s.id || '').toLowerCase().includes(term) ||
        (s.itemName || '').toLowerCase().includes(term) ||
        (s.donorPhone || '').toLowerCase().includes(term)
      );
    });
  }, [subscriptions, searchTerm]);

  // KPI 통계 산출 (100% 실측 DB 기반)
  const activeCount = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'active').length;
  }, [subscriptions]);

  const pausedCount = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'paused').length;
  }, [subscriptions]);

  const cancelledCount = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'cancelled').length;
  }, [subscriptions]);

  const { totalMonthlyCommitment, totalPerRunAmount } = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const perRun = activeSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const monthly = activeSubs.reduce((sum, s) => {
      const amt = Number(s.amount) || 0;
      const interval = s.recurringInterval || 'monthly';
      if (interval === 'weekly') return sum + amt * 4;
      if (interval === 'daily') return sum + amt * 30;
      return sum + amt;
    }, 0);
    return { totalMonthlyCommitment: monthly, totalPerRunAmount: perRun };
  }, [subscriptions]);

  // 실제 약정 상태 DB 업데이트 (일시중지, 재개, 해지)
  const handleToggleStatus = async (subId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    const labelMap = { active: '정상 재개', paused: '일시 중지', cancelled: '약정 해지' };
    if (!window.confirm(`선택한 정기 약정을 정말 ${labelMap[newStatus]} 처리하시겠습니까?`)) return;

    try {
      const res = await subscriptionAPI.updateStatus(subId, newStatus);
      if (res.success) {
        toast.success(`약정이 ${labelMap[newStatus]} 처리되었습니다.`);
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === subId ? { ...s, status: newStatus } : s))
        );
      } else {
        toast.error(`처리 실패: ${res.error || '상태 변경에 실패했습니다.'}`);
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / pageSize));
  const currentPath = location.pathname;

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">{terms.recurringPending} 관리</h1>
        </div>

        {/* Content Body */}
        <div className="p-6 lg:p-8 space-y-6 w-full">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  {terms.recurringPending} 관리 센터
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs">
                  실시간 DB 실측 연동
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                {terms.donor}별 정기 결제 약정 마스터 계약 현황 및 차회 결제 예정일을 통합 관리합니다
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => fetchSubscriptions(currentTenant.id)}
              disabled={isLoading}
              className="gap-2 cursor-pointer shadow-xs self-start md:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-emerald-500 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  활성 정기 약정 수 (Active)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {activeCount}건
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  전체 {subscriptions.length}건 중 결제 진행 중 (해지 {cancelledCount}건)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  월 약정 예상 수납 총액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {totalMonthlyCommitment.toLocaleString()}원
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  월 환산 예상액 (회차별 합계: {totalPerRunAmount.toLocaleString()}원)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  일시중지 / 해지 약정 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {pausedCount + cancelledCount}건
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  일시중지 {pausedCount}건 · 해지 완료 {cancelledCount}건
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 정기결제 약정 마스터 목록 */}
          <Card className="shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  정기 약정 마스터 계약 명세 ({filteredSubs.length}건)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {terms.donor}별 정기 결제 계약 정보입니다. 결제 주기, 다음 결제 예정일, 일시중지 및 해지 상태를 실시간 관리합니다.
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="약정자 성명, 약정ID, 연락처 검색..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 dark:bg-zinc-900/50">
                    <TableHead className="w-[140px]">약정 번호</TableHead>
                    <TableHead>약정자 성명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>{terms.donation} 항목</TableHead>
                    <TableHead className="text-right">약정 금액</TableHead>
                    <TableHead>결제 주기</TableHead>
                    <TableHead>다음(첫) 결제 예정일</TableHead>
                    <TableHead>결제 카드</TableHead>
                    <TableHead>약정 상태</TableHead>
                    <TableHead className="text-center">약정 관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                          <p className="text-sm font-medium">정기 약정 데이터를 실시간 조회 중입니다...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16 text-slate-400 space-y-2">
                        <Calendar className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                        <p className="font-semibold text-sm">
                          {!currentTenant
                            ? `'${tenantSlug}' 단체 정보를 찾을 수 없습니다. 올바른 단체 주소(예: /dream/admin/recurring-pending)로 접속해 주세요.`
                            : '등록된 정기 약정 계약 정보가 없습니다.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubs.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40">
                        <TableCell className="font-mono text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                          {sub.id}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                          {sub.donorName || '무기명'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {sub.donorPhone || '-'}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-zinc-300">
                          {sub.itemName || '정기 헌금'}
                        </TableCell>
                        <TableCell className="text-right font-black text-blue-600 dark:text-blue-400">
                          {Number(sub.amount || 0).toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {formatInterval(sub)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {sub.nextPaymentDate || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-zinc-400">
                          {sub.cardName || '신용카드'}{sub.cardNo ? ` (${sub.cardNo})` : ''}
                        </TableCell>
                        <TableCell>
                          {sub.status === 'active' && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px]">
                              🟢 결제 진행중
                            </Badge>
                          )}
                          {sub.status === 'paused' && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[11px]">
                              🟡 일시 중지
                            </Badge>
                          )}
                          {sub.status === 'cancelled' && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px]">
                              🔴 약정 해지
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {sub.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(sub.id, 'paused')}
                                  className="h-7 px-2 text-[11px] font-bold gap-1 text-amber-700 hover:bg-amber-50 cursor-pointer"
                                >
                                  <PauseCircle className="h-3.5 w-3.5" />
                                  일시중지
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(sub.id, 'cancelled')}
                                  className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  해지
                                </Button>
                              </>
                            )}
                            {sub.status === 'paused' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(sub.id, 'active')}
                                  className="h-7 px-2 text-[11px] font-bold gap-1 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                >
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  결제재개
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(sub.id, 'cancelled')}
                                  className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  해지
                                </Button>
                              </>
                            )}
                            {sub.status === 'cancelled' && (
                              <span className="text-xs text-slate-400 font-medium">해지 완료</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 페이지네이션 (건수가 10건 초과일 때 노출) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 text-xs text-slate-500">
                  <div>
                    전체 {filteredSubs.length}건 중 {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, filteredSubs.length)}건 표시
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 font-bold text-slate-800 dark:text-zinc-200">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
