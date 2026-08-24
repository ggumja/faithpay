import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Tenant, DonationItem } from '../../context/AppContext';
import { FaithTheme } from '../../theme/faithTheme';
import { Motif } from '../Motif';
import { InstallBanner } from '../pwa/InstallBanner';
import { ChevronRight, MapPin, Phone, Clock, Sparkles, Search, Repeat, Landmark, Heart, Star } from 'lucide-react';

interface MinimalHeroTemplateProps {
  currentTenant: Tenant;
  allItems: DonationItem[];
  ft: FaithTheme;
  canInstall: boolean;
  install: () => void;
}

const itemIcons: Record<string, React.ReactNode> = {
  '십일조':   <Landmark size={20} />,
  '감사헌금': <Heart size={20} />,
  '건축헌금': <Landmark size={20} />,
  '인등보시': <Star size={20} />,
  '불사공양': <Heart size={20} />,
  '기도보시': <Sparkles size={20} />,
  '교무금':   <Landmark size={20} />,
  '미사예물': <Star size={20} />,
  '특별봉헌': <Heart size={20} />,
};

const MINIMAL_CSS = `
.mh-btn-spring {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;
}
.mh-btn-spring:active {
  transform: scale(0.97) !important;
}

.mh-card-hover {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
}
.mh-card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
}
`;

export function MinimalHeroTemplate({ currentTenant, allItems, ft, canInstall, install }: MinimalHeroTemplateProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recurring' | 'onetime'>('all');

  const heroBgImage = (currentTenant.bannerImages && currentTenant.bannerImages.length > 0 && currentTenant.bannerImages[0])
    ? currentTenant.bannerImages[0]
    : 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1200';

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

      {/* ── Top Header Bar ── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
      }}>
        <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${ft.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Motif kind={ft.motif} size={16} color={ft.primary} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{currentTenant.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="mh-btn-spring"
              onClick={() => navigate(`/${currentTenant.slug}/my-donations`)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#334155',
                border: '1px solid #E2E8F0',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              마이페이지
            </button>
            <button
              className="mh-btn-spring"
              onClick={() => navigate(`/${currentTenant.slug}/admin/login`)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
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
          backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(15, 23, 42, 0.90) 100%), url("${heroBgImage}")`,
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
              <span>{currentTenant.terminology.donation} 시작하기</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid ── */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '52px 24px 96px' }}>
        {/* Quick Info Cards */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: '24px 28px',
            marginBottom: 44,
            border: '1px solid #E2E8F0',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.03)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${ft.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ft.primary, border: `1px solid ${ft.primary}25` }}>
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>위치</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{currentTenant.address || '주소 정보 등록됨'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${ft.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ft.primary, border: `1px solid ${ft.primary}25` }}>
              <Phone size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>문의처</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>{currentTenant.contact?.phone || '문의처 정보'}</div>
            </div>
          </div>
        </div>

        {/* Section Header with Controls */}
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                {currentTenant.terminology.donation} 항목 선택
              </h2>
              <p style={{ fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
                원하시는 후원/봉헌 항목을 선택하여 마음을 전달하세요.
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
              placeholder="항목 검색..."
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem: item } })}
              className="mh-card-hover mh-btn-spring"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '26px',
                borderRadius: 24,
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${ft.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ft.primary }}>
                    {itemIcons[item.name] || <Heart size={20} />}
                  </div>
                  {item.allowRecurring && (
                    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: `${ft.primary}15`, color: ft.primary, padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Repeat size={10} /> 정기
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: '#0F172A', letterSpacing: '-0.01em' }}>{item.name}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.55, minHeight: 40, fontWeight: 400 }}>
                  {item.description || '정성으로 드리는 은혜로운 마음'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 800, color: ft.primary, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{item.amountType === 'fixed' && item.fixedAmount ? `₩${item.fixedAmount.toLocaleString()}` : '자율 선택'}</span>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `${ft.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={16} color={ft.primary} />
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

