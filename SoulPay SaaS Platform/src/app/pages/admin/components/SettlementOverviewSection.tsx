import { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

import { API_BASE_URL } from '../../../api/client';


const S = {
  card: 'bg-white dark:bg-zinc-900 rounded-[12px] border border-slate-200 dark:border-zinc-800 p-5 shadow-2xs',
  kpiTitle: 'text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 flex items-center justify-between',
  kpiVal: 'text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100 tracking-tight',
  subText: 'text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1',
};

interface OverviewMetrics {
  grossAmount: number;
  commissionTotal: number;
  tenantPayout: number;
  pgFeeTotal: number;
  platformFeeTotal: number;
  partnerFeeTotal: number;
  feeDepositTotal: number;
  partnerRateTotal: number;
  paidCount: number;
  pendingCount: number;
  pendingAmount: number;
}

interface Overview {
  thisMonth: OverviewMetrics;
  allTime:   OverviewMetrics;
  partners:  { masterAgency: number; salesAgent: number };
}

const EMPTY_METRICS: OverviewMetrics = {
  grossAmount: 0,
  commissionTotal: 0,
  tenantPayout: 0,
  pgFeeTotal: 0,
  platformFeeTotal: 0,
  partnerFeeTotal: 0,
  feeDepositTotal: 0,
  partnerRateTotal: 1.0,
  paidCount: 0,
  pendingCount: 0,
  pendingAmount: 0,
};

const EMPTY: Overview = {
  thisMonth: EMPTY_METRICS,
  allTime:   EMPTY_METRICS,
  partners:  { masterAgency: 0, salesAgent: 0 },
};

export default function SettlementOverviewSection() {
  const [timeRange, setTimeRange] = useState<'today' | 'month' | 'total'>('month');
  const [overview, setOverview] = useState<Overview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/admin/settlements/overview`);

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.success && json.data) {
          setOverview(json.data);
        } else {
          setError(json.error ?? '데이터 조회 실패');
        }
      } catch {
        setError('서버 응답 형식 오류');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchOverview(); }, []);

  // 기간 선택에 따른 stats 결산
  const raw = timeRange === 'total' ? overview.allTime : overview.thisMonth;
  const stats = {
    grossAmount:   raw.grossAmount,
    tenantPayout:  raw.tenantPayout ?? Math.round(raw.grossAmount * 0.97),
    pgFee:         raw.pgFeeTotal ?? Math.round(raw.grossAmount * 0.015),
    platformFee:   raw.platformFeeTotal ?? Math.round(raw.grossAmount * 0.005),
    partnerFee:    raw.partnerFeeTotal ?? Math.round(raw.grossAmount * 0.01),
    feeDeposit:    raw.feeDepositTotal ?? ((raw.platformFeeTotal ?? 0) + (raw.partnerFeeTotal ?? 0)),
    partnerRate:   raw.partnerRateTotal ?? 1.0,
    netProfit:     raw.platformFeeTotal ?? Math.round(raw.grossAmount * 0.005),
    pendingCount:  overview.thisMonth.pendingCount,
    pendingAmount: overview.thisMonth.pendingAmount,
  };



  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 기간 선택 + 새로고침 ── */}
      <div className="flex items-center justify-between bg-slate-100/70 dark:bg-zinc-800/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
        <div className="flex gap-1">
          {(['today', 'month', 'total'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              {range === 'today' ? '오늘 정산' : range === 'month' ? '이번 달 정산' : '누적 전체'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />}
          {error && <span className="text-[11px] text-red-500">{error}</span>}
          {!loading && !error && (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              DB 실시간 데이터
            </span>
          )}
          <button
            onClick={fetchOverview}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── KPI 카드 5종 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. 총 결제 승인액 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>총 수수료 원금 (Gross)</span>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div className={S.kpiVal}>{stats.grossAmount.toLocaleString()}원</div>
          <div className={S.subText}>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>partner_commissions 합산</span>
          </div>
        </div>

        {/* 2. 가맹단체 정산 완료액 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>가맹단체 입금 완료액</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className={S.kpiVal}>{stats.tenantPayout.toLocaleString()}원</div>
          <div className={S.subText}>
            <span className="font-bold text-emerald-600">97%</span>
            <span>교회/성당/사찰 지급금</span>
          </div>
        </div>

        {/* 3. 플랫폼 총 수수료 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>플랫폼 수수료 (0.5%)</span>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </div>
          <div className={S.kpiVal}>{stats.platformFee.toLocaleString()}원</div>
          <div className={S.subText}>
            <span className="font-bold text-purple-600">0.5%</span>
            <span>SoulPay 수수료 수익</span>
          </div>
        </div>

        {/* 4. 파트너/에이전트 수수료 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>영업 파트너 지급금</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className={S.kpiVal}>{stats.partnerFee.toLocaleString()}원</div>
          <div className={S.subText}>
            <span className="font-bold text-amber-600">
              {stats.partnerRate.toFixed(1)}%
            </span>
            <span>대리점·영업자 배분금 ({overview.partners.masterAgency + overview.partners.salesAgent}명)</span>
          </div>
        </div>

        {/* 5. 수수료 계좌 정산 풀 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>수수료 계좌 정산 풀</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
            {stats.feeDeposit.toLocaleString()}원
          </div>
          <div className={S.subText}>
            <span className="font-bold text-indigo-600">{(0.5 + stats.partnerRate).toFixed(1)}%</span>
            <span>플랫폼(0.5%) + 파트너({stats.partnerRate.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* ── 5단계 실시간 정산 파이프라인 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-[12px] border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              5단계 실시간 정산 처리 파이프라인 현황
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">자동 배치 주기: D+1 09:00</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Step 1: 수수료 원장 */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span>1. 수수료 원장</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                {overview.thisMonth.paidCount + overview.thisMonth.pendingCount}건
              </Badge>
            </div>
            <div className="text-lg font-bold font-mono text-blue-950 dark:text-blue-100">
              {stats.grossAmount.toLocaleString()}원
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              결제 승인 원금 집계
            </p>
            <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400 z-10" />
          </div>

          {/* Step 2: PG 수수료 공제 */}
          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
              <span>2. PG 수수료 공제</span>
              <span className="text-[11px] font-mono text-purple-700">1.5% 공제</span>
            </div>
            <div className="text-lg font-bold font-mono text-purple-950 dark:text-purple-100">
              -{stats.pgFee.toLocaleString()}원
            </div>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              토스 PG 원가 차감
            </p>
            <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400 z-10" />
          </div>

          {/* Step 3: 가맹단체 직정산 입금 */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <span>3. 가맹단체 직정산 입금</span>
              <span className="text-[11px] font-mono text-emerald-700">97.0% 지급</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-100">
              {stats.tenantPayout.toLocaleString()}원
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              교회/성당/사찰 계좌 입금
            </p>
            <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400 z-10" />
          </div>

          {/* Step 4: 플랫폼 수수료 입금 */}
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <span>4. 플랫폼 수수료 입금</span>
              <span className="text-[11px] font-mono text-indigo-700">0.5% 입금</span>
            </div>
            <div className="text-lg font-bold font-mono text-indigo-950 dark:text-indigo-100">
              {stats.platformFee.toLocaleString()}원
            </div>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
              SoulPay 플랫폼 순수익
            </p>
            <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 z-10" />
          </div>

          {/* Step 5: 파트너 수수료 입금 */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
              <span>5. 파트너 수수료 입금</span>
              <span className="text-[11px] font-mono text-amber-700">
                {stats.partnerRate.toFixed(1)}% 배분
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-950 dark:text-amber-100">
              {stats.partnerFee.toLocaleString()}원
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              대리점(0.5%) + 영업자(0.5%)
            </p>
          </div>
        </div>
      </div>

      {/* ── 예외 및 보류 건 알림 바 ── */}
      {stats.pendingCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                정산 확인 필요 건수 {stats.pendingCount}건 (총 {stats.pendingAmount.toLocaleString()}원)
              </p>
              <p className="text-[11.5px] text-amber-800">
                [지급 실행 &amp; 뱅킹 송금] 탭에서 확인하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
          >
            예외 건 처리하기
          </button>
        </div>
      )}
    </div>
  );
}
