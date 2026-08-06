import { useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

/* ── 스타일 토큰 ── */
const S = {
  card: 'bg-white dark:bg-zinc-900 rounded-[12px] border border-slate-200 dark:border-zinc-800 p-5 shadow-2xs',
  kpiTitle: 'text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 flex items-center justify-between',
  kpiVal: 'text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100 tracking-tight',
  subText: 'text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1',
};

export default function SettlementOverviewSection() {
  const [timeRange, setTimeRange] = useState<'today' | 'month' | 'total'>('month');

  // 샘플 통계 데이터 (선택한 기간별 계산)
  const stats = {
    today: {
      grossAmount: 4850000,
      tenantPayout: 4753000,
      platformFee: 24250,
      partnerFee: 9700,
      netProfit: 14550,
      pendingCount: 2,
      pendingAmount: 185000,
    },
    month: {
      grossAmount: 142850000,
      tenantPayout: 139993000,
      platformFee: 714250,
      partnerFee: 285700,
      netProfit: 428550,
      pendingCount: 5,
      pendingAmount: 1240000,
    },
    total: {
      grossAmount: 1845000000,
      tenantPayout: 1808100000,
      platformFee: 9225000,
      partnerFee: 3690000,
      netProfit: 5535000,
      pendingCount: 0,
      pendingAmount: 0,
    },
  }[timeRange];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 기간 선택 바 ── */}
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
        <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium px-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          토스페이먼츠 v2 Payouts 엔진 정상 가동 중
        </div>
      </div>

      {/* ── KPI 카드 5종 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. 총 결제 승인액 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>총 결제 승인액 (Gross)</span>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div className={S.kpiVal}>{stats.grossAmount.toLocaleString()}원</div>
          <div className={S.subText}>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>신도 결제 승인 원금</span>
          </div>
        </div>

        {/* 2. 원원사 정산 완료액 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>원원사 입금 완료액</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className={S.kpiVal}>{stats.tenantPayout.toLocaleString()}원</div>
          <div className={S.subText}>
            <span className="font-bold text-emerald-600">98.0%</span>
            <span>교회/성당/사찰 지급금</span>
          </div>
        </div>

        {/* 3. 플랫폼 총 수수료 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>플랫폼 총 수수료 (0.5%)</span>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </div>
          <div className={S.kpiVal}>{stats.platformFee.toLocaleString()}원</div>
          <div className={S.subText}>
            <span className="font-bold text-purple-600">0.5%</span>
            <span>페이스페이 수수료 수익</span>
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
            <span className="font-bold text-amber-600">0.2%</span>
            <span>총판/에이전트 배분금</span>
          </div>
        </div>

        {/* 5. 플랫폼 최종 순수익 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>플랫폼 순수익 (Net)</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
            {stats.netProfit.toLocaleString()}원
          </div>
          <div className={S.subText}>
            <span className="font-bold text-indigo-600">0.3%</span>
            <span>최종 순이익금</span>
          </div>
        </div>
      </div>

      {/* ── 실시간 4자간 정산 파이프라인 (Settlement Pipeline) ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-[12px] border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              4자간 자동 분구(Split) 정산 처리 파이프라인 현황
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">자동 배치 주기: D+1 09:00</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          {/* Step 1 */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span>1. 신도 결제 완료</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                승인 100%
              </Badge>
            </div>
            <div className="text-lg font-bold font-mono text-blue-950 dark:text-blue-100">
              {stats.grossAmount.toLocaleString()}원
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              PG사(토스/나노) 결제 승인 완료
            </p>
            <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400 z-10" />
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
              <span>2. PG 수수료 공제</span>
              <span className="text-[11px] font-mono text-purple-700">1.5% 공제</span>
            </div>
            <div className="text-lg font-bold font-mono text-purple-950 dark:text-purple-100">
              -{(stats.grossAmount * 0.015).toLocaleString()}원
            </div>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              PG 원가 1.5% 자동 차감
            </p>
            <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400 z-10" />
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <span>3. 원원사 직정산 입금</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                98.0% 직송금
              </Badge>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-100">
              {stats.tenantPayout.toLocaleString()}원
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              교회/성당/사찰 계좌 입금
            </p>
            <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400 z-10" />
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
              <span>4. 수수료 계좌 입금</span>
              <span className="text-[11px] font-mono text-amber-700">0.5% 분배</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-950 dark:text-amber-100">
              {stats.platformFee.toLocaleString()}원
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              플랫폼(0.3%) + 파트너(0.2%)
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
                정산 확인 필요 건수 {stats.pendingCount}건 발생 (총 {stats.pendingAmount.toLocaleString()}원)
              </p>
              <p className="text-[11.5px] text-amber-800">
                예금주 불일치 또는 정산 계좌 미등록으로 유예된 건입니다. [지급 실행 & 뱅킹 송금] 탭에서 확인하세요.
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
