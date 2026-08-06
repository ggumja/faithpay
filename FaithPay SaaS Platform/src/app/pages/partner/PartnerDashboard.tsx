/* Hallmark · shell: N3 Side-rail (persistent) · genre: modern-minimal · theme: Emerald */
/* Partner Admin Portal — design parity with SystemAdminShell */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import {
  LayoutDashboard, Building2, TrendingUp, Users, UserCircle,
  LogOut, Bell, Search, Menu, ChevronRight,
} from 'lucide-react';
import { Partner, PartnerCommission, partnerAPI } from '../../api/client';
import { toast } from 'sonner';

// Modular Section Components
import { PartnerHomeSection }        from './components/PartnerHomeSection';
import { PartnerTenantsSection }     from './components/PartnerTenantsSection';
import { PartnerCommissionsSection } from './components/PartnerCommissionsSection';
import { PartnerAgentsSection }      from './components/PartnerAgentsSection';
import { PartnerMyInfoSection }      from './components/PartnerMyInfoSection';

/* ─── types ─────────────────────────────────────── */
type Section = 'home' | 'tenants' | 'commissions' | 'agents' | 'myinfo';

interface NavItem { key: Section; icon: any; label: string; section: string; }

const NAV_ALL: NavItem[] = [
  { key: 'home',        icon: LayoutDashboard, label: '대시보드',      section: '현황 요약'          },
  { key: 'tenants',     icon: Building2,       label: '단체 관리',      section: '관리 단체 목록'     },
  { key: 'commissions', icon: TrendingUp,       label: '수수료 조회',    section: '수수료 발생 기록'   },
  { key: 'agents',      icon: Users,            label: '영업자 관리',    section: '소속 영업자 관리'   },
  { key: 'myinfo',      icon: UserCircle,       label: '내 정보 수정',   section: '계좌 · 연락처'      },
];

