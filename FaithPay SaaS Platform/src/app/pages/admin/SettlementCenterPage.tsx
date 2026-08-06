import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Send,
  FileText,
  Building2,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import SettlementOverviewSection from './components/SettlementOverviewSection';
import MultiPartySettlementLedger from './components/MultiPartySettlementLedger';
import PayoutExecutionManager from './components/PayoutExecutionManager';
import SettlementStatementSection from './components/SettlementStatementSection';
import SettlementRiskAndAuditSection from './components/SettlementRiskAndAuditSection';

/* ── 스타일 토큰 ── */
const S = {
  page: 'p-6 space-y-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen',
  head: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-zinc-800',
  title: 'text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2.5',
  desc: 'text-xs text-slate-500 dark:text-zinc-400 mt-1',
};

const TABS = [
  { key: 'overview', label: '📊 종합 정산 현황', icon: BarChart3 },
  { key: 'ledger', label: '📜 4자간 수수료 분구 원장', icon: BookOpen },
  { key: 'payouts', label: '⚡ 지급 실행 & 뱅킹 송금', icon: Send },
  { key: 'statement', label: '📄 정산 명세서 & 세무 서식', icon: FileText },
  { key: 'risk_audit', label: '🛡️ 정산 리스크 & 대조 검증', icon: ShieldCheck },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function SettlementCenterPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <div className={S.page}>
      {/* ── 헤더 ── */}
      <div className={S.head}>
        <div>
          <h1 className={S.title}>
            <span className="p-1.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-lg">🏦</span>
            정산 관리 센터 (Settlement Management Center)
          </h1>
          <p className={S.desc}>
            원원사(교회/성당/사찰), 페이스페이 플랫폼, 영업 총판 및 에이전트 간 4자간 자동 수수료 분구(Split) 및 지급대행을 관리합니다.
          </p>
        </div>
      </div>

      {/* ── 메인 탭 내비게이션 ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap bg-transparent border-x-0 border-t-0 ${
              activeTab === key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 렌더링 ── */}
      {activeTab === 'overview' && <SettlementOverviewSection />}
      {activeTab === 'ledger' && <MultiPartySettlementLedger />}
      {activeTab === 'payouts' && <PayoutExecutionManager />}
      {activeTab === 'statement' && <SettlementStatementSection />}
      {activeTab === 'risk_audit' && <SettlementRiskAndAuditSection />}
    </div>
  );
}
