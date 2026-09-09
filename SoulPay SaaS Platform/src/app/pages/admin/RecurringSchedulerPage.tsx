import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { subscriptionAPI, donationAPI } from '../../api/client';
import {
  Clock, Play, RefreshCw, CheckCircle2, Calendar,
  CreditCard, Search
} from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionRecord {
  id: string;
  tenantId: string;
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  itemId: string;
  itemName: string;
  amount: number;
  userId?: string;
  billKey?: string;
  cardNo?: string;
  cardName?: string;
  recurringDay?: number;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
  recurringDayOfWeek?: number;
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate?: string;
  pausedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RecurringSchedulerPage() {
  const { tenants } = useApp();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [recurringDonations, setRecurringDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingBatch, setIsExecutingBatch] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'logs'>('queue');

  // 필터 & 검색
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 배치 실행 결과
  const [lastBatchResult, setLastBatchResult] = useState<any | null>(null);

  // 테넌트 맵 (UUID -> 테넌트 정보)
  const tenantMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const t of tenants) {
      map.set(t.id, t);
      map.set(t.slug, t);
    }
    return map;
  }, [tenants]);

  // 오늘 KST 날짜
  const todayKstStr = useMemo(() => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subsRes, donRes] = await Promise.all([
        subscriptionAPI.getAll(),
        donationAPI.getAll(),
      ]);

      if (subsRes.success && subsRes.data) {
        setSubscriptions(subsRes.data);
      } else {
        setSubscriptions([]);
      }

      if (donRes.success && donRes.data) {
        const recDons = (donRes.data as any[]).filter(d => d.isRecurring);
        setRecurringDonations(recDons);
      } else {
        setRecurringDonations([]);
      }
    } catch (e) {
      console.error('Failed to load scheduler data:', e);
      toast.error('스케줄러 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 배치 즉시 실행 핸들러
  const handleExecuteBatch = async () => {
    if (isExecutingBatch) return;
    const confirmed = window.confirm(
      `오늘(${todayKstStr}) 결제 예정인 모든 정기 약정 건에 대해 나노페이 빌키 결제를 즉시 승인하시겠습니까?\n(오늘 이미 승인 완료된 건은 2중 청구 방지 처리됩니다)`
    );
    if (!confirmed) return;

    setIsExecutingBatch(true);
    toast.info('정기결제 배치 스케줄러를 가동하고 있습니다...');

    try {
      const res = await subscriptionAPI.runBatch();
      if (res.success && res.data) {
        setLastBatchResult(res.data);
        const { processedCount, successCount, failedCount } = res.data;
        if (processedCount === 0) {
          toast.info('오늘 추가로 결제할 대상 정기결제가 없습니다 (모두 완료되었거나 오늘 청구 대상 아님).');
        } else {
          toast.success(`배치 완료! 총 ${processedCount}건 중 ${successCount}건 승인 성공, ${failedCount}건 실패`);
        }
        await loadData();
      } else {
        toast.error(res.error || '배치 실행에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('Batch execution error:', e);
      toast.error(`배치 실행 중 오류가 발생했습니다: ${e?.message || e}`);
    } finally {
      setIsExecutingBatch(false);
    }
  };

  // KPI 집계
  const stats = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    
    // 오늘 결제 대상 (active이면서 nextPaymentDate가 오늘 이하이거나 도래)
    const dueTodayCount = activeSubs.filter(s => {
      if (!s.nextPaymentDate) return false;
      const clean = s.nextPaymentDate.replace(/\./g, '-').slice(0, 10);
      return clean <= todayKstStr;
    }).length;

    // 오늘 승인된 정기결제 건수 및 금액
    const todayDonations = recurringDonations.filter(d => {
      if (d.paymentStatus !== 'completed' || !d.createdAt) return false;
      const dKstDate = new Date(new Date(d.createdAt).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return dKstDate === todayKstStr;
    });

    const todaySuccessCount = todayDonations.length;
    const todaySuccessAmount = todayDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    return {
      activeSubsCount: activeSubs.length,
      dueTodayCount,
      todaySuccessCount,
      todaySuccessAmount,
    };
  }, [subscriptions, recurringDonations, todayKstStr]);

  // 주기 포맷터
  const formatInterval = (sub: SubscriptionRecord) => {
    const interval = sub.recurringInterval || 'monthly';
    if (interval === 'daily') return '매일';
    if (interval === 'weekly') {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dow = Number(sub.recurringDayOfWeek ?? 0);
      return `매주 (${dayNames[dow] || '일'})요일`;
    }
    return `매월 ${sub.recurringDay || 10}일`;
  };

  // 필터링된 구독 큐 목록
  const filteredSubs = useMemo(() => {
    return subscriptions.filter(sub => {
      if (tenantFilter !== 'all' && sub.tenantId !== tenantFilter) return false;
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const donorMatch = (sub.donorName || '').toLowerCase().includes(q);
        const phoneMatch = (sub.donorPhone || '').includes(q);
        const itemMatch = (sub.itemName || '').toLowerCase().includes(q);
        const subIdMatch = (sub.id || '').toLowerCase().includes(q);
        return donorMatch || phoneMatch || itemMatch || subIdMatch;
      }
      return true;
    });
  }, [subscriptions, tenantFilter, statusFilter, searchTerm]);

  // 필터링된 기부 로그 목록
  const filteredDonations = useMemo(() => {
    return recurringDonations.filter(d => {
      if (tenantFilter !== 'all' && d.tenantId !== tenantFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const donorMatch = (d.donorName || '').toLowerCase().includes(q);
        const phoneMatch = (d.donorPhone || '').includes(q);
        const tranMatch = (d.transactionId || '').toLowerCase().includes(q);
        const apprMatch = (d.approveNo || '').toLowerCase().includes(q);
        return donorMatch || phoneMatch || tranMatch || apprMatch;
      }
      return true;
    });
  }, [recurringDonations, tenantFilter, searchTerm]);

  return (
    <div className="p-6 lg:p-8 space-y-6 w-full">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--hm-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Clock size={20} />
            </span>
            <h1 className="text-xl font-extrabold text-[var(--hm-ink)] tracking-tight">
              정기결제 스케줄러 관리
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              배치 모니터링
            </span>
          </div>
          <p className="text-xs text-[var(--hm-ink-3)]">
            전체 단체의 정기 약정 큐(일/주/월)와 나노페이 빌키 자동 승인 실행 내역을 실시간 모니터링하고 수동 배치 가동을 제어합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)] hover:bg-[var(--hm-paper-2)] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            새로고침
          </button>

          <button
            onClick={handleExecuteBatch}
            disabled={isExecutingBatch}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Play size={14} className={isExecutingBatch ? 'animate-spin' : 'fill-white'} />
            {isExecutingBatch ? '배치 실행 중...' : '오늘자 정기결제 일괄 실행 (Batch Run)'}
          </button>
        </div>
      </div>

      {/* ── 2. KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 오늘 결제 도래/대상 */}
        <div className="p-4 rounded-2xl bg-[var(--hm-paper)] border border-[var(--hm-border)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--hm-ink-3)] font-semibold">
            <span>오늘 결제 대상 큐</span>
            <Calendar size={15} className="text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[var(--hm-ink)]">
              {stats.dueTodayCount}
              <span className="text-sm font-semibold text-[var(--hm-ink-3)] ml-1">건</span>
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
              KST {todayKstStr}
            </span>
          </div>
          <p className="text-[11px] text-[var(--hm-ink-3)]">
            오늘 이전/당일 결제일이 도래한 정기 약정
          </p>
        </div>

        {/* Card 2: 오늘 승인 성공 건수 */}
        <div className="p-4 rounded-2xl bg-[var(--hm-paper)] border border-[var(--hm-border)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--hm-ink-3)] font-semibold">
            <span>오늘 승인 완료 건수</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">
              {stats.todaySuccessCount}
              <span className="text-sm font-semibold text-[var(--hm-ink-3)] ml-1">건</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              승인 완료
            </span>
          </div>
          <p className="text-[11px] text-[var(--hm-ink-3)]">
            오늘자 나노페이 정상 승인 완료 건
          </p>
        </div>

        {/* Card 3: 오늘 승인 총 금액 */}
        <div className="p-4 rounded-2xl bg-[var(--hm-paper)] border border-[var(--hm-border)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--hm-ink-3)] font-semibold">
            <span>오늘 승인 총 금액</span>
            <CreditCard size={15} className="text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[var(--hm-ink)]">
              {stats.todaySuccessAmount.toLocaleString()}
              <span className="text-sm font-semibold text-[var(--hm-ink-3)] ml-1">원</span>
            </span>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">
              실 결제
            </span>
          </div>
          <p className="text-[11px] text-[var(--hm-ink-3)]">
            금일 정기결제로 정산 원장에 집계된 총액
          </p>
        </div>

        {/* Card 4: 전체 활성 정기구독 */}
        <div className="p-4 rounded-2xl bg-[var(--hm-paper)] border border-[var(--hm-border)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--hm-ink-3)] font-semibold">
            <span>전체 활성 정기 약정</span>
            <Clock size={15} className="text-slate-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[var(--hm-ink)]">
              {stats.activeSubsCount}
              <span className="text-sm font-semibold text-[var(--hm-ink-3)] ml-1">건</span>
            </span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              총 {subscriptions.length}건 등록
            </span>
          </div>
          <p className="text-[11px] text-[var(--hm-ink-3)]">
            현재 유지 중인 전체 단체 빌키 약정 건
          </p>
        </div>
      </div>

      {/* ── 3. Last Batch Result Alert (if run in this session) ── */}
      {lastBatchResult && (
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-blue-900 dark:text-blue-200">
            <p className="font-bold text-sm mb-1">
              배치 실행이 성공적으로 완료되었습니다 ({lastBatchResult.executedAtKst} KST 기준)
            </p>
            <p>
              처리 대상: <strong>{lastBatchResult.processedCount}건</strong> (성공: <strong>{lastBatchResult.successCount}건</strong>, 실패: <strong>{lastBatchResult.failedCount}건</strong>)
            </p>
          </div>
          <button
            onClick={() => setLastBatchResult(null)}
            className="text-blue-500 hover:text-blue-700 text-xs font-bold cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}

      {/* ── 4. Tabs & Filter Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[var(--hm-paper-2)] p-1 rounded-xl border border-[var(--hm-border)]">
          <button
            onClick={() => { setActiveTab('queue'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-[var(--hm-paper)] text-[var(--hm-ink)] shadow-2xs'
                : 'text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)]'
            }`}
          >
            정기결제 약정 큐 ({subscriptions.length}건)
          </button>
          <button
            onClick={() => { setActiveTab('logs'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[var(--hm-paper)] text-[var(--hm-ink)] shadow-2xs'
                : 'text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)]'
            }`}
          >
            정기결제 승인 로그 ({recurringDonations.length}건)
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tenant Filter */}
          <select
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[var(--hm-paper)] border border-[var(--hm-border)] text-[var(--hm-ink)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">전체 단체</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
            ))}
          </select>

          {/* Status Filter (Queue tab only) */}
          {activeTab === 'queue' && (
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[var(--hm-paper)] border border-[var(--hm-border)] text-[var(--hm-ink)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">전체 상태</option>
              <option value="active">이체중 (Active)</option>
              <option value="paused">일시중지 (Paused)</option>
              <option value="cancelled">해지됨 (Cancelled)</option>
            </select>
          )}

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--hm-ink-3)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={activeTab === 'queue' ? '기부자명, 전화번호, 약정ID' : '기부자명, 승인번호, 거래번호'}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--hm-paper)] border border-[var(--hm-border)] text-[var(--hm-ink)] placeholder:text-[var(--hm-ink-3)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── 5. Main Table Container ── */}
      <div className="rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-paper)] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-[var(--hm-ink-3)]">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <p className="text-xs font-semibold">스케줄러 데이터를 실시간 조회 중입니다...</p>
          </div>
        ) : activeTab === 'queue' ? (
          /* ── Subscriptions Queue Table ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)] font-bold">
                  <th className="px-4 py-3">약정 ID</th>
                  <th className="px-4 py-3">소속 단체</th>
                  <th className="px-4 py-3">기부자명</th>
                  <th className="px-4 py-3">연락처</th>
                  <th className="px-4 py-3">봉헌 항목</th>
                  <th className="px-4 py-3">결제 주기</th>
                  <th className="px-4 py-3 text-right">약정 금액</th>
                  <th className="px-4 py-3">결제 카드</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-center">다음 결제일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hm-border)]">
                {filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-[var(--hm-ink-3)] font-semibold">
                      조회된 정기 약정 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSubs
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((sub) => {
                      const tenant = tenantMap.get(sub.tenantId);
                      const isDue = sub.nextPaymentDate && sub.nextPaymentDate.slice(0, 10) <= todayKstStr;

                      return (
                        <tr key={sub.id} className="hover:bg-[var(--hm-paper-2)] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-zinc-400">
                            {sub.id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--hm-ink)]">
                            {tenant?.name || sub.tenantId}
                          </td>
                          <td className="px-4 py-3 font-bold text-[var(--hm-ink)]">
                            {sub.donorName || '무기명'}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--hm-ink-2)]">
                            {sub.donorPhone ? sub.donorPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}
                          </td>
                          <td className="px-4 py-3 text-[var(--hm-ink)]">
                            {sub.itemName || '정기 봉헌금'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                            {formatInterval(sub)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-[var(--hm-ink)]">
                            {Number(sub.amount || 0).toLocaleString()}원
                          </td>
                          <td className="px-4 py-3 text-[var(--hm-ink-2)] font-mono text-[11px]">
                            {sub.cardName || '신용카드'} {sub.cardNo ? `(${sub.cardNo.slice(-4)})` : ''}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-full ${
                                sub.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : sub.status === 'paused'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {sub.status === 'active' ? '이체중' : sub.status === 'paused' ? '일시중지' : '해지됨'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            <span
                              className={`${
                                isDue && sub.status === 'active'
                                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md'
                                  : 'text-[var(--hm-ink)]'
                              }`}
                            >
                              {sub.nextPaymentDate || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Recurring Donations Log Table ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)] font-bold">
                  <th className="px-4 py-3">승인 일시</th>
                  <th className="px-4 py-3">소속 단체</th>
                  <th className="px-4 py-3">기부자명</th>
                  <th className="px-4 py-3">연락처</th>
                  <th className="px-4 py-3">봉헌 항목</th>
                  <th className="px-4 py-3 text-right">결제 금액</th>
                  <th className="px-4 py-3 font-mono">승인번호</th>
                  <th className="px-4 py-3 font-mono">PG 거래번호</th>
                  <th className="px-4 py-3 text-center">결제 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hm-border)]">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-[var(--hm-ink-3)] font-semibold">
                      기록된 정기결제 자동 승인 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDonations
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((d) => {
                      const tenant = tenantMap.get(d.tenantId);
                      const isCompleted = d.paymentStatus === 'completed';
                      const isCancelled = d.paymentStatus === 'cancelled';

                      return (
                        <tr key={d.id} className="hover:bg-[var(--hm-paper-2)] transition-colors">
                          <td className="px-4 py-3 font-mono text-[var(--hm-ink-2)] text-[11px] whitespace-nowrap">
                            {d.createdAt ? new Date(d.createdAt).toLocaleString('ko-KR', { hour12: false }) : '-'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--hm-ink)]">
                            {tenant?.name || d.tenantId}
                          </td>
                          <td className="px-4 py-3 font-bold text-[var(--hm-ink)]">
                            {d.donorName || '무기명'}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--hm-ink-2)]">
                            {d.donorPhone ? d.donorPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}
                          </td>
                          <td className="px-4 py-3 text-[var(--hm-ink)]">
                            {d.itemName || '주정헌금'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-[var(--hm-ink)]">
                            {Number(d.amount || 0).toLocaleString()}원
                          </td>
                          <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {d.approveNo || '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                            {d.transactionId || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : isCancelled
                                  ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                              }`}
                            >
                              {isCompleted ? '결제완료' : isCancelled ? '취소완료' : '실패'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        <div className="px-4 py-3 border-t border-[var(--hm-border)] bg-[var(--hm-paper-2)] flex items-center justify-between text-xs text-[var(--hm-ink-3)] font-semibold">
          <span>
            총 {activeTab === 'queue' ? filteredSubs.length : filteredDonations.length}건 중{' '}
            {activeTab === 'queue'
              ? Math.min(filteredSubs.length, (currentPage - 1) * pageSize + 1)
              : Math.min(filteredDonations.length, (currentPage - 1) * pageSize + 1)}
            -
            {activeTab === 'queue'
              ? Math.min(filteredSubs.length, currentPage * pageSize)
              : Math.min(filteredDonations.length, currentPage * pageSize)}
            건 표시
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)] disabled:opacity-40 cursor-pointer"
            >
              이전
            </button>
            <span className="px-2 font-mono">
              {currentPage} / {Math.max(1, Math.ceil((activeTab === 'queue' ? filteredSubs.length : filteredDonations.length) / pageSize))}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil((activeTab === 'queue' ? filteredSubs.length : filteredDonations.length) / pageSize)}
              className="px-2.5 py-1 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)] disabled:opacity-40 cursor-pointer"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
