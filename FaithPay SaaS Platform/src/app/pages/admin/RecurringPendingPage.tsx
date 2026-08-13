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
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  SkipForward,
  PauseCircle,
  PlayCircle,
  XCircle,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { donationAPI } from '../../api/client';
import { assignSequentialDonationIds } from './DonationHistory';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { toast } from 'sonner';

// 약정 마스터 인터페이스
interface SubscriptionMaster {
  id: string;
  donorName: string;
  donorPhone: string;
  itemName: string;
  amount: number;
  recurringDay: number;
  paymentMethod: string;
  status: 'active' | 'paused' | 'cancelled';
  startDate: string;
  nextBillingDate: string;
}

export default function RecurringPendingPage() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [activeTab, setActiveTab] = useState<'master' | 'schedule'>('master');
  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 약정 상태 로컬 관리 (일시중지, 재개, 해지)
  const [masterStatuses, setMasterStatuses] = useState<Record<string, 'active' | 'paused' | 'cancelled'>>({
    'SUB-2026-0001': 'active',
    'SUB-2026-0002': 'active',
    'SUB-2026-0003': 'paused',
  });

  // 스케줄러 실행 항목 상태 로컬 관리 (대기, 실행완료, 건너뜀)
  const [scheduleStatuses, setScheduleStatuses] = useState<Record<string, 'pending' | 'executed' | 'skipped'>>({});

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      fetchDonations(tenant.id);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  const fetchDonations = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await donationAPI.getByTenant(tenantId);
      if (res.success && res.data) {
        setDonations(assignSequentialDonationIds(res.data));
      } else {
        setDonations([]);
      }
    } catch (e) {
      console.error(e);
      setDonations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. 📌 Tab 1: 정기결제 약정 마스터 목록 생성
  const subscriptionMasters = useMemo<SubscriptionMaster[]>(() => {
    const map: Record<string, SubscriptionMaster> = {};

    donations.forEach((d, idx) => {
      const isRecurring = d.isRecurring || d.is_recurring;
      if (isRecurring) {
        const phone = d.donorPhone || d.donor_phone || `010-1234-${1000 + idx}`;
        const key = `${d.donorName || '무기명'}_${phone}_${d.itemName || '기본'}`;

        if (!map[key]) {
          const subId = `SUB-2026-${String(Object.keys(map).length + 1).padStart(4, '0')}`;
          const date = new Date(d.createdAt || d.created_at || Date.now());
          const recurringDay = date.getDate() || 15;
          const status = masterStatuses[subId] || 'active';

          map[key] = {
            id: subId,
            donorName: d.donorName || '무기명',
            donorPhone: phone,
            itemName: d.itemName || '일반후원',
            amount: Number(d.amount) || 50000,
            recurringDay,
            paymentMethod: d.paymentMethod || '신용카드 빌링',
            status,
            startDate: date.toISOString().slice(0, 10),
            nextBillingDate: `2026-09-${String(recurringDay).padStart(2, '0')}`,
          };
        }
      }
    });

    // 기본 시뮬레이션 샘플 추가
    if (Object.keys(map).length === 0) {
      return [
        {
          id: 'SUB-2026-0001',
          donorName: '김철수',
          donorPhone: '010-2345-6789',
          itemName: '일반후원금',
          amount: 50000,
          recurringDay: 15,
          paymentMethod: '신용카드 빌링',
          status: masterStatuses['SUB-2026-0001'] || 'active',
          startDate: '2026-01-15',
          nextBillingDate: '2026-08-15',
        },
        {
          id: 'SUB-2026-0002',
          donorName: '이영희',
          donorPhone: '010-3456-7890',
          itemName: '장학후원기금',
          amount: 100000,
          recurringDay: 25,
          paymentMethod: '카카오페이 빌링',
          status: masterStatuses['SUB-2026-0002'] || 'active',
          startDate: '2026-03-25',
          nextBillingDate: '2026-08-25',
        },
        {
          id: 'SUB-2026-0003',
          donorName: '박민수',
          donorPhone: '010-4567-8901',
          itemName: '건축후원금',
          amount: 30000,
          recurringDay: 5,
          paymentMethod: 'CMS 계좌이체',
          status: masterStatuses['SUB-2026-0003'] || 'paused',
          startDate: '2026-02-05',
          nextBillingDate: '2026-09-05',
        },
      ];
    }

    return Object.values(map);
  }, [donations, masterStatuses]);

  // 2. ⚡ Tab 2: 스케줄러 결제 실행 대기열 생성
  const scheduledExecutions = useMemo(() => {
    return subscriptionMasters.map((sub, idx) => {
      const schId = `SCH-202608${String(sub.recurringDay).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`;
      const status = scheduleStatuses[schId] || (sub.status === 'paused' ? 'skipped' : 'pending');

      return {
        id: schId,
        masterId: sub.id,
        scheduledDate: `${sub.nextBillingDate} 09:00:00 (KST)`,
        donorName: sub.donorName,
        donorPhone: sub.donorPhone,
        itemName: sub.itemName,
        amount: sub.amount,
        paymentMethod: sub.paymentMethod,
        attemptCount: 1,
        status, // 'pending' | 'executed' | 'skipped'
      };
    });
  }, [subscriptionMasters, scheduleStatuses]);

  // 검색 필터링
  const filteredMasters = useMemo(() => {
    return subscriptionMasters.filter((m) => {
      if (!searchTerm) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        m.donorName.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term) ||
        m.itemName.toLowerCase().includes(term) ||
        m.donorPhone.toLowerCase().includes(term)
      );
    });
  }, [subscriptionMasters, searchTerm]);

  const filteredSchedules = useMemo(() => {
    return scheduledExecutions.filter((s) => {
      if (!searchTerm) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        s.donorName.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.itemName.toLowerCase().includes(term) ||
        s.masterId.toLowerCase().includes(term)
      );
    });
  }, [scheduledExecutions, searchTerm]);

  const activeMasterCount = useMemo(() => {
    return subscriptionMasters.filter((m) => m.status === 'active').length;
  }, [subscriptionMasters]);

  const totalMonthlyCommitment = useMemo(() => {
    return subscriptionMasters
      .filter((m) => m.status === 'active')
      .reduce((sum, m) => sum + m.amount, 0);
  }, [subscriptionMasters]);

  // 약정 상태 조작
  const handleToggleMasterStatus = (subId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    setMasterStatuses((prev) => ({ ...prev, [subId]: newStatus }));
    const labelMap = { active: '정상 재개', paused: '일시 중지', cancelled: '약정 해지' };
    toast.success(`[${subId}] 약정이 ${labelMap[newStatus]} 처리되었습니다.`);
  };

  // 스케줄러 수동 수기 실행
  const handleExecuteNow = (schId: string, donorName: string) => {
    setScheduleStatuses((prev) => ({ ...prev, [schId]: 'executed' }));
    toast.success(`⚡ [${donorName}] 님의 청구건이 지금 즉시 강제 결제 승인 처리되었습니다.`);
  };

  // 스케줄러 이번 회차 건너뛰기
  const handleSkipExecution = (schId: string, donorName: string) => {
    setScheduleStatuses((prev) => ({ ...prev, [schId]: 'skipped' }));
    toast.info(`⏭️ [${donorName}] 님의 이번 회차 청구가 건너뛰기(스킵) 처리되었습니다.`);
  };

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
      <div className="hidden lg:block w-64 flex-shrink-0">
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
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100">
                  {terms.recurringPending} 관리 센터
                </h1>
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-xs">
                  2단계 분리 아키텍처
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-sm">
                후원자별 정기 약정 계약(마스터)과 자동 이체 스케줄러 실행 대기열을 명확히 구분하여 관리합니다
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => fetchDonations(currentTenant.id)}
              disabled={isLoading}
              className="gap-2 cursor-pointer shadow-xs self-start md:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  활성 정기 약정 수 (Master)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {activeMasterCount}건
                </div>
                <p className="text-xs text-slate-400 mt-1">전체 {subscriptionMasters.length}건 중 이체 진행 중</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  월 약정 예상 수납 총액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {totalMonthlyCommitment.toLocaleString()}원
                </div>
                <p className="text-xs text-slate-400 mt-1">매월 자동 이체 수납되는 총약정액</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  이번 달 실행 대기 스케줄
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {scheduledExecutions.filter((s) => s.status === 'pending').length}건
                </div>
                <p className="text-xs text-slate-400 mt-1">자정 자동 배치 실행 대기 건수</p>
              </CardContent>
            </Card>
          </div>

          {/* Sub-Tab Navigation Bar */}
          <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-3">
            <button
              onClick={() => {
                setActiveTab('master');
                setCurrentPage(1);
              }}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'master'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <FileCheck className="h-4 w-4" />
              <span>📌 1. 정기결제 약정 목록 (Subscription Master)</span>
              <Badge variant="secondary" className="text-xs font-semibold">
                {filteredMasters.length}건
              </Badge>
            </button>

            <button
              onClick={() => {
                setActiveTab('schedule');
                setCurrentPage(1);
              }}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'schedule'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>⚡ 2. 스케줄러 실 결제 실행 대기열 (Batch Execution Queue)</span>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold">
                {filteredSchedules.length}건
              </Badge>
            </button>
          </div>

          {/* TAB 1: 정기결제 약정 마스터 목록 */}
          {activeTab === 'master' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">
                    정기 약정 마스터 계약 명세 ({filteredMasters.length}건)
                  </CardTitle>
                  <CardDescription>
                    후원자별 지속 정기 결제 계약 정보입니다. 이체일 변경, 일시중지, 해지 관리를 수행합니다.
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

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>약정 번호</TableHead>
                      <TableHead>약정자 성명</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>후원 항목</TableHead>
                      <TableHead className="text-right">약정 금액</TableHead>
                      <TableHead>정기 이체일</TableHead>
                      <TableHead>결제 수단</TableHead>
                      <TableHead>약정 상태</TableHead>
                      <TableHead className="text-center">약정 관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMasters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-slate-400 space-y-2">
                          <Calendar className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                          <p className="font-semibold text-sm">등록된 정기 약정 계약 정보가 없습니다.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMasters.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200">
                            {sub.id}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                            {sub.donorName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {sub.donorPhone}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700 dark:text-zinc-300">
                            {sub.itemName}
                          </TableCell>
                          <TableCell className="text-right font-black text-indigo-600 dark:text-indigo-400">
                            {sub.amount.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-xs font-bold text-amber-700 dark:text-amber-400">
                            매월 {sub.recurringDay}일
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-zinc-400">
                            {sub.paymentMethod}
                          </TableCell>
                          <TableCell>
                            {sub.status === 'active' && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px]">
                                🟢 이체 진행중
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
                              {sub.status === 'active' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleMasterStatus(sub.id, 'paused')}
                                  className="h-7 px-2 text-[11px] font-bold gap-1 text-amber-700 hover:bg-amber-50 cursor-pointer"
                                >
                                  <PauseCircle className="h-3.5 w-3.5" />
                                  일시중지
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleMasterStatus(sub.id, 'active')}
                                  className="h-7 px-2 text-[11px] font-bold gap-1 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                >
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  이체재개
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleMasterStatus(sub.id, 'cancelled')}
                                className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                해지
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: 스케줄러 실 결제 실행 대기열 */}
          {activeTab === 'schedule' && (
            <Card className="border-amber-200 dark:border-amber-900/40">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-amber-950 dark:text-amber-200">
                    스케줄러 결제 자동 이체 대기열 ({filteredSchedules.length}건)
                  </CardTitle>
                  <CardDescription>
                    자정 배치 스케줄러가 결제 승인을 시도할 1회차 실 이체 대기 목록입니다
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="약정자 성명, 스케줄ID 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 text-xs"
                  />
                </div>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>스케줄 ID</TableHead>
                      <TableHead>실행 예정 일시</TableHead>
                      <TableHead>약정자 성명</TableHead>
                      <TableHead>후원 항목</TableHead>
                      <TableHead className="text-right">청구 금액</TableHead>
                      <TableHead>시도 회차</TableHead>
                      <TableHead>스케줄 상태</TableHead>
                      <TableHead className="text-center">수동 관리 조작</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-slate-400 space-y-2">
                          <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                          <p className="font-semibold text-sm">실행 예정 대기열이 비어 있습니다.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchedules.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((sch) => (
                        <TableRow key={sch.id}>
                          <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                            {sch.id}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {sch.scheduledDate}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                            {sch.donorName}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-zinc-300">
                            {sch.itemName}
                          </TableCell>
                          <TableCell className="text-right font-black text-amber-600 dark:text-amber-400">
                            {sch.amount.toLocaleString()}원
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {sch.attemptCount}차 시도
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sch.status === 'pending' && (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[11px]">
                                ⏳ 자정 이체 대기중
                              </Badge>
                            )}
                            {sch.status === 'executed' && (
                              <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                                ⚡ 강제 승인 완료
                              </Badge>
                            )}
                            {sch.status === 'skipped' && (
                              <Badge className="bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 font-semibold text-[11px]">
                                ⏭️ 이번 회차 스킵
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {sch.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleExecuteNow(sch.id, sch.donorName)}
                                    className="h-7 px-2 text-[11px] font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                                  >
                                    <Zap className="h-3.5 w-3.5" />
                                    지금 강제 결제
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSkipExecution(sch.id, sch.donorName)}
                                    className="h-7 px-2 text-[11px] font-medium gap-1 cursor-pointer"
                                  >
                                    <SkipForward className="h-3.5 w-3.5" />
                                    이번달 건너뛰기
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">조작 완료됨</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
