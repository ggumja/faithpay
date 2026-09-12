import SettlementStatementSection from './components/SettlementStatementSection';

export default function SettlementAuditPage() {
  return (
    <div className="space-y-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            단체·대리점 분구 대조표
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            가맹단체 거래 실적 및 영업대리점 수수료 분구 기준을 월별로 대조하고, 정식 대조 명세서 인쇄 및 CSV 다운로드를 지원합니다.
            <br className="hidden sm:inline" />
            실제 입금액 및 세무 증빙(원천징수/세금계산서)은 PG사(나노/토스) 상점관리자에서 최종 확인하실 수 있습니다.
          </p>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <SettlementStatementSection />
    </div>
  );
}
