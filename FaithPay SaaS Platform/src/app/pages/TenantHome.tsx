import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, mockTenants, mockDonationItems, DonationItem } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import { useTenantPWA } from '../hooks/useTenantPWA';
import { InstallBanner } from '../components/pwa/InstallBanner';
import {
  ArrowLeft, MapPin, Phone, Mail, Clock, ChevronRight,
  Shield, Repeat, Landmark, Heart, Search, Star
} from 'lucide-react';

/* ─── Design tokens (Cobalt-01 Light) ─────────────────────────── */
const C = {
  white:        '#ffffff',
  paper:        'oklch(0.985 0.003 250)',
  card:         'oklch(1.00 0.000 0)',
  border:       'oklch(0.12 0.015 260 / 0.08)',
  borderMed:    'oklch(0.12 0.015 260 / 0.14)',
  ink:          'oklch(0.10 0.025 262)',
  ink2:         'oklch(0.30 0.018 260)',
  ink3:         'oklch(0.55 0.012 258)',
  cobalt:       'oklch(0.52 0.22 264)',
  cobaltBg:     'oklch(0.965 0.020 258)',
  cobaltBorder: 'oklch(0.52 0.22 264 / 0.18)',
  shadow:       '0 1px 3px oklch(0.12 0.015 260 / 0.08), 0 1px 2px oklch(0.12 0.015 260 / 0.05)',
  shadowMd:     '0 4px 16px -4px oklch(0.12 0.015 260 / 0.10), 0 2px 6px -2px oklch(0.12 0.015 260 / 0.06)',
};

const itemIcons: Record<string, React.ReactNode> = {
  '십일조':   <Landmark size={18} />,
  '감사헌금': <Heart size={18} />,
  '건축헌금': <Landmark size={18} />,
  '인등보시': <Star size={18} />,
  '불사공양': <Heart size={18} />,
  '기도보시': <Heart size={18} />,
  '교무금':   <Landmark size={18} />,
  '미사예물': <Star size={18} />,
  '특별봉헌': <Heart size={18} />,
};

function fmt(n: number) { return n.toLocaleString('ko-KR'); }

/* ─── Responsive CSS ───────────────────────────────────────────── */
const RESPONSIVE_CSS = `
/* TenantHome responsive layout */

/* Base (mobile-first) */
.th-body         { display: flex; flex-direction: column; gap: 20px; padding: 24px 16px 64px; max-width: 1100px; margin: 0 auto; }
.th-hero-grid    { display: flex; flex-direction: column; gap: 20px; }
.th-hero-stats   { display: flex; flex-direction: row; gap: 10px; overflow-x: auto; padding-bottom: 2px; }
.th-hero-stat    { flex: 0 0 auto; min-width: 130px; }
.th-nav-center   { display: none; }
.th-nav-left     { display: none; }
.th-controls     { flex-direction: column; gap: 10px; }
.th-search-wrap  { width: 100%; }
.th-search-wrap input { width: 100%; }
.th-tabs         { width: 100%; }
.th-tabs button  { flex: 1; }
.th-sidebar      { display: flex; flex-direction: column; gap: 14px; }
.th-trust-badges { display: none; }
.th-hero-copy    { max-width: 100%; }
.th-hero-cta     { flex-wrap: wrap; }
.th-row-grid     { grid-template-columns: 36px 1fr auto; gap: 12px; padding: 14px 14px; }
.th-row-desc     { display: none; }
.th-row-icon     { width: 36px; height: 36px; border-radius: 9px; }

/* sm: 480px+ */
@media (min-width: 480px) {
  .th-body         { padding: 28px 20px 72px; }
  .th-nav-left     { display: flex; }
  .th-row-grid     { grid-template-columns: 42px 1fr auto; gap: 14px; padding: 16px 16px; }
  .th-row-desc     { display: block; }
  .th-row-icon     { width: 42px; height: 42px; border-radius: 11px; }
  .th-trust-badges { display: flex; }
}

/* md: 720px+ */
@media (min-width: 720px) {
  .th-body         { padding: 36px 24px 80px; }
  .th-nav-center   { display: flex; }
  .th-hero-grid    { flex-direction: row; align-items: center; justify-content: space-between; gap: 32px; }
  .th-hero-stats   { flex-direction: column; overflow-x: visible; gap: 10px; min-width: 160px; }
  .th-hero-stat    { min-width: unset; }
  .th-controls     { flex-direction: row; }
  .th-search-wrap  { width: auto; }
  .th-search-wrap input { width: 200px; }
  .th-tabs         { width: auto; }
  .th-tabs button  { flex: unset; }
  .th-row-grid     { grid-template-columns: 44px 1fr auto; gap: 16px; padding: 18px 20px; }
  .th-row-icon     { width: 44px; height: 44px; border-radius: 12px; }
}

/* lg: 1024px+ */
@media (min-width: 1024px) {
  .th-body         { display: grid; grid-template-columns: 1fr 300px; gap: 28px; align-items: start; padding: 40px 24px 80px; }
  .th-sidebar      { position: sticky; top: 72px; }
}

/* Hero motion */
@keyframes th-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.th-animate { animation: th-fade-up 0.5s cubic-bezier(0.4,0,0.2,1) both; }
.th-delay-1 { animation-delay: 80ms; }
.th-delay-2 { animation-delay: 180ms; }
.th-delay-3 { animation-delay: 260ms; }

/* Spin */
@keyframes th-spin { to { transform: rotate(360deg); } }
.th-spin { animation: th-spin 0.8s linear infinite; }

/* Nav compact on mobile */
@media (max-width: 479px) {
  .th-nav-admin-label { display: none; }
}
`;

