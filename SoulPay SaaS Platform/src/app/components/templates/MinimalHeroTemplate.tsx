import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Tenant, DonationItem } from '../../context/AppContext';
import { FaithTheme } from '../../theme/faithTheme';
import { Motif } from '../Motif';
import { InstallBanner } from '../pwa/InstallBanner';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { navigateToAdminPortal } from '../../utils/domainUtils';
import { ChevronRight, MapPin, Phone, Clock, Sparkles, Search, Repeat, Landmark, Heart, Star } from 'lucide-react';

interface MinimalHeroTemplateProps {
  currentTenant: Tenant;
  allItems: DonationItem[];
  ft: FaithTheme;
  canInstall: boolean;
  install: () => void;
}

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

const MINIMAL_CSS = `
.mh-btn-spring {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;
}
.mh-btn-spring:active {
  transform: scale(0.96) !important;
}

.mh-nav-inner {
  max-width: 920px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mh-nav-tenant-name {
  font-size: 15px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}
.mh-mypage-full { display: inline; }
.mh-mypage-short { display: none; }
.mh-btn-mypage {
  background-color: #FFFFFF;
  color: #334155;
  border: 1px solid #E2E8F0;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.mh-btn-admin {
  background-color: #FFFFFF;
  color: #64748B;
  border: 1px solid #E2E8F0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .mh-nav-inner {
    padding: 10px 14px;
    gap: 6px;
  }
  .mh-nav-tenant-name {
    max-width: 120px;
    font-size: 13px;
  }
  .mh-mypage-full { display: none; }
  .mh-mypage-short { display: inline; }
  .mh-btn-mypage {
    padding: 5px 8px;
    font-size: 11px;
  }
  .mh-btn-admin {
    padding: 5px 8px;
    font-size: 11px;
  }
}

@media (max-width: 360px) {
  .mh-nav-tenant-name {
    max-width: 90px;
  }
}

/* Hallmark · component: donation-card · genre: modern-minimal
 * states: default · hover · focus · active · disabled
 * contrast: pass (46–50)
 */
.mh-main-content {
  max-width: 920px;
  margin: 0 auto;
  padding: 36px 16px 80px;
}
@media (min-width: 640px) {
  .mh-main-content {
    padding: 48px 24px 96px;
  }
}

.mh-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
@media (min-width: 640px) {
  .mh-cards-grid {
    gap: 16px;
  }
}

.mh-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  padding: 16px 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justifyContent: space-between;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
  outline: none;
}
.mh-card:hover {
  transform: translateY(-2px);
  border-color: #CBD5E1 !important;
  box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.07), 0 2px 6px -2px rgba(15, 23, 42, 0.03);
}
.mh-card:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
.mh-card:active {
  transform: scale(0.985);
}
.mh-card:hover .mh-action-icon {
  transform: translateX(2px);
}

@keyframes mh-fade-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.mh-animate {
  animation: mh-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`;

