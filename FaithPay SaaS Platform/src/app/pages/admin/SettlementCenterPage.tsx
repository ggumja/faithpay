import { useState, useEffect } from 'react';
import {
  BarChart3,
  BookOpen,
  Send,
  FileText,
  Building2,
  DollarSign,
  ShieldCheck,
  Zap,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import SettlementOverviewSection from './components/SettlementOverviewSection';
import MultiPartySettlementLedger from './components/MultiPartySettlementLedger';
import PayoutExecutionManager from './components/PayoutExecutionManager';
import SettlementStatementSection from './components/SettlementStatementSection';
import SettlementRiskAndAuditSection from './components/SettlementRiskAndAuditSection';

import { useApp } from '../../context/AppContext';
import { tenantAPI } from '../../api/client';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

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
  const { tenants: appTenants } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [tenants, setTenants] = useState<any[]>(appTenants || []);
  const [selectedTenantId, setSelectedTenantId] = useState(appTenants[0]?.id || '');
  const [testAmount, setTestAmount] = useState<number>(100000);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // DB 및 AppContext 가맹점 목록 전체 로드
    tenantAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTenants(res.data);
        if (!selectedTenantId) setSelectedTenantId(res.data[0].id);
      } else if (appTenants && appTenants.length > 0) {
        setTenants(appTenants);
        if (!selectedTenantId) setSelectedTenantId(appTenants[0].id);
      }
    }).catch(() => {
      if (appTenants && appTenants.length > 0) {
        setTenants(appTenants);
        if (!selectedTenantId) setSelectedTenantId(appTenants[0].id);
      }
    });
  }, [appTenants]);



  const handleCreateTestDonation = async () => {
    if (!selectedTenantId || !testAmount) {
      toast.error('단체와 금액을 선택해 주세요.');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/make-server-d0d82cc7/admin/test-donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          amount: testAmount,
          donorName: 'E2E 테스트 성도',
          paymentMethod: '신용카드',
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success(`⚡ ${json.data.tenantName}에 ${testAmount.toLocaleString()}원 결제 및 4자간 수수료 분구가 DB에 생성되었습니다!`);
        // 탭 새로고침 유도
        setActiveTab('ledger');
      } else {
        toast.error(json.error || '테스트 결제 생성 실패');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetTestLedger = async () => {

    if (!confirm('현재 거래 원장을 모두 0건으로 리셋하시겠습니까?\n(대리점/영업자 조직 및 가맹점 구조는 그대로 보존됩니다.)')) {
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/make-server-d0d82cc7/admin/test-donations/reset`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('🧹 거래 원장이 0건으로 깔끔히 초기화되었습니다. 샌드박스로 새로 입력해 보세요!');
        setActiveTab('ledger');
        window.location.reload();
      } else {
        toast.error(json.error || '초기화 실패');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCreating(false);
    }
  };

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

      {/* ── ⚡ 실데이터 결제 생성 테스트 샌드박스 패널 ── */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white p-4.5 rounded-2xl shadow-xl space-y-3 border border-blue-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400 animate-pulse" />
            <h3 className="text-sm font-bold tracking-tight">
              실데이터 결제 입력 샌드박스 (E2E Test Data Generator)
            </h3>
          </div>
          <span className="text-[11px] bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full font-mono border border-blue-400/30">
            Real DB Postgres Trigger
          </span>
        </div>
        <p className="text-xs text-blue-200/80">
          테스트 헌금 결제 건을 클릭 한 번으로 생성하면, DB의 4자간 분구 엔진이 실시간 작동하여 대리점/영업자/플랫폼 수수료 원장으로 즉시 반영됩니다.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Building2 className="h-4 w-4 text-blue-300" />
              <span className="text-xs font-semibold text-slate-300">가맹 단체:</span>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-600 outline-none cursor-pointer max-h-60"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white font-bold py-1.5">
                    {t.name}
                  </option>
                ))}
              </select>


            </div>

            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">결제 금액:</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                {[100000, 300000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTestAmount(amt)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer border-none ${
                      testAmount === amt ? 'bg-emerald-500 text-white font-black' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {(amt / 10000).toLocaleString()}만원
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateTestDonation}
              disabled={isCreating}
              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer border-none transition-all disabled:opacity-50"
            >
              {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              실데이터 테스트 결제 승인하기
            </button>
          </div>

          <button
            onClick={handleResetTestLedger}
            disabled={isCreating}
            className="px-3 py-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            🧹 거래 원장 0건 초기화
          </button>
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
