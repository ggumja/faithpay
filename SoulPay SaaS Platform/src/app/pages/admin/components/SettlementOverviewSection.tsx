import { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  RefreshCw,
  Users,
  Layers,
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
  partnerRateTotal: 0,
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
  const [timeRange, setTimeRange] = useState<'month' | 'total'>('month');
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

  useEffect(() => {
    fetchOverview();
  }, []);

  const raw = timeRange === 'total' ? overview.allTime : overview.thisMonth;
  const grossAmount = raw.grossAmount || 0;
  const platformFee = raw.platformFeeTotal || 0;
  const partnerFee = raw.partnerFeeTotal || 0;
  const partnerCount = (overview.partners.masterAgency || 0) + (overview.partners.salesAgent || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 📢 PG사 자동 스플릿 직정산 공식 안내 배너 ── */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4.5 text-slate-800 dark:text-zinc-200 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold text-sm text-blue-900 dark:text-blue-300">
                PG사 자동 스플릿(Split) 직정산 시스템 안내
              </span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold">
                직정산 원칙
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              가맹단체(교회/성당/사찰)의 헌금 대금 및 영업대리점 수수료는 <strong>나노PG / 토스PG의 금융망 자동 분기(Split) 정산</strong>을 통해 각 사업자/개인 통장으로 직접 입금됩니다.
              <br className="hidden sm:inline" />
              단체별 계약 수수료율, 공제 세액 및 최종 실입금 내역은 계약된 PG사의 상점관리자에서 확인하실 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href="https://admin.nanopay.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700 hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <span>나노페이 관리자</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://app.tosspayments.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700 hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <span>토스페이먼츠 상점</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── 기간 선택 바 ── */}
      <div className="flex items-center justify-between bg-slate-100/70 dark:bg-zinc-800/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
        <div className="flex gap-1">
          {(['month', 'total'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              {range === 'month' ? '이번 달 집계' : '누적 전체 집계'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />}
          {error && <span className="text-[11px] text-red-500">{error}</span>}
          {!loading && !error && (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              실측 DB 기반 집계
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

      {/* ── 핵심 실측 KPI 카드 4종 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 총 결제 승인액 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>총 결제 승인 원금 (Gross)</span>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div className={S.kpiVal}>{grossAmount.toLocaleString()}원</div>
          <div className={S.subText}>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>SoulPay 결제 승인 원장 합산</span>
          </div>
        </div>

        {/* 2. SoulPay 플랫폼 수수료 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>플랫폼 이용료 수익 (0.5%)</span>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight">
            {platformFee.toLocaleString()}원
          </div>
          <div className={S.subText}>
            <span className="font-bold text-purple-600">SoulPay</span>
            <span>솔루션 제공 수수료 수익</span>
          </div>
        </div>

        {/* 3. 영업대리점 수수료 분구 풀 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>영업 파트너 분구 풀</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            {partnerFee.toLocaleString()}원
          </div>
          <div className={S.subText}>
            <Users className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>등록 대리점·영업자 {partnerCount}명 기준 배분</span>
          </div>
        </div>

        {/* 4. 분구 수수료 총액 */}
        <div className={S.card}>
          <div className={S.kpiTitle}>
            <span>시스템 수수료 풀 합계</span>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
            {(platformFee + partnerFee).toLocaleString()}원
          </div>
          <div className={S.subText}>
            <span className="font-bold text-indigo-600">스플릿</span>
            <span>플랫폼 + 파트너 분구 합계</span>
          </div>
        </div>
      </div>

      {/* ── PG사 자동 스플릿 정산 흐름 인포그래픽 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-[12px] border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              SoulPay &times; PG사 금융망 스플릿(Split) 직정산 프로세스
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">안전한 자금 보호 (미보관 구조)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Step 1 */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">STEP 1. 결제 승인</span>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                실시간
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              신도/기부자 헌금 결제
            </p>
            <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              신용카드, 간편결제(카카오/토스페이/네이버페이)로 결제 시 PG사(나노PG/토스PG)를 통해 즉시 승인됩니다.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">STEP 2. 원가 수수료 공제</span>
              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                PG사 처리
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              단체별 계약 PG 수수료 차감
            </p>
            <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              각 단체가 PG사와 약정한 개별 수수료율에 따라 결제 원가가 공제되며, PG사가 정산 분할을 계산합니다.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">STEP 3. 금융망 직정산 입금</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                D+N 직입금
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              당사자별 계좌로 분할 입금
            </p>
            <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              <strong>가맹단체 통장</strong>(헌금 실입금), <strong>대리점 통장</strong>(수수료), <strong>SoulPay 통장</strong>(플랫폼료)으로 PG사가 직접 분할 송금합니다.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-lg border border-slate-200/80 dark:border-zinc-700/80 text-[11.5px] text-slate-600 dark:text-zinc-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            SoulPay는 회원의 자금을 별도 보관하거나 수동으로 이체하지 않으며, 공인된 전자지급결제대행사(PG)의 법적 분리 계좌 체계에 따라 정산이 투명하게 자동 집행됩니다.
          </span>
        </div>
      </div>
    </div>
  );
}
