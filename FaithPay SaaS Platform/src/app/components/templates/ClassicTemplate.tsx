import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Tenant, DonationItem } from '../../context/AppContext';
import { FaithTheme } from '../../theme/faithTheme';
import { Motif, MotifLarge } from '../Motif';
import { InstallBanner } from '../pwa/InstallBanner';
import {
  MapPin, Phone, Mail, Clock, ChevronRight,
  Shield, Repeat, Landmark, Heart, Search, Star, Sparkles
} from 'lucide-react';

const C = {
  white:        '#ffffff',
  paper:        'oklch(0.988 0.003 250)',
  card:         'oklch(1.00 0.000 0)',
  border:       'oklch(0.12 0.015 260 / 0.08)',
  borderMed:    'oklch(0.12 0.015 260 / 0.16)',
  ink:          'oklch(0.09 0.025 262)',
  ink2:         'oklch(0.28 0.018 260)',
  ink3:         'oklch(0.52 0.014 258)',
  cobalt:       'oklch(0.48 0.22 264)',
  cobaltBg:     'oklch(0.965 0.022 258)',
  cobaltBorder: 'oklch(0.48 0.22 264 / 0.22)',
  shadow:       '0 1px 3px oklch(0.12 0.015 260 / 0.06), 0 1px 2px oklch(0.12 0.015 260 / 0.04)',
  shadowMd:     '0 8px 24px -6px oklch(0.12 0.015 260 / 0.12), 0 3px 8px -2px oklch(0.12 0.015 260 / 0.08)',
};

const itemIcons: Record<string, React.ReactNode> = {
  '십일조':   <Landmark size={18} />,
  '감사헌금': <Heart size={18} />,
  '건축헌금': <Landmark size={18} />,
  '인등보시': <Star size={18} />,
  '불사공양': <Heart size={18} />,
  '기도보시': <Sparkles size={18} />,
  '교무금':   <Landmark size={18} />,
  '미사예물': <Star size={18} />,
  '특별봉헌': <Heart size={18} />,
};

function fmt(n: number) { return n.toLocaleString('ko-KR'); }

const RESPONSIVE_CSS = `
.th-body         { display: flex; flex-direction: column; gap: 24px; padding: 28px 16px 72px; max-width: 1120px; margin: 0 auto; }
.th-hero-grid    { display: flex; flex-direction: column; gap: 24px; }
.th-hero-stats   { display: flex; flex-direction: row; gap: 12px; overflow-x: auto; padding-bottom: 2px; }
.th-hero-stat    { flex: 0 0 auto; min-width: 130px; }
.th-nav-center   { display: none; }
.th-nav-left     { display: none; }
.th-controls     { flex-direction: column; gap: 12px; }
.th-search-wrap  { width: 100%; }
.th-search-wrap input { width: 100%; }
.th-tabs         { width: 100%; }
.th-tabs button  { flex: 1; }
.th-sidebar      { display: flex; flex-direction: column; gap: 18px; }
.th-trust-badges { display: none; }
.th-hero-copy    { max-width: 100%; }
.th-hero-cta     { flex-wrap: wrap; }
.th-row-grid     { grid-template-columns: 44px 1fr auto; gap: 16px; padding: 18px 20px; }
.th-row-desc     { display: none; }
.th-row-icon     { width: 44px; height: 44px; border-radius: 12px; }

@media (min-width: 480px) {
  .th-body         { padding: 32px 20px 80px; }
  .th-nav-left     { display: flex; }
  .th-row-desc     { display: block; }
  .th-trust-badges { display: flex; }
}

@media (min-width: 720px) {
  .th-body         { padding: 40px 24px 96px; }
  .th-nav-center   { display: flex; }
  .th-hero-grid    { flex-direction: row; align-items: center; justify-content: space-between; gap: 36px; }
  .th-hero-stats   { flex-direction: column; overflow-x: visible; gap: 12px; min-width: 170px; }
  .th-hero-stat    { min-width: unset; }
  .th-controls     { flex-direction: row; }
  .th-search-wrap  { width: auto; }
  .th-search-wrap input { width: 220px; }
  .th-tabs         { width: auto; }
  .th-tabs button  { flex: unset; }
}

@media (min-width: 1024px) {
  .th-body         { display: grid; grid-template-columns: 1fr 310px; gap: 32px; align-items: start; padding: 44px 24px 96px; }
  .th-sidebar      { position: sticky; top: 76px; }
}

@keyframes th-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.th-animate { animation: th-fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
.th-delay-1 { animation-delay: 90ms; }
.th-delay-2 { animation-delay: 180ms; }
.th-delay-3 { animation-delay: 270ms; }

.th-btn-spring {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background-color 0.2s ease;
}
.th-btn-spring:active {
  transform: scale(0.97) !important;
}

@media (max-width: 479px) {
  .th-nav-admin-label { display: none; }
}
`;

interface ClassicTemplateProps {
  currentTenant: Tenant;
  allItems: DonationItem[];
  ft: FaithTheme;
  canInstall: boolean;
  install: () => void;
}

