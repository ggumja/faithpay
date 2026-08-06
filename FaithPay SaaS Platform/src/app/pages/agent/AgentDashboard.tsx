/* Hallmark · shell: N3 Side-rail · genre: modern-minimal · theme: Amber (영업자) */
/* AgentDashboard — 세션 기반 동적 로딩, 하드코딩 제거 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import {
  LayoutDashboard, Building2, TrendingUp, UserCircle,
  LogOut, Bell, Search, Menu, ChevronRight,
} from 'lucide-react';
import { Partner, PartnerCommission, partnerAPI } from '../../api/client';
import { toast } from 'sonner';

import { PartnerHomeSection }        from '../partner/components/PartnerHomeSection';
import { PartnerTenantsSection }     from '../partner/components/PartnerTenantsSection';
import { PartnerCommissionsSection } from '../partner/components/PartnerCommissionsSection';
import { PartnerMyInfoSection }      from '../partner/components/PartnerMyInfoSection';

type Section = 'home' | 'tenants' | 'commissions' | 'myinfo';

const NAV: { key: Section; icon: any; label: string; section: string }[] = [
  { key: 'home',        icon: LayoutDashboard, label: '대시보드',   section: '현황 요약'        },
  { key: 'tenants',     icon: Building2,       label: '단체 관리',   section: '내 관할 단체 목록' },
  { key: 'commissions', icon: TrendingUp,       label: '정산 관리', section: '수수료 확인 및 정산 내역'  },
  { key: 'myinfo',      icon: UserCircle,       label: '내 정보 수정', section: '정산 계좌 · 연락처' },
];

/* ── style tokens (N3 Side-rail, Amber accent) ── */
const S = {
  shell:    'flex h-screen overflow-hidden bg-[var(--hm-paper-2)]',
  sidebar:  'w-52 shrink-0 flex flex-col bg-[var(--hm-paper)] border-r border-[var(--hm-border)] h-screen',
  brand:    'flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--hm-border)]',
  brandDot: 'w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 text-white text-[11px] font-bold',
  nav:      'flex-1 overflow-y-auto py-2 px-2 space-y-0.5',
  navSec:   'text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--hm-ink-3)] px-2.5 pt-3 pb-0.5',
  navItem:  (on: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] text-[12.5px] cursor-pointer border-none transition-colors text-left
     ${on ? 'bg-amber-500 text-white font-medium' : 'bg-transparent text-[var(--hm-ink-2)] hover:bg-[var(--hm-paper-2)] hover:text-[var(--hm-ink)]'}`,
  sidefoot: 'px-2 py-2.5 border-t border-[var(--hm-border)]',
  header:   'h-[50px] bg-[var(--hm-paper)] border-b border-[var(--hm-border)] flex items-center px-5 gap-3 shrink-0',
  iconBtn:  'p-1.5 rounded-md text-[var(--hm-ink-3)] hover:bg-[var(--hm-paper-2)] transition-colors cursor-pointer border-none bg-transparent',
};

const navMeta = Object.fromEntries(NAV.map(n => [n.key, n]));

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { tenants } = useApp();

  const [partner,     setPartner]     = useState<Partner | null>(null);
  const [myTenants,   setMyTenants]   = useState<any[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [section,     setSection]     = useState<Section>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);

  const [editPhone,   setEditPhone]   = useState('');
  const [editEmail,   setEditEmail]   = useState('');
  const [editBank,    setEditBank]    = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [editHolder,  setEditHolder]  = useState('');

  const searchResults = searchQuery.trim().length >= 1
    ? myTenants.filter(t => (t.name ?? '').includes(searchQuery) || (t.slug ?? '').includes(searchQuery)).slice(0, 6)
    : [];

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        /* ── 세션에서 영업자 정보 읽기 (하드코딩 없음) ── */
        const sessionRaw = localStorage.getItem('faithpay_partner_session');
        if (!sessionRaw) {
          navigate('/partner/login');
          return;
        }
        let sessionUser: any = {};
        try { sessionUser = JSON.parse(sessionRaw); } catch {}

        /* 세션 필수값 미존재 시 로그인 redirect */
        if (!sessionUser.id || sessionUser.role !== 'sales_agent') {
          navigate('/partner/login');
          return;
        }

        const activePartner: Partner = {
          id:            sessionUser.id,
          name:          sessionUser.name,
          email:         sessionUser.email,
          phone:         sessionUser.phone || '',
          role:          'sales_agent',
          parentId:      sessionUser.parentId,
          commissionRate:sessionUser.agencyRate ?? 0,
          agencyRate:    sessionUser.agencyRate ?? 0,
          referralCode:  sessionUser.referralCode || '',
          bankName:      sessionUser.bankName || '',
          accountNumber: sessionUser.accountNumber || '',
          accountHolder: sessionUser.accountHolder || '',
          status:        'active',
          createdAt:     new Date().toISOString(),
        };

        setPartner(activePartner);
        setEditPhone(activePartner.phone ?? '');
        setEditEmail(activePartner.email ?? '');
        setEditBank((activePartner as any).bankName ?? '');
        setEditAccount((activePartner as any).accountNumber ?? '');
        setEditHolder((activePartner as any).accountHolder ?? '');

        /* ── 관할 단체 필터링 ── */
        const sourceTenants = (tenants && tenants.length > 0) ? tenants : mockTenants;
        const agentKeys = [activePartner.id, activePartner.referralCode].filter(Boolean);
        setMyTenants(sourceTenants.filter(t =>
          agentKeys.includes((t as any).registeredByPartnerId) ||
          agentKeys.includes((t as any).registeredByReferralCode) ||
          agentKeys.includes((t as any).referralCode)
        ));

        /* ── 백그라운드 API 동기화 ── */
        try {
          const res = await partnerAPI.getAll();
          if (res.success && Array.isArray(res.data)) {
            const found = res.data.find(x =>
              x.id === activePartner.id || x.email === activePartner.email
            );
            if (found) setPartner(prev => ({ ...prev!, ...found }));
          }
        } catch {}
        try {
          const cr = await partnerAPI.getCommissions(activePartner.id);
          if (cr.success && cr.data) setCommissions(cr.data);
        } catch {}
      } catch (err) {
        console.error('AgentDashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenants, navigate]);

  /* ── 로딩 ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--hm-paper-2)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--hm-ink-3)] font-semibold">영업자 포털 로딩 중...</p>
        </div>
      </div>
    );
  }
  if (!partner) return null;

  const meta = navMeta[section] ?? navMeta.home;

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
              <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">영업자 포털</div>
            </div>
          </div>

          {/* 영업자 프로필 미니 카드 */}
          <div className="mx-2 mt-2 mb-1 px-3 py-2.5 rounded-[8px] bg-[var(--hm-paper-2)] border border-[var(--hm-border)] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 bg-amber-100 text-amber-700 border border-amber-200">
              {partner.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-bold text-[var(--hm-ink)] truncate leading-none">{partner.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0 rounded-full bg-amber-500 text-white">
                  영업자
                </span>
                <span className="text-[10px] text-[var(--hm-ink-3)] font-mono">{partner.referralCode}</span>
              </div>
            </div>
          </div>

          {/* 내비게이션 */}
          <nav className={S.nav}>
            <p className={S.navSec}>영업 포털</p>
            {NAV.map(item => {
              const Icon = item.icon;
              const on = section === item.key;
              return (
                <button key={item.key} onClick={() => setSection(item.key)} className={S.navItem(on)}>
                  <Icon size={13} className={on ? 'text-white' : 'text-[var(--hm-ink-3)]'} />
                  <span>{item.label}</span>
                  {item.key === 'commissions' && commissions.length > 0 && (
                    <span className={`ml-auto text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                      on ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                    }`}>{commissions.length}</span>
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
                toast.success('로그아웃되었습니다.');
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

        {/* Top Bar */}
        <header className={S.header}>
          <button onClick={() => setSidebarOpen(p => !p)} className={S.iconBtn}>
            <Menu size={16} />
          </button>

          {/* 브레드크럼 */}
          <nav className="flex items-center gap-1 text-[12px] text-[var(--hm-ink-3)]">
            <span>영업자 포털</span>
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
                className="pl-7 pr-3 py-[5px] text-[12px] border border-[var(--hm-border)] rounded-[7px] bg-[var(--hm-paper-2)] text-[var(--hm-ink)] placeholder:text-[var(--hm-ink-3)] focus:outline-none focus:ring-1 focus:ring-amber-500 w-40 transition"
                placeholder="단체명 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              />
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hm-paper-2)] text-left cursor-pointer border-none bg-transparent"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--hm-paper-2)] flex items-center justify-center text-[12px]">
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
            </div>

            {/* 알림 벨 */}
            <div className="relative">
              <button className="w-8 h-8 flex items-center justify-center rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper)] cursor-pointer hover:bg-[var(--hm-paper-2)]">
                <Bell size={14} className="text-[var(--hm-ink-3)]" />
              </button>
            </div>

            {/* 프로필 */}
            <div className="flex items-center gap-2 pl-2.5 border-l border-[var(--hm-border)]">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                {partner.name?.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-[12px] font-medium text-[var(--hm-ink)] leading-none">{partner.name}</div>
                <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">영업자 · {partner.referralCode}</div>
              </div>
            </div>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">
          {section === 'home' && (
            <PartnerHomeSection
              partner={partner}
              myTenants={myTenants}
              commissions={commissions}
              setSection={(s) => setSection(s === 'agents' ? 'home' : s)}
            />
          )}
          {section === 'tenants' && (
            <PartnerTenantsSection
              partner={partner}
              myTenants={myTenants}
              subAgents={[]}
            />
          )}
          {section === 'commissions' && (
            <PartnerCommissionsSection commissions={commissions} isAgency={false} partner={partner} />
          )}
          {section === 'myinfo' && (
            <PartnerMyInfoSection
              partner={partner}
              editPhone={editPhone}     setEditPhone={setEditPhone}
              editEmail={editEmail}     setEditEmail={setEditEmail}
              editBank={editBank}       setEditBank={setEditBank}
              editAccount={editAccount} setEditAccount={setEditAccount}
              editHolder={editHolder}   setEditHolder={setEditHolder}
              editAgencyRate={0}        setEditAgencyRate={() => {}}
              subAgents={[]}            setAgentRates={() => {}}
            />
          )}
        </main>
      </div>
    </div>
  );
}