export function MinimalHeroTemplate({ currentTenant, allItems, ft, canInstall, install }: MinimalHeroTemplateProps) {
  const navigate = useNavigate();
  const terms = useTenantTerms(currentTenant);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recurring' | 'onetime'>('all');

  const heroBgImage = (currentTenant.bannerImages && currentTenant.bannerImages.length > 0 && currentTenant.bannerImages[0])
    ? currentTenant.bannerImages[0]
    : '';

  const filteredItems = allItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    const matchTab =
      activeFilter === 'all' ||
      (activeFilter === 'recurring' && item.allowRecurring) ||
      (activeFilter === 'onetime' && item.allowOneTime && !item.allowRecurring);
    return matchSearch && matchTab && item.enabled;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{MINIMAL_CSS}</style>
      {canInstall && <InstallBanner tenant={currentTenant} onInstall={install} primaryColor={ft.primary} />}

      {/* ── Sticky Nav ── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div className="mh-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${ft.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Motif kind={ft.motif} size={16} color={ft.primary} />
            </div>
            <span className="mh-nav-tenant-name">{currentTenant.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              className="mh-btn-spring mh-btn-mypage"
              onClick={() => navigate(`/${currentTenant.slug}/my-donations`)}
            >
              <span className="mh-mypage-full">{terms.donor} 마이페이지</span>
              <span className="mh-mypage-short">마이페이지</span>
            </button>
            <button
              className="mh-btn-spring mh-btn-admin"
              onClick={() => navigateToAdminPortal(currentTenant.slug, navigate)}
            >
              관리자
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section with Dynamic Background ── */}
      <header
        style={{
          position: 'relative',
          padding: '110px 24px 90px',
          textAlign: 'center',
          overflow: 'hidden',
          color: '#FFFFFF',
          backgroundImage: heroBgImage
            ? `url("${heroBgImage}")`
            : 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Logo Badge */}
          {currentTenant.logoUrl && (
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  padding: 4,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: `3px solid ${ft.primary}`,
                }}
              >
                <img
                  src={currentTenant.logoUrl}
                  alt={currentTenant.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </div>
            </div>
          )}

          {/* Greeting Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(16px)',
              padding: '7px 20px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            }}
          >
            <Motif kind={ft.motif} size={15} color="#FFFFFF" />
            <span>{ft.greeting} · {currentTenant.name}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5.5vw, 52px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em', textShadow: '0 4px 16px rgba(0,0,0,0.4)', lineHeight: 1.15 }}>
            {currentTenant.name}
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.65, opacity: 0.95, maxWidth: 620, margin: '0 auto 32px', fontWeight: 400, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {currentTenant.description}
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="mh-btn-spring"
              onClick={() => {
                const firstItem = allItems[0];
                navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: firstItem } });
              }}
              style={{
                backgroundColor: ft.primary,
                color: '#FFFFFF',
                border: 'none',
                padding: '16px 36px',
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
            >
              <Sparkles size={18} />
              <span>{terms.donation} 시작하기</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid ── */}
      <main className="mh-main-content">
        {/* Quick Info Cards */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 28,
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                minWidth: 40,
                maxWidth: 40,
                flexShrink: 0,
                borderRadius: 12,
                backgroundColor: `${ft.primary}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ft.primary,
                border: `1px solid ${ft.primary}25`,
                boxSizing: 'border-box',
              }}
            >
              <MapPin size={18} style={{ flexShrink: 0 }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>위치</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={currentTenant.address || '주소 정보 등록됨'}
              >
                {currentTenant.address || '주소 정보 등록됨'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                minWidth: 40,
                maxWidth: 40,
                flexShrink: 0,
                borderRadius: 12,
                backgroundColor: `${ft.primary}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ft.primary,
                border: `1px solid ${ft.primary}25`,
                boxSizing: 'border-box',
              }}
            >
              <Phone size={18} style={{ flexShrink: 0 }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>문의처</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginTop: 2,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                {formatPhoneNumber(currentTenant.contact?.phone) || '문의처 정보'}
              </div>
            </div>
          </div>
        </div>

        {/* Section Header with Controls */}
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                {terms.donation} 항목 선택
              </h2>
              <p style={{ fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
                원하시는 {terms.donation} 항목을 선택하여 마음을 전달하세요.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#FFFFFF', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              {(['all', 'recurring', 'onetime'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className="mh-btn-spring"
                  style={{
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: activeFilter === filter ? ft.primary : 'transparent',
                    color: activeFilter === filter ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {filter === 'all' ? '전체' : filter === 'recurring' ? '정기' : '일회성'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder={`${terms.donation} 항목 검색...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                paddingLeft: 44,
                paddingRight: 16,
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = ft.primary;
                e.target.style.boxShadow = `0 0 0 3px ${ft.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Donation Items Grid */}
        <div className="mh-cards-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: item } })}
              className="mh-card mh-btn-spring"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: item } });
                }
              }}
            >
              <div>
                {/* Header: Icon + Name + Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${ft.primary}12`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: ft.primary,
                      flexShrink: 0,
                    }}>
                      {itemIcons[item.name] || <Heart size={18} />}
                    </div>
                    <span style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: '#0F172A',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.name}
                    </span>
                  </div>

                  {item.allowRecurring && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: `${ft.primary}12`,
                      color: ft.primary,
                      padding: '2px 7px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      flexShrink: 0,
                    }}>
                      <Repeat size={10} /> 정기
                    </span>
                  )}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 13,
                  color: '#64748B',
                  lineHeight: 1.45,
                  marginBottom: 12,
                  fontWeight: 400,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {item.description || `${currentTenant.name} ${terms.donation} 항목입니다.`}
                </div>
              </div>

              {/* Footer: Amount & Action */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '1px solid #F1F5F9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: ft.primary,
                    fontFamily: item.amountType === 'fixed' && item.fixedAmount ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
                  }}>
                    {item.amountType === 'fixed' && item.fixedAmount ? `₩${item.fixedAmount.toLocaleString()}` : '자율 선택'}
                  </span>
                </div>
                <div
                  className="mh-action-icon"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${ft.primary}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: ft.primary,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <ChevronRight size={15} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: '#64748B', fontWeight: 600 }}>검색어와 일치하는 항목이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}

