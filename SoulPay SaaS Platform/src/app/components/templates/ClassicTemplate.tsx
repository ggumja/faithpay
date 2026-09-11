import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Tenant, DonationItem } from '../../context/AppContext';
import { FaithTheme } from '../../theme/faithTheme';
import { Motif, MotifLarge } from '../Motif';
import { InstallBanner } from '../pwa/InstallBanner';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { navigateToAdminPortal } from '../../utils/domainUtils';
import {
  ChevronRight, MapPin, Phone, Mail, Clock,
  Shield, Repeat, Landmark, Search, Star, Sparkles, ExternalLink
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

function fmt(n: number) { return n.toLocaleString('ko-KR'); }


const RESPONSIVE_CSS = `
.th-body         { display: flex; flex-direction: column; gap: 28px; padding: 32px 16px 80px; max-width: 1140px; margin: 0 auto; }
.th-hero-grid    { display: flex; flex-direction: column; gap: 24px; }
.th-hero-stats   { display: flex; flex-direction: row; gap: 12px; overflow-x: auto; padding-bottom: 2px; }
.th-hero-stat    { flex: 0 0 auto; min-width: 130px; }
.th-nav-center   { display: none; }
.th-nav-left     { display: none; }
.th-controls     { flex-direction: column; gap: 14px; }
.th-search-wrap  { width: 100%; }
.th-search-wrap input { width: 100%; }
.th-tabs         { width: 100%; }
.th-tabs button  { flex: 1; }
.th-sidebar      { display: flex; flex-direction: column; gap: 20px; }
.th-trust-badges { display: none; }
.th-hero-copy    { max-width: 100%; }
.th-row-grid     { grid-template-columns: 1fr auto; gap: 16px; padding: 20px 22px; }
.th-row-desc     { display: none; }

@media (min-width: 480px) {
  .th-body         { padding: 36px 20px 88px; }
  .th-nav-left     { display: flex; }
  .th-row-desc     { display: block; }
  .th-trust-badges { display: flex; }
}

@media (min-width: 720px) {
  .th-body         { padding: 44px 24px 100px; }
  .th-nav-center   { display: flex; }
  .th-hero-grid    { flex-direction: row; align-items: center; justify-content: space-between; gap: 40px; }
  .th-hero-stats   { flex-direction: column; overflow-x: visible; gap: 12px; min-width: 170px; }
  .th-hero-stat    { min-width: unset; }
  .th-controls     { flex-direction: row; }
  .th-search-wrap  { width: auto; }
  .th-search-wrap input { width: 240px; }
  .th-tabs         { width: auto; }
  .th-tabs button  { flex: unset; }
}

@media (min-width: 1024px) {
  .th-body         { display: grid; grid-template-columns: 1fr 320px; gap: 36px; align-items: start; padding: 48px 24px 104px; }
  .th-sidebar      { position: sticky; top: 80px; }
}

@keyframes th-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.th-animate { animation: th-fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
.th-delay-1 { animation-delay: 90ms; }
.th-delay-2 { animation-delay: 180ms; }
.th-delay-3 { animation-delay: 270ms; }

.th-btn-spring {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, background-color 0.22s ease, border-color 0.22s ease;
}
.th-btn-spring:active {
  transform: scale(0.96) !important;
}

@media (max-width: 479px) {
  .th-nav-admin-label { display: none; }
}

/* Header Responsive Layout */
.th-header-inner {
  max-width: 1120px;
  margin: 0 auto;
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.th-tenant-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.th-tenant-name {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 340px;
}
.th-nav-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.th-mypage-label-full { display: inline; }
.th-mypage-label-short { display: none; }
.th-admin-label-full { display: inline; }
.th-admin-label-short { display: none; }
.th-btn-mypage {
  padding: 7px 14px;
  font-size: 13px;
}
.th-btn-admin {
  padding: 7px 12px;
  font-size: 13px;
}

@media (max-width: 640px) {
  .th-header-inner {
    padding: 0 12px;
    gap: 8px;
    height: 60px;
  }
  .th-tenant-name {
    max-width: 220px;
    font-size: 17px;
    font-weight: 900;
  }
  .th-mypage-label-full { display: none; }
  .th-mypage-label-short { display: inline; }
  .th-admin-label-full { display: none; }
  .th-admin-label-short { display: inline; }
  .th-btn-mypage {
    padding: 6px 11px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    gap: 4px !important;
  }
  .th-btn-admin {
    padding: 6px 10px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
  }
}

@media (max-width: 380px) {
  .th-tenant-name {
    max-width: 160px;
    font-size: 15px;
  }
  .th-btn-admin {
    display: none;
  }
}
`;

interface ClassicTemplateProps {
  currentTenant: Tenant;
  allItems: DonationItem[];
  ft: FaithTheme;
  canInstall: boolean;
  hasNativePrompt?: boolean;
  install: () => void | Promise<boolean | void>;
}

export function ClassicTemplate({ currentTenant, allItems, ft, canInstall, hasNativePrompt, install }: ClassicTemplateProps) {
  const navigate = useNavigate();
  const terms = useTenantTerms(currentTenant);
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
      (activeTab === 'onetime' && item.allowOneTime !== false);
    return matchSearch && matchTab && item.enabled;
  });

  const scheduleLabel =
    currentTenant.religionType === 'protestant' ? '예배 시간' :
    currentTenant.religionType === 'buddhist'   ? '법회 시간' : '미사 시간';

  return (
    <div style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', background: C.paper, color: C.ink, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
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
        <div className="th-header-inner">
          <div className="th-tenant-info">
            <div style={{
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: currentTenant.logoUrl ? 'transparent' : ft.primaryBg,
              borderRadius: currentTenant.logoUrl ? 0 : 10,
              boxShadow: currentTenant.logoUrl ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {currentTenant.logoUrl ? (
                <img
                  src={currentTenant.logoUrl}
                  alt={currentTenant.name}
                  style={{ width: 36, height: 36, objectFit: 'contain' }}
                />
              ) : (
                <Motif kind={ft.motif} size={20} color={ft.primary} />
              )}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span className="th-tenant-name" style={{ color: C.ink }}>{currentTenant.name}</span>
            </div>
          </div>

          <div className="th-nav-actions">
            <button
              className="th-btn-spring th-btn-mypage"
              onClick={() => navigate(`/${currentTenant.slug}/my-donations`)}
              title={`${terms.donor} 마이페이지`}
              style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.cobalt, fontFamily: 'inherit', fontWeight: 700, borderRadius: 8, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.cobalt; e.currentTarget.style.background = C.cobaltBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'none'; }}
            >
              <span>🔑</span>
              <span className="th-mypage-label-full">{terms.donor} 마이페이지</span>
              <span className="th-mypage-label-short">마이페이지</span>
            </button>
            <button
              className="th-btn-spring th-btn-admin"
              onClick={() => navigateToAdminPortal(currentTenant.slug, navigate)}
              title="관리자 로그인"
              style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.ink3, fontFamily: 'inherit', fontWeight: 600, borderRadius: 8, whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.cobaltBorder; e.currentTarget.style.color = C.cobalt; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.ink3; }}
            >
              <span className="th-admin-label-full">관리자 로그인</span>
              <span className="th-admin-label-short">관리자</span>
            </button>
          </div>
        </div>

        {canInstall && (
          <InstallBanner
            tenant={currentTenant}
            onInstall={install}
            hasNativePrompt={hasNativePrompt}
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
          </div>
        )}


        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(52px, 8vw, 84px) clamp(20px, 4vw, 24px) clamp(44px, 6vw, 72px)', position: 'relative', zIndex: 2 }}>
          <div className="th-hero-grid">
            <div className="th-animate th-hero-copy">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0, 0, 0, 0.45)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 9999, padding: '6px 16px', marginBottom: 20, backdropFilter: 'blur(12px)' }}>
                <Motif kind={ft.motif} size={14} color="white" />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'white', letterSpacing: '0.04em', fontWeight: 700 }}>{ft.greeting}</span>
              </div>

              <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: 'white', lineHeight: 1.15, letterSpacing: '-0.04em', marginBottom: 18, textShadow: '0 2px 20px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.9)' }}>
                {currentTenant.name}
              </h1>
              <p style={{ fontSize: 'clamp(17px, 2.3vw, 20px)', color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.75, maxWidth: 660, marginBottom: 32, fontWeight: 500, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
                {currentTenant.description}
              </p>

              <div className="th-trust-badges" style={{ gap: 20, flexWrap: 'wrap' }}>
                {[['ISMS-P', '정보보호 인증'], ['PCI-DSS', '결제 보안'], ['SSL', '256-bit']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} color="rgba(255,255,255,0.85)" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.04em', fontWeight: 700 }}>{k}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{v}</span>
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
          <div className="th-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
            <div className="th-tabs" style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, gap: 4 }}>
              {([
                { key: 'all',      label: '전체' },
                { key: 'recurring', label: '정기' },
                { key: 'onetime',  label: '일회성' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="th-btn-spring"
                  style={{ height: 38, padding: '0 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', transition: 'all 180ms ease',
                    background: activeTab === tab.key ? C.cobalt : 'transparent',
                    color:      activeTab === tab.key ? 'white'  : C.ink3,
                  }}
                >{tab.label}</button>
              ))}
            </div>

            <div className="th-search-wrap" style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 360 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.ink3, pointerEvents: 'none' }} />
              <input
                type="text" placeholder="항목 검색…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ height: 44, paddingLeft: 40, paddingRight: 14, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 15, fontFamily: 'inherit', color: C.ink, background: C.card, outline: 'none', width: '100%', transition: 'all 180ms ease', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = C.cobalt; e.target.style.boxShadow = `0 0 0 3px ${C.cobaltBg}`; }}
                onBlur={e  => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <h2 style={{ fontSize: 21, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em' }}>
              {terms.donation} 항목
            </h2>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: C.cobalt, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, padding: '3px 11px', borderRadius: 8 }}>{filtered.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item, i) => (
              <ClassicItemRow
                key={item.id}
                item={item}
                terminology={terms.donation}
                delay={Math.min(i + 1, 3)}
                onClick={() => navigate(`/${currentTenant.slug}/donate`, { 
                  state: { 
                    selectedItem: item,
                    isRecurring: activeTab === 'recurring' ? true : activeTab === 'onetime' ? false : undefined,
                  } 
                })}
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
          {/* 📢 사이드바 광고/프로모션 배너 영역 (Sidebar Promo & Ad Banner) */}
          <div
            className="sidebar-ad-banner-container"
            style={{
              width: '100%',
              minHeight: 148,
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.07)',
              border: `1px solid ${C.border}`,
              background: C.card,
            }}
          >
            {(() => {
              const sideBanners: any[] = ((currentTenant as any).sidebarBanners || [])
                .map((b: any, idx: number) => typeof b === 'string' ? { id: `sb-${idx}`, imageUrl: b, order: idx, enabled: true } : b)
                .filter((b: any) => b && b.enabled !== false && b.imageUrl);

              if (sideBanners.length > 0) {
                const activeBanner = sideBanners[bannerIndex % sideBanners.length];
                return (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 148,
                      overflow: 'hidden',
                      cursor: activeBanner?.linkUrl ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (activeBanner?.linkUrl) {
                        window.open(activeBanner.linkUrl, '_blank');
                      }
                    }}
                    title={activeBanner?.title || '프로모션 배너'}
                  >
                    {sideBanners.map((sb: any, idx: number) => {
                      const isCurrent = idx === (bannerIndex % sideBanners.length);
                      return (
                        <div
                          key={sb.id || `${sb.imageUrl}-${idx}`}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: isCurrent ? 1 : 0,
                            transition: 'opacity 500ms ease-in-out',
                            pointerEvents: isCurrent ? 'auto' : 'none',
                          }}
                        >
                          <img
                            src={sb.imageUrl}
                            alt={sb.title || `${currentTenant.name} 프로모션 배너`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      );
                    })}

                    {/* AD 뱃지 및 외부링크 아이콘 */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(15, 23, 42, 0.70)',
                        backdropFilter: 'blur(4px)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {activeBanner?.linkUrl && <ExternalLink size={10} />}
                      <span>AD</span>
                    </div>

                    {/* 배너 인디케이터 (2장 이상일 때) */}
                    {sideBanners.length > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: 4,
                          zIndex: 2,
                        }}
                      >
                        {sideBanners.map((_: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              width: i === (bannerIndex % sideBanners.length) ? 14 : 5,
                              height: 5,
                              borderRadius: 3,
                              background: i === (bannerIndex % sideBanners.length) ? 'white' : 'rgba(255,255,255,0.5)',
                              transition: 'all 300ms ease',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // 2. 기본 광고성 배너 영역 (등록된 사이드 배너가 없을 때)
              return (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 148,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                onClick={() => {
                  window.open('https://soulpay.kr', '_blank');
                }}
              >
                {/* 배경 장식 글로우 */}
                <div
                  style={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 110,
                    height: 110,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0) 70%)',
                    pointerEvents: 'none',
                  }}
                />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: 'rgba(99, 102, 241, 0.25)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        color: '#a5b4fc',
                        letterSpacing: '0.04em',
                      }}
                    >
                      광고 / 프로모션
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      AD
                    </span>
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35, color: '#ffffff', margin: 0 }}>
                    소울페이 스마트 헌금 솔루션
                  </h4>
                  <p style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.65)', marginTop: 4, lineHeight: 1.4 }}>
                    언제 어디서나 간편하고 투명한 모바일 헌금
                  </p>
                </div>

                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700 }}>배너 등록 및 제휴 문의</span>
                  <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 800 }}>→</span>
                </div>
              </div>
            );
          })()}
        </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} color={C.cobalt} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>{scheduleLabel}</span>
            </div>
            <div>
              {currentTenant.schedule?.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '13px 18px', borderBottom: i < (currentTenant.schedule?.length ?? 0) - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 15, color: C.ink2, fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.cobalt, fontWeight: 700, background: C.cobaltBg, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>{s.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={16} color={C.cobalt} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>연락처 및 안내</span>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {currentTenant.address && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <MapPin size={16} color={C.cobalt} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: C.ink2, lineHeight: 1.55, fontWeight: 500 }}>{currentTenant.address}</span>
                </div>
              )}
              {currentTenant.contact?.phone && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Phone size={16} color={C.cobalt} style={{ flexShrink: 0 }} />
                  <a href={`tel:${currentTenant.contact.phone}`} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: C.ink, fontWeight: 700, textDecoration: 'none' }}>
                    {formatPhoneNumber(currentTenant.contact.phone)}
                  </a>
                </div>
              )}
              {currentTenant.contact?.email && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Mail size={16} color={C.cobalt} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: C.ink2, wordBreak: 'break-all', fontWeight: 500 }}>{currentTenant.contact.email}</span>
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
        borderRadius: 16,
        display: 'block',
        boxShadow: hovered ? `0 0 0 3px ${C.cobaltBg}, ${C.shadowMd}` : C.shadow,
        transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      } as React.CSSProperties}
    >
      <div className="th-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '20px 22px', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em' }}>{item.name}</span>
            {item.allowRecurring && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: C.cobalt, background: C.cobaltBg, border: `1px solid ${C.cobaltBorder}`, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.02em' }}>
                <Repeat size={11} /> 정기
              </span>
            )}
            {item.allowOneTime !== false && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '3px 8px', borderRadius: 6, letterSpacing: '0.02em' }}>
                1회성
              </span>
            )}
            {item.amountType === 'fixed' && item.fixedAmount && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, color: C.ink, background: C.paper, border: `1px solid ${C.border}`, padding: '3px 9px', borderRadius: 6 }}>
                {fmt(item.fixedAmount)}원
              </span>
            )}
          </div>
          {item.description && (
            <p className="th-row-desc" style={{ fontSize: 14.5, color: C.ink3, lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: 400 }}>
              {item.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: hovered ? C.cobalt : C.ink3, transition: 'all 220ms', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{terminology}</span>
          <ChevronRight size={17} style={{ transform: hovered ? 'translateX(3px)' : 'none', transition: 'transform 220ms ease' }} />
        </div>
      </div>
    </button>
  );
}

