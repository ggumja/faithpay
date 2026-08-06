/* Hallmark · shell: N3 Side-rail (persistent) · genre: modern-minimal · theme: Cobalt */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useApp } from '../../context/AppContext';

import {
  Building2, LogOut, BarChart3, Briefcase, TrendingUp,
  Megaphone, Bell, Search, Menu, ChevronRight, ChevronDown, Clock, Settings, BookOpen, Landmark, Coins,
} from 'lucide-react';

import { toast } from 'sonner';
import GlobalBroadcastModal from '../../components/GlobalBroadcastModal';
import { tenantAPI } from '../../api/client';

/* ─── active key ─────────────────────────────── */
function useActiveKey(pathname: string) {
  if (pathname.match(/\/tenants\/pending\/.+/)) return 'pendingDetail';
  if (pathname.includes('/tenants/pending')) return 'pending';
  if (pathname.includes('/settlement-center')) return 'settlementCenter';
  if (pathname.includes('/stats'))           return 'stats';
  if (pathname.match(/\/partners\/.+/))      return 'partnerDetail';
  if (pathname.includes('/partners'))        return 'partners';
  if (pathname.includes('/commissions'))     return 'commissions';
  if (pathname.includes('/ledger'))          return 'ledger';
  if (pathname.includes('/settings'))        return 'settings';
  if (pathname.match(/\/tenant\/[^/]+/))     return 'tenantDetail';
  return 'tenants';
}


const META: Record<string, { title: string; section: string }> = {
  tenants:          { title: '단체 목록',           section: '단체 목록 관리' },
  pending:          { title: '승인요청 목록',        section: '단체 목록 관리' },
  pendingDetail:    { title: '입점 신청 상세 심사',  section: '단체 목록 관리' },
  tenantDetail:     { title: '단체 상세 정보',       section: '단체 목록 관리' },
  settlementCenter: { title: '정산 관리 센터',       section: '정산 관리 Center' },
  stats:            { title: '단체별 통계',          section: '통계 분석'      },
  commissions:      { title: '수수료 통계',          section: '통계 분석'      },
  ledger:           { title: '거래이력 (거래원장)',    section: '통계 분석'      },
  partners:         { title: '영업 파트너 관리',     section: '파트너 관리'    },
  partnerDetail:    { title: '영업 파트너 상세 정보', section: '파트너 관리'    },
  settings:         { title: '설정',                 section: '시스템 설정'    },
};

/* ─── style constants (token-ref only) ───────── */
const S = {
  shell:      'flex h-screen overflow-hidden bg-[var(--hm-paper-2)]',
  sidebar:    'w-52 shrink-0 flex flex-col bg-[var(--hm-paper)] border-r border-[var(--hm-border)] h-screen',
  brand:      'flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--hm-border)]',
  brandDot:   'w-7 h-7 rounded-lg bg-[var(--hm-accent)] flex items-center justify-center shrink-0 text-white text-[11px] font-bold',
  nav:        'flex-1 overflow-y-auto py-2 px-2 space-y-3',
  navSection: 'text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--hm-ink-3)] px-2.5 pt-2 pb-0.5',
  navParent:  (on: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] text-[12.5px] cursor-pointer border-none transition-colors text-left
     ${on ? 'bg-[var(--hm-accent-bg)] text-[var(--hm-accent)] font-medium' : 'bg-transparent text-[var(--hm-ink-2)] hover:bg-[var(--hm-paper-2)] hover:text-[var(--hm-ink)]'}`,
  navItem:    (on: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] text-[12.5px] cursor-pointer border-none transition-colors text-left
     ${on ? 'bg-[var(--hm-accent)] text-white font-medium' : 'bg-transparent text-[var(--hm-ink-2)] hover:bg-[var(--hm-accent-bg)] hover:text-[var(--hm-ink)]'}`,
  subItem:    (on: boolean) =>
    `w-full flex items-center gap-2 pl-7 pr-2.5 py-[6px] rounded-[6px] text-[12px] cursor-pointer border-none transition-colors text-left
     ${on ? 'bg-[var(--hm-accent-bg)] text-[var(--hm-accent)] font-medium' : 'bg-transparent text-[var(--hm-ink-3)] hover:bg-[var(--hm-paper-2)] hover:text-[var(--hm-ink-2)]'}`,
  sidefoot:   'px-2 py-2.5 border-t border-[var(--hm-border)]',
  header:     'h-[50px] bg-[var(--hm-paper)] border-b border-[var(--hm-border)] flex items-center px-5 gap-3 shrink-0',
  iconBtn:    'p-1.5 rounded-md text-[var(--hm-ink-3)] hover:bg-[var(--hm-paper-2)] transition-colors cursor-pointer border-none bg-transparent',
};