export function ClassicTemplate({ currentTenant, allItems, ft, canInstall, install }: ClassicTemplateProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recurring' | 'onetime'>('all');
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const banners = currentTenant.bannerImages || [];
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentTenant]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{RESPONSIVE_CSS}</style>

      {/* ── Sticky Nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
        boxShadow: heroVisible ? 'none' : C.shadow,
        transition: 'box-shadow 250ms ease, background 250ms ease',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: ft.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Motif kind={ft.motif} size={16} color={ft.primary} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, color: C.ink }}>{currentTenant.name}</div>
              <div style={{ fontSize: 11, color: C.ink3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>{ft.name}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="th-btn-spring"
              onClick={() => navigate(`/${currentTenant.slug}/my-donations`)}
              style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, color: C.cobalt, fontFamily: 'inherit', fontWeight: 700, padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.cobalt; e.currentTarget.style.background = C.cobaltBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'none'; }}
            >
              <span>🔑</span>
              <span>신도 로그인 · 마이페이지</span>
            </button>
            <button
              className="th-btn-spring"
              onClick={() => navigate(`/${currentTenant.slug}/admin/login`)}
              style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, color: C.ink3, fontFamily: 'inherit', fontWeight: 600, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.cobaltBorder; e.currentTarget.style.color = C.cobalt; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.ink3; }}
            >
              <span className="th-nav-admin-label">관리자 </span>로그인
            </button>
            <button
              className="th-btn-spring"
              onClick={() => {
                const firstItem = allItems && allItems.length > 0 ? allItems[0] : undefined;
                navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
              }}
              style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 700, borderRadius: 10, background: ft.primary, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}
            >{currentTenant.terminology.donation}하기</button>
          </div>
        </div>

        {canInstall && (
          <InstallBanner
            tenant={currentTenant}
            onInstall={install}
            primaryColor={ft.primary}
          />
        )}
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} style={{ position: 'relative', overflow: 'hidden', background: ft.heroGradient, minHeight: 400 }}>
        {currentTenant.bannerImages && currentTenant.bannerImages.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {currentTenant.bannerImages.map((bannerUrl, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: idx === bannerIndex ? 1 : 0,
                  transition: 'opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundImage: `url(${bannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.48) 100%)',
            }} />
          </div>
        )}

        <div style={{ position: 'absolute', right: -40, top: -20, width: '40%', height: '130%', opacity: 0.12, pointerEvents: 'none', zIndex: 1 }}>
          <MotifLarge kind={ft.motif} color="white" opacity={1} />
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(52px, 8vw, 84px) clamp(20px, 4vw, 24px) clamp(44px, 6vw, 72px)', position: 'relative', zIndex: 2 }}>
          <div className="th-hero-grid">
            <div className="th-animate th-hero-copy">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0, 0, 0, 0.45)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 9999, padding: '5px 14px', marginBottom: 20, backdropFilter: 'blur(12px)' }}>
                <Motif kind={ft.motif} size={12} color="white" />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'white', letterSpacing: '0.04em', fontWeight: 600 }}>{ft.greeting}</span>
              </div>

              <h1 style={{ fontSize: 'clamp(32px, 5.5vw, 60px)', fontWeight: 900, color: 'white', lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 16, textShadow: '0 2px 20px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.9)' }}>
                {currentTenant.name}
              </h1>
              <p style={{ fontSize: 'clamp(15px, 2vw, 17.5px)', color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.7, maxWidth: 660, marginBottom: 32, fontWeight: 400, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
                {currentTenant.description}
              </p>

              <div className="th-hero-cta" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
                <button
                  className="th-btn-spring"
                  onClick={() => {
                    const firstItem = allItems && allItems.length > 0 ? allItems[0] : undefined;
                    navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
                  }}
                  style={{ height: 48, padding: '0 26px', background: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, color: ft.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                >
                  <Motif kind={ft.motif} size={15} color={ft.primary} />
                  {currentTenant.terminology.donation}하기
                </button>
                <button
                  className="th-btn-spring"
                  onClick={() => { document.getElementById('items-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ height: 48, padding: '0 22px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, fontSize: 15, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', backdropFilter: 'blur(12px)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                >
                  항목 보기 <ChevronRight size={15} />
                </button>
              </div>

              <div className="th-trust-badges" style={{ gap: 20, flexWrap: 'wrap' }}>
                {[['ISMS-P', '정보보호 인증'], ['PCI-DSS', '결제 보안'], ['SSL', '256-bit']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={12} color="rgba(255,255,255,0.75)" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', fontWeight: 700 }}>{k}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {currentTenant.bannerImages && currentTenant.bannerImages.length > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28 }}>
              {currentTenant.bannerImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIndex(i)}
                  aria-label={`${i + 1}번 배너 선택`}
                  style={{
                    width: i === bannerIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === bannerIndex ? 'white' : 'rgba(255, 255, 255, 0.45)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 300ms ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Body ── */}
      <div className="th-body">
        <main id="items-section">
          <div className="th-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="th-tabs" style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, gap: 3 }}>
              {([
                { key: 'all',      label: '전체' },
                { key: 'recurring', label: '정기' },
                { key: 'onetime',  label: '일회성' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="th-btn-spring"
                  style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 180ms ease',
                    background: activeTab === tab.key ? C.cobalt : 'transparent',
                    color:      activeTab === tab.key ? 'white'  : C.ink3,
                  }}
                >{tab.label}</button>
              ))}
            </div>

            <div className="th-search-wrap" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.ink3, pointerEvents: 'none' }} />
              <input
                type="text" placeholder="항목 검색…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ height: 38, paddingLeft: 34, paddingRight: 14, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: C.ink, background: C.card, outline: 'none', width: '100%', transition: 'all 180ms ease', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = C.cobalt; e.target.style.boxShadow = `0 0 0 3px ${C.cobaltBg}`; }}
                onBlur={e  => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>
              {currentTenant.terminology.donation} 항목
            </h2>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: C.cobalt, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, padding: '2px 9px', borderRadius: 6 }}>{filtered.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item, i) => (
              <ClassicItemRow
                key={item.id}
                item={item}
                terminology={currentTenant.terminology.donation}
                delay={Math.min(i + 1, 3)}
                onClick={() => navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: item } })}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              <p style={{ fontSize: 15, color: C.ink3, fontWeight: 600 }}>검색 결과가 없습니다</p>
            </div>
          )}
        </main>

        <aside className="th-sidebar">
          <div style={{ background: ft.heroGradient, borderRadius: 16, padding: '26px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <div style={{ position: 'absolute', top: -10, right: -10, width: 90, height: 90, opacity: 0.12, pointerEvents: 'none' }}>
              <MotifLarge kind={ft.motif} color="white" opacity={1} />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>온라인 {currentTenant.terminology.donation}</div>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.45, marginBottom: 16 }}>{ft.tagline}</p>
              <button
                className="th-btn-spring"
                onClick={() => {
                  const firstItem = allItems && allItems.length > 0 ? allItems[0] : undefined;
                  navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
                }}
                style={{ width: '100%', height: 42, background: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, color: ft.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
              >
                <Motif kind={ft.motif} size={14} color={ft.primary} />
                <span>{currentTenant.terminology.donation}하기</span>
              </button>
            </div>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={14} color={C.cobalt} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{scheduleLabel}</span>
            </div>
            <div>
              {currentTenant.schedule?.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '11px 18px', borderBottom: i < (currentTenant.schedule?.length ?? 0) - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 13, color: C.ink2, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.cobalt, fontWeight: 700, background: C.cobaltBg, padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap' }}>{s.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={14} color={C.cobalt} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>연락처 및 안내</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentTenant.address && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <MapPin size={14} color={C.cobalt} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, fontWeight: 500 }}>{currentTenant.address}</span>
                </div>
              )}
              {currentTenant.contact?.phone && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Phone size={14} color={C.cobalt} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.ink, fontWeight: 600 }}>{currentTenant.contact.phone}</span>
                </div>
              )}
              {currentTenant.contact?.email && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Mail size={14} color={C.cobalt} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.ink2, wordBreak: 'break-all', fontWeight: 500 }}>{currentTenant.contact.email}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ClassicItemRow({ item, terminology, delay, onClick }: { item: DonationItem; terminology: string; delay: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`th-animate th-delay-${delay} th-btn-spring`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: C.card,
        border: `1px solid ${hovered ? C.cobaltBorder : C.border}`,
        borderRadius: 14,
        display: 'block',
        boxShadow: hovered ? `0 0 0 3px ${C.cobaltBg}, ${C.shadowMd}` : C.shadow,
        transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      } as React.CSSProperties}
    >
      <div className="th-row-grid" style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 16, padding: '18px 20px', alignItems: 'center' }}>
        {/* Icon Box */}
        <div className="th-row-icon" style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: hovered ? C.cobaltBg : C.paper,
          border: `1px solid ${hovered ? C.cobaltBorder : C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: hovered ? C.cobalt : C.ink2,
          transition: 'all 220ms ease',
        }}>
          {itemIcons[item.name] || <Heart size={18} />}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em' }}>{item.name}</span>
            {item.allowRecurring && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: C.cobalt, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.02em' }}>
                <Repeat size={10} /> 정기
              </span>
            )}
            {item.amountType === 'fixed' && item.fixedAmount && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: C.ink, background: C.paper, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 6 }}>
                {fmt(item.fixedAmount)}원
              </span>
            )}
          </div>
          {item.description && (
            <p className="th-row-desc" style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', fontWeight: 400 }}>
              {item.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: hovered ? C.cobalt : C.ink3, transition: 'all 220ms', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{terminology}</span>
          <ChevronRight size={15} style={{ transform: hovered ? 'translateX(3px)' : 'none', transition: 'transform 220ms ease' }} />
        </div>
      </div>
    </button>
  );
}