export default function TenantHome() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, getTenantDonationItems } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recurring' | 'onetime'>('all');
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  // PWA 멀티 테넌트 훅 — 테넌트별 동적 manifest 주입 + 설치 프롬프트 관리
  const { canInstall, install } = useTenantPWA(currentTenant);

  // 히어로 배경 배너 슬라이더 상태
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const banners = currentTenant?.bannerImages || [];
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentTenant]);

  useEffect(() => {
    const t = mockTenants.find(t => t.slug === tenantSlug);
    if (t) setCurrentTenant(t);
  }, [tenantSlug, setCurrentTenant]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!currentTenant) {
    return (
      <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{RESPONSIVE_CSS}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="th-spin" style={{ width: 28, height: 28, border: `3px solid ${C.cobaltBg}`, borderTopColor: C.cobalt, borderRadius: '50%' }} />
          <span style={{ fontSize: 13, color: C.ink3, fontFamily: "'JetBrains Mono', monospace" }}>loading...</span>
        </div>
      </div>
    );
  }

  const ft = FAITH_THEMES[currentTenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;
  const allItems: DonationItem[] = getTenantDonationItems(currentTenant);

  const filtered = allItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'recurring' && item.allowRecurring) ||
      (activeTab === 'onetime' && item.allowOneTime && !item.allowRecurring);
    return matchSearch && matchTab && item.enabled;
  });

  const scheduleLabel =
    currentTenant.religionType === 'protestant' ? '예배 시간' :
    currentTenant.religionType === 'buddhist'   ? '법회 시간' : '미사 시간';


  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{RESPONSIVE_CSS}</style>

      {/* ── Sticky Nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        boxShadow: heroVisible ? 'none' : C.shadow,
        transition: 'box-shadow 200ms ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: ft.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Motif kind={ft.motif} size={14} color={ft.primary} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: C.ink }}>{currentTenant.name}</div>
            <div style={{ fontSize: 10, color: C.ink3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em' }}>{ft.name}</div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => navigate(`/${currentTenant.slug}/my-donations`)}
            style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, color: C.ink2, fontFamily: 'inherit', fontWeight: 500, padding: '5px 10px', borderRadius: 6, transition: 'all 150ms', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.cobaltBorder; e.currentTarget.style.color = C.cobalt; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.ink2; }}
          >
            내 {currentTenant.terminology.donation} 내역
          </button>
          <button
            onClick={() => navigate(`/${currentTenant.slug}/admin/login`)}
            style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, color: C.ink3, fontFamily: 'inherit', fontWeight: 500, padding: '5px 10px', borderRadius: 6, transition: 'all 150ms', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.cobaltBorder; e.currentTarget.style.color = C.cobalt; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.ink3; }}
          >
            <span className="th-nav-admin-label">관리자 </span>로그인
          </button>
          <button
            className="hm-btn-primary"
            onClick={() => {
              const items = getTenantDonationItems(currentTenant);
              const firstItem = items && items.length > 0 ? items[0] : undefined;
              navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
            }}
            style={{ height: 34, padding: '0 14px', fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }}
          >{currentTenant.terminology.donation}하기</button>
        </div>
        </div>

        {/* PWA 설치 배너 — beforeinstallprompt 발생 시 자동 표시 */}
        {canInstall && (
          <InstallBanner
            tenant={currentTenant}
            onInstall={install}
            primaryColor={ft.primary}
          />
        )}
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} style={{ position: 'relative', overflow: 'hidden', background: ft.heroGradient, minHeight: 380 }}>
        {/* Background Banner Slider */}
        {currentTenant.bannerImages && currentTenant.bannerImages.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {currentTenant.bannerImages.map((bannerUrl, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: idx === bannerIndex ? 1 : 0,
                  transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundImage: `url(${bannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
            {/* Lighter overlay for brighter banner image while maintaining high text contrast */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.38) 100%)',
            }} />
          </div>
        )}

        {/* Background motif */}
        <div style={{ position: 'absolute', right: -40, top: -20, width: '40%', height: '130%', opacity: 0.12, pointerEvents: 'none', zIndex: 1 }}>
          <MotifLarge kind={ft.motif} color="white" opacity={1} />
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(44px, 7vw, 76px) clamp(16px, 4vw, 24px) clamp(40px, 5vw, 64px)', position: 'relative', zIndex: 2 }}>
          <div className="th-hero-grid">
            {/* Left copy */}
            <div className="th-animate th-hero-copy">
              {/* Greeting badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0, 0, 0, 0.40)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: 6, padding: '4px 12px', marginBottom: 18, backdropFilter: 'blur(8px)' }}>
                <Motif kind={ft.motif} size={11} color="white" />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'white', letterSpacing: '0.04em' }}>{ft.greeting}</span>
              </div>

              <h1 style={{ fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 14, textShadow: '0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.8)' }}>
                {currentTenant.name}
              </h1>
              <p style={{ fontSize: 'clamp(14px, 2vw, 16.5px)', color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.7, maxWidth: 640, marginBottom: 28, fontWeight: 400, textShadow: '0 2px 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.8)' }}>
                {currentTenant.description}
              </p>

              {/* CTA buttons */}
              <div className="th-hero-cta" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 22 }}>
                <button
                  onClick={() => {
                    const items = getTenantDonationItems(currentTenant);
                    const firstItem = items && items.length > 0 ? items[0] : undefined;
                    navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
                  }}
                  style={{ height: 46, padding: '0 22px', background: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, color: ft.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px oklch(0 0 0 / 0.25)', transition: 'transform 150ms, box-shadow 150ms', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px oklch(0 0 0 / 0.30)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px oklch(0 0 0 / 0.25)'; }}
                >
                  <Motif kind={ft.motif} size={14} color={ft.primary} />
                  {currentTenant.terminology.donation}하기
                </button>
                <button
                  onClick={() => { document.getElementById('items-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ height: 46, padding: '0 20px', background: 'oklch(1 0 0 / 0.15)', border: '1px solid oklch(1 0 0 / 0.25)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'background 150ms', whiteSpace: 'nowrap', backdropFilter: 'blur(8px)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'oklch(1 0 0 / 0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'oklch(1 0 0 / 0.15)')}
                >
                  항목 보기 <ChevronRight size={14} />
                </button>
              </div>

              {/* Trust badges */}
              <div className="th-trust-badges" style={{ gap: 16, flexWrap: 'wrap' }}>
                {[['ISMS-P', '정보보호 인증'], ['PCI-DSS', '결제 보안'], ['SSL', '256-bit']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Shield size={11} color="oklch(1 0 0 / 0.70)" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'oklch(1 0 0 / 0.80)', letterSpacing: '0.03em' }}>{k}</span>
                    <span style={{ fontSize: 10, color: 'oklch(1 0 0 / 0.55)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Banner Carousel Indicator Dots inside Hero */}
          {currentTenant.bannerImages && currentTenant.bannerImages.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'center',
              marginTop: 24,
            }}>
              {currentTenant.bannerImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIndex(i)}
                  aria-label={`${i + 1}번 배너 선택`}
                  style={{
                    width: i === bannerIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === bannerIndex ? 'white' : 'rgba(255, 255, 255, 0.4)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 250ms ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 하단에 노출되던 기존 캐러셀 삭제 */}

      {/* ── Body (responsive grid) ── */}
      <div className="th-body">

        {/* ── Main: Donation Items ── */}
        <main id="items-section">
          {/* Controls */}
          <div className="th-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            {/* Tabs */}
            <div className="th-tabs" style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
              {([
                { key: 'all',      label: '전체' },
                { key: 'recurring', label: '정기' },
                { key: 'onetime',  label: '일회성' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ height: 30, padding: '0 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 150ms',
                    background: activeTab === tab.key ? C.cobalt : 'transparent',
                    color:      activeTab === tab.key ? 'white'  : C.ink3,
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* Search */}
            <div className="th-search-wrap" style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.ink3, pointerEvents: 'none' }} />
              <input
                type="text" placeholder="항목 검색…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ height: 34, paddingLeft: 30, paddingRight: 12, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: C.ink, background: C.card, outline: 'none', width: '100%', transition: 'border-color 150ms', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = C.cobalt)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
              />
            </div>
          </div>

          {/* Section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>
              {currentTenant.terminology.donation} 항목
            </h2>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.ink3, background: C.paper, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 4 }}>{filtered.length}</span>
          </div>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((item, i) => (
              <DonationItemRow
                key={item.id}
                item={item}
                ft={ft}
                terminology={currentTenant.terminology.donation}
                icon={itemIcons[item.name]}
                delay={Math.min(i + 1, 3)}
                onClick={() => navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: item } })}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: 14, color: C.ink3 }}>검색 결과가 없습니다</p>
            </div>
          )}
        </main>
        {/* ── Sidebar ── */}
        <aside className="th-sidebar">
          {/* Quick donate CTA */}
          <div style={{ background: ft.heroGradient, borderRadius: 14, padding: '22px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, opacity: 0.10, pointerEvents: 'none' }}>
              <MotifLarge kind={ft.motif} color="white" opacity={1} />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'oklch(1 0 0 / 0.55)', letterSpacing: '0.05em', marginBottom: 6 }}>온라인 {currentTenant.terminology.donation}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1.4, marginBottom: 14 }}>{ft.tagline}</p>
              <button
                onClick={() => {
                  const items = getTenantDonationItems(currentTenant);
                  const firstItem = items && items.length > 0 ? items[0] : undefined;
                  navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
                }}
                style={{ width: '100%', height: 38, background: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: ft.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <Motif kind={ft.motif} size={13} color={ft.primary} />
                <span>{currentTenant.terminology.donation}하기</span>
              </button>
            </div>
          </div>

          {/* Schedule */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={12} color={C.cobalt} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{scheduleLabel}</span>
            </div>
            <div>
              {currentTenant.schedule?.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '9px 16px', borderBottom: i < (currentTenant.schedule?.length ?? 0) - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 12, color: C.ink2 }}>{s.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.ink, fontWeight: 600, background: C.cobaltBg, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{s.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={12} color={C.cobalt} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>연락처</span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentTenant.address && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <MapPin size={12} color={C.cobalt} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.ink2, lineHeight: 1.55 }}>{currentTenant.address}</span>
                </div>
              )}
              {currentTenant.contact?.phone && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Phone size={12} color={C.cobalt} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.ink2 }}>{currentTenant.contact.phone}</span>
                </div>
              )}
              {currentTenant.contact?.email && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Mail size={12} color={C.cobalt} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.ink2, wordBreak: 'break-all' }}>{currentTenant.contact.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Security note */}
          <div style={{ padding: '14px 16px', background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, borderRadius: 10, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Shield size={13} color={C.cobalt} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: C.ink2, lineHeight: 1.6, margin: 0 }}>
              모든 결제는 <strong style={{ color: C.cobalt }}>PCI-DSS 인증</strong>된 보안 시스템을 통해 처리됩니다.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── DonationItemRow ──────────────────────────────────────────── */
interface RowProps {
  item: DonationItem;
  ft: { primary: string; primaryBg: string; motif: 'cross' | 'lotus' | 'rosary'; heroGradient: string };
  terminology: string;
  icon?: React.ReactNode;
  delay: number;
  onClick: () => void;
}

function DonationItemRow({ item, ft, terminology, icon, delay, onClick }: RowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`th-animate th-delay-${delay}`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: C.card,
        border: `1px solid ${hovered ? C.cobaltBorder : C.border}`,
        borderRadius: 12,
        display: 'grid', alignItems: 'center',
        boxShadow: hovered ? `0 0 0 3px ${C.cobaltBg}, ${C.shadowMd}` : C.shadow,
        transition: 'all 180ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
      } as React.CSSProperties}
    >
      <div className="th-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '18px 20px', alignItems: 'center' }}>
        {/* Content */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>{item.name}</span>
            {item.allowRecurring && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.cobalt, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.02em' }}>
                <Repeat size={9} /> 정기
              </span>
            )}
            {item.amountType === 'fixed' && item.fixedAmount && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.ink3, background: C.paper, border: `1px solid ${C.border}`, padding: '2px 6px', borderRadius: 4 }}>
                {fmt(item.fixedAmount)}원
              </span>
            )}
          </div>
          {item.description && (
            <p className="th-row-desc" style={{ fontSize: 12, color: C.ink3, lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: hovered ? C.cobalt : C.ink3, transition: 'all 180ms', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{terminology}</span>
          <ChevronRight size={14} style={{ transform: hovered ? 'translateX(2px)' : 'none', transition: 'transform 180ms' }} />
        </div>
      </div>
    </button>
  );
}