/* ─── style tokens (mirror SystemAdminShell) ────── */
const S = {
  shell:      'flex h-screen overflow-hidden bg-[var(--hm-paper-2)]',
  sidebar:    'w-52 shrink-0 flex flex-col bg-[var(--hm-paper)] border-r border-[var(--hm-border)] h-screen',
  brand:      'flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--hm-border)]',
  brandDot:   'w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 text-white text-[11px] font-bold',
  nav:        'flex-1 overflow-y-auto py-2 px-2 space-y-0.5',
  navSection: 'text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--hm-ink-3)] px-2.5 pt-3 pb-0.5',
  navItem:    (on: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] text-[12.5px] cursor-pointer border-none transition-colors text-left
     ${on ? 'bg-emerald-600 text-white font-medium' : 'bg-transparent text-[var(--hm-ink-2)] hover:bg-[var(--hm-paper-2)] hover:text-[var(--hm-ink)]'}`,
  sidefoot:   'px-2 py-2.5 border-t border-[var(--hm-border)]',
  header:     'h-[50px] bg-[var(--hm-paper)] border-b border-[var(--hm-border)] flex items-center px-5 gap-3 shrink-0',
  iconBtn:    'p-1.5 rounded-md text-[var(--hm-ink-3)] hover:bg-[var(--hm-paper-2)] transition-colors cursor-pointer border-none bg-transparent',
};

/* ─── nav label lookup ─── */
const navMeta = Object.fromEntries(NAV_ALL.map(n => [n.key, n]));

/* ═══════════════════════════════════════════════════════ */
export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { tenants } = useApp();

  /* ── 데이터 상태 ── */
  const [partner,    setPartner]    = useState<Partner | null>(null);
  const [myTenants,  setMyTenants]  = useState<any[]>([]);
  const [commissions,setCommissions]= useState<PartnerCommission[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);

  /* ── UI 상태 ── */
  const [section,        setSection]        = useState<Section>('home');
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [selectedAgent,  setSelectedAgent]  = useState<Partner | null>(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchFocus,    setSearchFocus]    = useState(false);

  /* ── 영업자 관련 상태 ── */
  const [subAgents,    setSubAgents]    = useState<Partner[]>([]);
  const [agentRates,   setAgentRates]   = useState<Record<string, number>>({});
  const [savingAgentId,setSavingAgentId]= useState<string | null>(null);

  /* ── 내 정보 수정 상태 ── */
  const [editPhone,      setEditPhone]      = useState('');
  const [editEmail,      setEditEmail]      = useState('');
  const [editBank,       setEditBank]       = useState('');
  const [editAccount,    setEditAccount]    = useState('');
  const [editHolder,     setEditHolder]     = useState('');
  const [editAgencyRate, setEditAgencyRate] = useState<number>(0.5);

  /* ── 검색 필터링 (관리 단체) ── */
  const searchResults = searchQuery.trim().length >= 1
    ? myTenants.filter(t =>
        (t.name ?? '').includes(searchQuery) ||
        (t.slug ?? '').includes(searchQuery)
      ).slice(0, 6)
    : [];

  /* ── 데이터 로드 ── */
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        // 세션 파트너 정보 읽기
        let sessionUser: any = {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: '한국불교문화원',
          email: 'sjlee@temple-pay.kr',
          role: 'master_agency',
          referralCode: 'BIT2024',
          agencyRate: 0.5,
        };
        try {
          const raw = localStorage.getItem('faithpay_partner_session');
          if (raw) sessionUser = { ...sessionUser, ...JSON.parse(raw) };
        } catch {}

        const activePartner: Partner = {
          id:             sessionUser.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name:           sessionUser.name || '한국불교문화원',
          email:          sessionUser.email || 'sjlee@temple-pay.kr',
          phone:          sessionUser.phone || '02-567-8901',
          role:           sessionUser.role || 'master_agency',
          commissionRate: sessionUser.agencyRate ?? 0.5,
          agencyRate:     sessionUser.agencyRate ?? 0.5,
          referralCode:   sessionUser.referralCode || 'BIT2024',
          bankName:       sessionUser.bankName || '국민은행',
          accountNumber:  sessionUser.accountNumber || '620-21-0123456',
          accountHolder:  sessionUser.accountHolder || '불교정보화협의회',
          status:         'active',
          createdAt:      new Date().toISOString(),
        };

        setPartner(activePartner);
        setEditPhone(activePartner.phone ?? '');
        setEditEmail(activePartner.email ?? '');
        setEditBank((activePartner as any).bankName ?? '');
        setEditAccount((activePartner as any).accountNumber ?? '');
        setEditHolder((activePartner as any).accountHolder ?? '');

        // 대리점 기본 수수료율 복원
        const savedRate = localStorage.getItem(`faithpay:agency_default_rate_${activePartner.id}`) ||
                          localStorage.getItem('faithpay:agency_default_rate');
        const activeRate = savedRate ? parseFloat(savedRate) : (activePartner.agencyRate ?? 0.5);
        setEditAgencyRate(activeRate);
        (activePartner as any).agencyRate = activeRate;

        // 기본 소속 영업자 데이터
        const defaultSubAgents: Partner[] = [{
          id:            'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          name:          '이수진',
          email:         'agent.lee@temple-pay.kr',
          phone:         '010-9876-5432',
          role:          'sales_agent',
          parentId:      activePartner.id,
          commissionRate: 0.3,
          agencyRate:    0.3,
          referralCode:  'LSJ002',
          bankName:      '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '이수진',
          status:        'active',
          createdAt:     new Date().toISOString(),
        }];
        setSubAgents(defaultSubAgents);

        let savedMap: Record<string, number> = {};
        try { savedMap = JSON.parse(localStorage.getItem('faithpay:agent_rates') || '{}'); } catch {}
        const rates: Record<string, number> = {};
        defaultSubAgents.forEach(a => { rates[a.id] = savedMap[a.id] ?? (a as any).agencyRate ?? activeRate; });
        setAgentRates(rates);

        // 관할 단체 필터링
        const sourceTenants = (tenants && tenants.length > 0) ? tenants : mockTenants;
        const agencyIds = [
          activePartner.id, activePartner.referralCode,
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'BIT2024',
          'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'LSJ002',
          ...defaultSubAgents.flatMap(a => [a.id, a.referralCode].filter(Boolean)),
        ];
        setMyTenants(sourceTenants.filter(t =>
          agencyIds.includes((t as any).registeredByPartnerId) ||
          agencyIds.includes((t as any).registeredByReferralCode) ||
          agencyIds.includes((t as any).referralCode) ||
          (t as any).registrationSource === 'agency' ||
          (t as any).registrationSource === 'agent'
        ));

        // 백그라운드 API 동기화
        try {
          const res = await partnerAPI.getAll();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const found = res.data.find(x =>
              x.id === activePartner.id || x.email === activePartner.email
            );
            if (found) setPartner({ ...found, name: '한국불교문화원', referralCode: 'BIT2024', role: 'master_agency' });
          }
        } catch {}
        try {
          const cr = await partnerAPI.getCommissions(activePartner.id);
          if (cr.success && cr.data) setCommissions(cr.data);
        } catch {}
        try {
          const ar = await partnerAPI.getByParent(activePartner.id);
          if (ar.success && Array.isArray(ar.data) && ar.data.length > 0) setSubAgents(ar.data);
        } catch {}
      } catch (err) {
        console.error('Failed to load partner dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenants]);

  /* ── 로딩 / 인증 가드 ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--hm-paper-2)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--hm-ink-3)] font-semibold">파트너 포털 로딩 중...</p>
        </div>
      </div>
    );
  }
  if (!partner) return null;

  const isAgency = partner.role === 'master_agency';
  const navItems = isAgency ? NAV_ALL : NAV_ALL.filter(n => n.key !== 'agents');
  const meta = navMeta[section] ?? navMeta.home;

  /* ── 섹션 변경 핸들러 ── */
  const handleNav = (key: Section) => {
    setSection(key);
    if (key !== 'agents') setSelectedAgent(null);
  };

  return (
    <div className={S.shell}>

      {/* ══ N3 Side-rail ══════════════════════════════════ */}
      {sidebarOpen && (
        <aside className={S.sidebar}>

          {/* 브랜드 */}
          <div className={S.brand}>
            <div className={S.brandDot}>FP</div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--hm-ink)] leading-none">FaithPay</div>
              <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">
                {isAgency ? '대리점 포털' : '영업자 포털'}
              </div>
            </div>
          </div>

          {/* 파트너 프로필 미니 카드 */}
          <div className="mx-2 mt-2 mb-1 px-3 py-2.5 rounded-[8px] bg-[var(--hm-paper-2)] border border-[var(--hm-border)] flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
              isAgency
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {partner.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-bold text-[var(--hm-ink)] truncate leading-none">{partner.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0 rounded-full ${
                  isAgency ? 'bg-purple-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {isAgency ? '대리점' : '영업자'}
                </span>
                <span className="text-[10px] text-[var(--hm-ink-3)] font-mono">{partner.referralCode}</span>
              </div>
            </div>
          </div>

          {/* 메인 내비게이션 */}
          <nav className={S.nav}>
            <p className={S.navSection}>영업 포털</p>
            {navItems.map(item => {
              const Icon = item.icon;
              const on = section === item.key;
              return (
                <button key={item.key} onClick={() => handleNav(item.key)} className={S.navItem(on)}>
                  <Icon size={13} className={on ? 'text-white' : 'text-[var(--hm-ink-3)]'} />
                  <span>{item.label}</span>
                  {item.key === 'commissions' && commissions.length > 0 && (
                    <span className={`ml-auto text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                      on ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {commissions.length}
                    </span>
                  )}
                  {item.key === 'agents' && subAgents.length > 0 && (
                    <span className={`ml-auto text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                      on ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {subAgents.length}명
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 로그아웃 */}
          <div className={S.sidefoot}>
            <button
              onClick={() => {
                localStorage.removeItem('faithpay_partner_session');
                toast.success('파트너 포털에서 로그아웃 되었습니다.');
                navigate('/partner/login');
              }}
              className="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-[6px] text-[12.5px] text-[var(--hm-ink-3)] bg-transparent border-none cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={13} /> 로그아웃
            </button>
          </div>
        </aside>
      )}

      {/* ══ Right Column ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ─ Top Bar (헤더) ─ */}
        <header className={S.header}>
          {/* 사이드바 토글 */}
          <button onClick={() => setSidebarOpen(p => !p)} className={S.iconBtn}>
            <Menu size={16} />
          </button>

          {/* 브레드크럼 */}
          <nav className="flex items-center gap-1 text-[12px] text-[var(--hm-ink-3)]">
            <span>파트너 포털</span>
            <ChevronRight size={12} className="opacity-40" />
            <span>{meta.section}</span>
            <ChevronRight size={12} className="opacity-40" />
            <span className="text-[var(--hm-ink)] font-medium">{meta.label}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* 단체 검색 */}
            <div className="relative hidden md:flex items-center">
              <Search size={12} className="absolute left-2.5 text-[var(--hm-ink-3)] pointer-events-none" />
              <input
                className="pl-7 pr-3 py-[5px] text-[12px] border border-[var(--hm-border)] rounded-[7px] bg-[var(--hm-paper-2)] text-[var(--hm-ink)] placeholder:text-[var(--hm-ink-3)] focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40 transition"
                placeholder="단체명 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              />
              {/* 검색 드롭다운 */}
              {searchFocus && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--hm-paper)] border border-[var(--hm-border)] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--hm-ink-3)] uppercase border-b border-[var(--hm-border)]">
                    관리 단체 ({searchResults.length}건)
                  </div>
                  {searchResults.map((t: any) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => { setSection('tenants'); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hm-paper-2)] text-left cursor-pointer border-none bg-transparent transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--hm-paper-2)] flex items-center justify-center shrink-0 text-[12px]">
                        {t.type === 'protestant' ? '⛪' : t.type === 'catholic' ? '✝️' : '🛷'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-[var(--hm-ink)] truncate">{t.name}</div>
                        <div className="text-[10px] text-[var(--hm-ink-3)] font-mono">{t.slug}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchFocus && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-[var(--hm-paper)] border border-[var(--hm-border)] rounded-xl shadow-xl z-50 px-4 py-3 text-[11.5px] text-[var(--hm-ink-3)]">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>

            {/* 알림 벨 */}
            <div className="relative">
              <button className="w-8 h-8 flex items-center justify-center rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper)] cursor-pointer hover:bg-[var(--hm-paper-2)] transition-colors">
                <Bell size={14} className="text-[var(--hm-ink-3)]" />
              </button>
            </div>

            {/* 파트너 프로필 (헤더 우측) */}
            <div className="flex items-center gap-2 pl-2.5 border-l border-[var(--hm-border)]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0 ${
                isAgency ? 'bg-purple-600' : 'bg-amber-500'
              }`}>
                {partner.name?.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-[12px] font-medium text-[var(--hm-ink)] leading-none">{partner.name}</div>
                <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">
                  {isAgency ? '영업 대리점' : '영업자'} · {partner.referralCode}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ─ 페이지 콘텐츠 ─ */}
        <main className="flex-1 overflow-y-auto">
          {section === 'home' && (
            <PartnerHomeSection
              partner={partner}
              myTenants={myTenants}
              commissions={commissions}
              setSection={setSection}
            />
          )}

          {section === 'tenants' && (
            <PartnerTenantsSection
              partner={partner}
              myTenants={myTenants}
              subAgents={subAgents}
            />
          )}

          {section === 'commissions' && (
            <PartnerCommissionsSection commissions={commissions} isAgency={isAgency} />
          )}

          {section === 'agents' && isAgency && (
            <PartnerAgentsSection
              partner={partner}
              subAgents={subAgents}
              agentRates={agentRates}
              setAgentRates={setAgentRates}
              editAgencyRate={editAgencyRate}
              savingAgentId={savingAgentId}
              setSavingAgentId={setSavingAgentId}
              selectedAgent={selectedAgent}
              setSelectedAgent={setSelectedAgent}
              tenants={tenants}
            />
          )}

          {section === 'myinfo' && (
            <PartnerMyInfoSection
              partner={partner}
              editPhone={editPhone}
              setEditPhone={setEditPhone}
              editEmail={editEmail}
              setEditEmail={setEditEmail}
              editBank={editBank}
              setEditBank={setEditBank}
              editAccount={editAccount}
              setEditAccount={setEditAccount}
              editHolder={editHolder}
              setEditHolder={setEditHolder}
              editAgencyRate={editAgencyRate}
              setEditAgencyRate={setEditAgencyRate}
              subAgents={subAgents}
              setAgentRates={setAgentRates}
            />
          )}
        </main>
      </div>
    </div>
  );
}
