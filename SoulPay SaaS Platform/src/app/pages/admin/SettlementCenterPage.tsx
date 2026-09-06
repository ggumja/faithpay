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
import { tenantAPI, paymentAPI } from '../../api/client';


/* ── 스타일 토큰 ── */
const S = {
  page: 'space-y-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen',

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
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [testAmount, setTestAmount] = useState<number>(100000);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // 백엔드 DB의 최신 전체 가맹 단체 목록 최우선 조회
    tenantAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTenants(res.data);
        setSelectedTenantId(res.data[0].id);
      } else if (appTenants && appTenants.length > 0) {
        setTenants(appTenants);
        setSelectedTenantId(appTenants[0].id);
      }
    }).catch(() => {
      if (appTenants && appTenants.length > 0) {
        setTenants(appTenants);
        setSelectedTenantId(appTenants[0].id);
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
      const res = await paymentAPI.createTestDonation({
        tenantId: selectedTenantId,
        amount: testAmount,
        donorName: 'E2E 테스트 성도',
        paymentMethod: '신용카드',
      });
      if (res.success && res.data) {
        toast.success(`⚡ ${res.data.tenantName}에 ${testAmount.toLocaleString()}원 결제 및 4자간 수수료 분구가 DB에 생성되었습니다!`);
        setActiveTab('ledger');
      } else {
        toast.error(res.error || '테스트 결제 생성 실패');
      }
    } catch (e: any) {
      toast.error(e.message || '결제 생성 중 에러가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetTestLedger = async () => {
    if (!confirm('현재 거래 원장을 모두 0건으로 리셋하시겠습니까?\n(대리점/영업자 조직 및 가맹점 구조는 그대로 보존됩니다.)')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await paymentAPI.resetLedger();
      if (res.success) {
        toast.success('거래 내역 및 수수료 원장이 0건으로 깔끔하게 리셋되었습니다.');
        setActiveTab('overview');
      } else {
        toast.error(res.error || '원장 리셋 실패');
      }
    } catch (e: any) {
      toast.error(e.message || '원장 리셋 중 에러가 발생했습니다.');
    } finally {
      setIsResetting(false);
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
            가맹단체(교회/성당/사찰), SoulPay 플랫폼, 영업 대리점 및 영업자 간 4자간 자동 수수료 분구(Split) 및 지급대행을 관리합니다.
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