export default function SystemAdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenants, currentAdmin, setCurrentAdmin } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tenantsOpen, setTenantsOpen] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);

  // 단체 검색 필터
  const searchResults = searchQuery.trim().length >= 1
    ? tenants.filter(t =>
        t.name.includes(searchQuery) ||
        t.slug.includes(searchQuery) ||
        (t.address ?? '').includes(searchQuery)
      ).slice(0, 6)
    : [];

  const active = useActiveKey(location.pathname);
  const meta   = META[active] ?? META.tenants;

  // 승인 대기 건수 주기적 조회
  useEffect(() => {
    const load = () =>
      tenantAPI.getPending()
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            const validPending = res.data.filter((t: any) => t.id !== 'pending-yonggungsa' && t.slug !== 'yonggungsa');
            setPendingCount(validPending.length);
          }
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000); // 30초마다 갱신
    return () => clearInterval(timer);
  }, []);


  // 단체 관련 페이지일 때 자동 펼침
  useEffect(() => {
    if (['tenants','pending','tenantDetail'].includes(active)) setTenantsOpen(true);
  }, [active]);

  // 인증 체크
  useEffect(() => {
    if (!currentAdmin || currentAdmin.role !== 'system_admin') navigate('/admin/login');
  }, [currentAdmin, navigate]);

  if (!currentAdmin || currentAdmin.role !== 'system_admin') return null;

  return (
    <div className={S.shell}>

      {/* ── N3 Side-rail ──────────────────────── */}
      {sidebarOpen && (
        <aside className={S.sidebar}>
          {/* brand */}
          <div className={S.brand}>
            <div className={S.brandDot}>FP</div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--hm-ink)] leading-none">FaithPay</div>
              <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">관리자 시스템</div>
            </div>
          </div>

          <nav className={S.nav}>

            {/* Overview — 단체 목록 관리 (collapsible) */}
            <div>
              <p className={S.navSection}>Overview</p>
              <button
                onClick={() => setTenantsOpen(p => !p)}
                className={S.navParent(['tenants','pending','tenantDetail'].includes(active))}
              >
                <Building2 size={13} className={['tenants','pending','tenantDetail'].includes(active) ? 'text-[var(--hm-accent)]' : 'text-[var(--hm-ink-3)]'} />
                <span className="flex-1">단체 목록 관리</span>
                {tenantsOpen
                  ? <ChevronDown size={11} className="opacity-50" />
                  : <ChevronRight size={11} className="opacity-50" />}
              </button>

              {tenantsOpen && (
                <div className="mt-0.5 space-y-0.5">
                  <button
                    onClick={() => navigate('/system/admin/tenants')}
                    className={S.subItem(active === 'tenants' || active === 'tenantDetail')}
                  >
                    <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                    단체 목록
                  </button>
                  <button
                    onClick={() => navigate('/system/admin/tenants/pending')}
                    className={S.subItem(active === 'pending' || active === 'pendingDetail')}
                  >
                    <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                    승인요청 목록
                    {pendingCount > 0 && (
                      <span className="ml-auto bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 정산 관리 Center (독립 상위 메뉴 블록) */}
            <div>
              <p className={S.navSection}>정산 관리 Center</p>
              <button
                onClick={() => navigate('/system/admin/settlement-center')}
                className={S.navItem(active === 'settlementCenter')}
              >
                <Landmark size={13} className={active === 'settlementCenter' ? 'text-white' : 'text-blue-600'} />
                <span className="font-bold">🏦 정산 관리 센터</span>
                <span className="ml-auto text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                  v2 API
                </span>
              </button>
            </div>

            {/* 통계 분석 */}
            <div>
              <p className={S.navSection}>통계 분석</p>
              {[
                { key: 'stats',       label: '단체별 통계',    Icon: BarChart3,  path: '/system/admin/stats'       },
                { key: 'commissions', label: '수수료 통계',    Icon: Coins,      path: '/system/admin/commissions' },
                { key: 'ledger',      label: '거래이력 (원장)', Icon: BookOpen,   path: '/system/admin/ledger'      },
              ].map(({ key, label, Icon, path }) => (
                <button key={key} onClick={() => navigate(path)} className={S.navItem(active === key)}>
                  <Icon size={13} className={active === key ? 'text-white' : 'text-[var(--hm-ink-3)]'} />
                  <span>{label}</span>
                </button>
              ))}
            </div>


            {/* 파트너 관리 */}
            <div>
              <p className={S.navSection}>파트너 관리</p>
              <button
                onClick={() => navigate('/system/admin/partners')}
                className={S.navItem(active === 'partners' || active === 'partnerDetail')}
              >
                <Briefcase size={13} className={active === 'partners' || active === 'partnerDetail' ? 'text-white' : 'text-[var(--hm-ink-3)]'} />
                <span>영업 파트너 관리</span>
              </button>
            </div>
          </nav>

          {/* 설정 — nav 영역 하단 고정 */}
          <div className="px-2 pb-1 border-t border-[var(--hm-border)] pt-2">
            <button
              onClick={() => navigate('/system/admin/settings')}
              className={S.navItem(active === 'settings')}
            >
              <Settings size={13} className={active === 'settings' ? 'text-white' : 'text-[var(--hm-ink-3)]'} />
              <span>설정</span>
            </button>
          </div>

          {/* logout */}
          <div className={S.sidefoot}>
            <button
              onClick={() => { setCurrentAdmin(null); toast.success('로그아웃되었습니다'); navigate('/admin/login'); }}
              className="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-[6px] text-[12.5px] text-[var(--hm-ink-3)] bg-transparent border-none cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={13} /> 로그아웃
            </button>
          </div>
        </aside>
      )}

      {/* ── right column ──────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* top bar */}
        <header className={S.header}>
          <button onClick={() => setSidebarOpen(p => !p)} className={S.iconBtn}>
            <Menu size={16} />
          </button>

          <nav className="flex items-center gap-1 text-[12px] text-[var(--hm-ink-3)]">
            <span>관리자</span>
            <ChevronRight size={12} className="opacity-40" />
            <span>{meta.section}</span>
            <ChevronRight size={12} className="opacity-40" />
            <span className="text-[var(--hm-ink)] font-medium">{meta.title}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* search */}
            <div className="relative hidden md:flex items-center">
              <Search size={12} className="absolute left-2.5 text-[var(--hm-ink-3)] pointer-events-none" />
              <input
                className="pl-7 pr-8 py-[5px] text-[12px] border border-[var(--hm-border)] rounded-[7px] bg-[var(--hm-paper-2)] text-[var(--hm-ink)] placeholder:text-[var(--hm-ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--hm-accent)] w-44 transition"
                placeholder="단체명 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              />
              <span className="absolute right-2 text-[10px] text-[var(--hm-ink-3)] font-mono bg-[var(--hm-paper-3)] px-1 rounded">⌘K</span>

              {/* 검색 결과 드롭다운 */}
              {searchFocus && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                    단체 검색 결과 ({searchResults.length}건)
                  </div>
                  {searchResults.map(t => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => { navigate(`/system/admin/tenant/${t.slug}`); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left cursor-pointer border-none bg-transparent transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-[12px]">
                        {t.type === 'protestant' ? '⛪' : t.type === 'catholic' ? '✝️' : '🛷'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-slate-900 dark:text-zinc-100 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.slug}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchFocus && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 px-4 py-3 text-[11.5px] text-slate-400">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>

            <button
              onClick={() => setBroadcastOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper)] text-[11.5px] text-[var(--hm-ink-2)] cursor-pointer hover:bg-[var(--hm-paper-2)] transition-colors"
            >
              <Megaphone size={12} className="text-[var(--hm-ink-3)]" /> 공지
            </button>

            <div className="relative">
              <button className="w-8 h-8 flex items-center justify-center rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper)] cursor-pointer hover:bg-[var(--hm-paper-2)] transition-colors">
                <Bell size={14} className="text-[var(--hm-ink-3)]" />
              </button>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-[14px] min-w-[14px] text-center">
                  {pendingCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2.5 border-l border-[var(--hm-border)]">
              <div className="w-7 h-7 rounded-full bg-[var(--hm-accent)] flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                {(currentAdmin.name ?? 'A')[0]}
              </div>
              <div className="hidden sm:block">
                <div className="text-[12px] font-medium text-[var(--hm-ink)] leading-none">{currentAdmin.name}</div>
                <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">시스템 관리자</div>
              </div>
            </div>
          </div>
        </header>

        {/* page content via Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {broadcastOpen && <GlobalBroadcastModal onClose={() => setBroadcastOpen(false)} />}
    </div>
  );
}
