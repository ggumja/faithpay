import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';

import {
  LayoutDashboard, Building2, TrendingUp, Users, UserCircle,
  LogOut, Bell, Search, Menu, ChevronRight, ExternalLink, Briefcase, Plus,
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
  { key: 'home',        icon: LayoutDashboard, label: '대시보드',        section: '현황 요약'                },
  { key: 'tenants',     icon: Building2,       label: '단체 관리',        section: '관리 단체 목록'           },
  { key: 'commissions', icon: TrendingUp,       label: '정산(추정) 관리',  section: '수수료 및 정산(추정) 내역' },
  { key: 'agents',      icon: Users,            label: '영업자 관리',      section: '소속 영업자 관리'         },
  { key: 'myinfo',      icon: UserCircle,       label: '내 정보 수정',     section: '계좌 · 연락처'            },
];

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

  /* ── 데이터 로드 (BUG-J: navigate를 deps에 포함하기 위해 useCallback으로 추출) ── */
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // 세션 파트너 정보 읽기 (로그인 세션)
      const raw = sessionStorage.getItem('soulpay_partner_session') || sessionStorage.getItem('faithpay_partner_session');
      if (!raw) {
        navigate('/partner/login');
        return;
      }
      let sessionPartner: Partial<Partner> = {};
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) sessionPartner = parsed;
      } catch {}

      if (!sessionPartner.id) {
        navigate('/partner/login');
        return;
      }

      const sessionPartnerId = sessionPartner.id!;

      // 1. 파트너 본인 정보 DB 조회
      let currentPartner: Partner | null = null;
      try {
        const res = await partnerAPI.getById(sessionPartnerId);
        if (res.success && res.data) {
          currentPartner = res.data;
        }
      } catch {}

      if (!currentPartner) {
        // 백업: getAll에서 세션 ID와 매칭되는 항목 탐색
        try {
          const allRes = await partnerAPI.getAll();
          if (allRes.success && Array.isArray(allRes.data) && allRes.data.length > 0) {
            const matched = allRes.data.find(p => p.id === sessionPartnerId || p.email === sessionPartner.email);
            if (matched) currentPartner = matched;
          }
        } catch {}
      }

      // DB에서도 찾지 못하면 로그인 redirect
      if (!currentPartner) {
        toast.error('파트너 정보를 불러오지 못했습니다. 다시 로그인해 주세요.');
        sessionStorage.removeItem('faithpay_partner_session');
        navigate('/partner/login');
        return;
      }

      // 세션의 역할 정보 유지
      if (sessionPartner.role) {
        currentPartner.role = sessionPartner.role as any;
      }

      setPartner(currentPartner);
      setEditPhone(currentPartner.phone ?? '');
      setEditEmail(currentPartner.email ?? '');
      setEditBank((currentPartner as any).bankName ?? '');
      setEditAccount((currentPartner as any).accountNumber ?? '');
      setEditHolder((currentPartner as any).accountHolder ?? '');

      const activeRate = currentPartner.agencyRate ?? 0.5;
      setEditAgencyRate(activeRate);

      // 2. 소속 영업자 DB 조회
      let fetchedSubAgents: Partner[] = [];
      try {
        const ar = await partnerAPI.getByParent(currentPartner.id);
        if (ar.success && Array.isArray(ar.data)) {
          fetchedSubAgents = ar.data;
        }
      } catch {}
      setSubAgents(fetchedSubAgents);

      const rates: Record<string, number> = {};
      fetchedSubAgents.forEach(a => {
        rates[a.id] = (a as any).agencyRate ?? (a as any).commissionRate ?? activeRate;
      });
      setAgentRates(rates);

      // 3. 관할 가맹점(단체) DB 조회
      try {
        const tr = await partnerAPI.getPartnerTenants(currentPartner.id);
        if (tr.success && Array.isArray(tr.data)) {
          setMyTenants(tr.data);
        } else {
          setMyTenants([]);
        }
      } catch {
        setMyTenants([]);
      }

      // 4. 수수료 원장 DB 조회
      try {
        const cr = await partnerAPI.getCommissions(currentPartner.id);
        if (cr.success && Array.isArray(cr.data)) {
          setCommissions(cr.data);
        } else {
          setCommissions([]);
        }
      } catch {
        setCommissions([]);
      }
    } catch (err) {
      console.error('Failed to load partner dashboard:', err);
      toast.error('포털 로딩 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]); // BUG-J: navigate deps 추가

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  /* ── 로딩 / 인증 가드 ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">파트너 포털 로딩 중...</p>
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
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

      {/* ══ Sidebar ══════════════════════════════════ */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200/80 h-screen sticky top-0 p-6 z-20 font-sans">

          {/* 로고 & 서브타이틀 */}
          <div className="mb-6">
            <a href="/partner/dashboard" className="inline-block">
              <img
                src="/images/logo_soulpay.png"
                alt="SoulPay"
                style={{ height: 28, width: 'auto', objectFit: 'contain' }}
              />
            </a>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isAgency ? '마스터 대리점 포털' : '영업 파트너 포털'}
            </p>
          </div>

          {/* 파트너 프로필 카드 (AdminSidebar 스타일) */}
          <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
            
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 min-w-0">
                  <Briefcase className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{partner.referralCode}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 bg-white text-blue-700 text-[11px] font-bold rounded-full border border-blue-200 shadow-2xs whitespace-nowrap shrink-0">
                  {isAgency ? '대리점' : '영업자'}
                </span>
              </div>
              <p className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                {partner.name}
              </p>
            </div>
          </div>

          {/* 메인 내비게이션 */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-2 pt-1">
              영업 포털 메뉴
            </p>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = section === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer border-none text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <Icon className={`h-4 w-4 mr-2.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.key === 'commissions' && commissions.length > 0 && (
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 leading-none shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {commissions.length}
                    </span>
                  )}
                  {item.key === 'agents' && subAgents.length > 0 && (
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 leading-none shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {subAgents.length}명
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 사이드바 하단 액션 */}
          <div className="pt-4 border-t border-slate-200/80 space-y-1.5 mt-auto">
            <button
              onClick={() => navigate('/partner/tenants/new')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              <span className="truncate">신규 가맹점 개설</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('soulpay_partner_session');
                sessionStorage.removeItem('faithpay_partner_session');
                localStorage.removeItem('soulpay_partner_last_activity');
                toast.success('파트너 포털에서 로그아웃 되었습니다.');
                navigate('/partner/login');
              }}
              className="w-full flex items-center justify-start px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-none bg-transparent"
            >
              <LogOut className="h-4 w-4 mr-2.5 text-rose-500" />
              로그아웃
            </button>
          </div>
        </aside>
      )}

      {/* ══ Right Column ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ─ Top Bar (헤더) ─ */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center px-6 gap-3 shrink-0">
          {/* 사이드바 토글 */}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer border-none bg-transparent"
          >
            <Menu size={18} />
          </button>

          {/* 브레드크럼 */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">파트너 포털</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span>{meta.section}</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-blue-600 font-bold">{meta.label}</span>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* 단체 검색 */}
            <div className="relative hidden md:flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 w-44 transition"
                placeholder="단체명 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              />
              {/* 검색 드롭다운 */}
              {searchFocus && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                    관리 단체 ({searchResults.length}건)
                  </div>
                  {searchResults.map((t: any) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => { setSection('tenants'); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 text-left cursor-pointer border-none bg-transparent transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">
                        {t.type === 'protestant' ? '⛪' : t.type === 'catholic' ? '✝️' : '🛷'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.slug}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchFocus && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 px-4 py-3 text-xs text-slate-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>

            {/* 신규 가맹 등록 바로가기 버튼 */}
            <button
              onClick={() => navigate('/partner/tenants/new')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer border-none transition-all active:scale-[0.98]"
            >
              <Plus size={14} /> 가맹점 신규 개설
            </button>

            {/* 파트너 프로필 (헤더 우측) */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-blue-600 shadow-2xs shrink-0">
                {partner.name?.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-none">{partner.name}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  {isAgency ? '마스터 대리점' : '영업 에이전트'} · {partner.referralCode}
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
            <PartnerCommissionsSection commissions={commissions} isAgency={isAgency} partner={partner!} myTenants={myTenants} />
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
              commissions={commissions}
              onAgentRegistered={loadDashboard}
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
