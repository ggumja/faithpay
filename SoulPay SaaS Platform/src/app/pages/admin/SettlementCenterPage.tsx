import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  FileText,
} from 'lucide-react';
import SettlementOverviewSection from './components/SettlementOverviewSection';
import MultiPartySettlementLedger from './components/MultiPartySettlementLedger';
import SettlementStatementSection from './components/SettlementStatementSection';

/* ── 스타일 토큰 ── */
const S = {
  page: 'space-y-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen',
  head: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-zinc-800',
  title: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100',
  desc: 'text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed',
};

const TABS = [
  { key: 'overview', label: '📊 결제 및 분구 집계', icon: BarChart3 },
  { key: 'audit_table', label: '👥 단체·대리점 분구 대조표', icon: FileText },
  { key: 'ledger', label: '📜 전체 결제 승인 원장', icon: BookOpen },
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
            정산 및 수수료 분구 센터
          </h1>
          <p className={S.desc}>
            가맹단체의 헌금 대금과 영업대리점 수수료는 PG사(나노/토스)의 금융망 자동 스플릿(Split) 정산으로 각 계좌에 직입금됩니다.
            <br className="hidden sm:inline" />
            본 센터에서는 결제 승인 실측 집계, 플랫폼 이용료 수익 및 시스템 분구 기준 대조를 제공합니다.
          </p>
        </div>
      </div>

      {/* ── 메인 탭 내비게이션 (3대 핵심 탭) ── */}
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
      {activeTab === 'audit_table' && <SettlementStatementSection />}
      {activeTab === 'ledger' && <MultiPartySettlementLedger />}
    </div>
  );
}
