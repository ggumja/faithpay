import SettlementOverviewSection from './components/SettlementOverviewSection';

export default function SettlementOverviewPage() {
  return (
    <div className="space-y-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            결제 및 분구 집계
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            가맹단체의 헌금 대금과 영업대리점 수수료는 PG사(나노/토스)의 금융망 자동 스플릿(Split) 정산으로 각 계좌에 직입금됩니다.
            <br className="hidden sm:inline" />
            본 화면에서는 SoulPay 결제 승인 실측 집계, 플랫폼 이용료 수익 및 정산 프로세스를 제공합니다.
          </p>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <SettlementOverviewSection />
    </div>
  );
}
