import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Tenant, DonationItem } from '../../context/AppContext';
import { FaithTheme } from '../../theme/faithTheme';
import { Motif } from '../Motif';
import { InstallBanner } from '../pwa/InstallBanner';
import {
  ChevronRight, Heart, Landmark, Star, Repeat, Shield, MapPin, Phone, Mail, Clock, ArrowLeft, Search, Sparkles, UserCheck
} from 'lucide-react';

/* ── Neo Modern (Electric Dark) Color Tokens ── */
const NEO = {
  black:         '#0A0A0C',
  charcoal:      '#1C1C1F',
  midGray:       '#71717A',
  lightBg:       '#F4F4F6',
  white:         '#FFFFFF',
  electricGreen: '#C7FF2E',
  greenHover:    '#B5F21B',
  borderDark:    'rgba(255, 255, 255, 0.12)',
  borderLight:   '#E4E4E7',
  textSub:       '#A1A1AA',
};

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

function fmt(n: number) { return n.toLocaleString('ko-KR'); }

const ELECTRIC_CSS = `
/* Neo Modern Electric Dark Responsive Layout */
.neo-container {
  min-height: 100vh;
  background-color: ${NEO.lightBg};
  color: ${NEO.black};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding-bottom: 120px;
}

.neo-wrap {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 16px;
}

@media (min-width: 768px) {
  .neo-wrap {
    padding: 36px 24px;
  }
}

.neo-card-round {
  border-radius: 28px;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;
}

.neo-pill-btn {
  border-radius: 9999px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease;
}

.neo-pill-btn:active {
  transform: scale(0.96) !important;
}

.neo-glow-badge {
  box-shadow: 0 0 24px rgba(199, 255, 46, 0.45);
}

.neo-card-hover:hover {
  transform: translateY(-3px);
}
`;

interface ElectricDarkTemplateProps {
  currentTenant: Tenant;
  allItems: DonationItem[];
  ft: FaithTheme;
  canInstall: boolean;
  install: () => void;
}

export function ElectricDarkTemplate({ currentTenant, allItems, ft, canInstall, install }: ElectricDarkTemplateProps) {
  const navigate = useNavigate();
  const [selectedItemId, setSelectedItemId] = useState<string>(allItems[0]?.id || '');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recurring' | 'onetime'>('all');

  const selectedItem = allItems.find(i => i.id === selectedItemId) || allItems[0];

  const filteredItems = allItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    const matchTab =
      activeFilter === 'all' ||
      (activeFilter === 'recurring' && item.allowRecurring) ||
      (activeFilter === 'onetime' && item.allowOneTime && !item.allowRecurring);
    return matchSearch && matchTab && item.enabled;
  });

  const totalDonationCount = 148;
  const monthlyGoalPercent = 78;

  return (
    <div className="neo-container">
      <style>{ELECTRIC_CSS}</style>

      {/* PWA Banner */}
      {canInstall && (
        <InstallBanner
          tenant={currentTenant}
          onInstall={install}
          primaryColor={NEO.electricGreen}
        />
      )}

      <div className="neo-wrap space-y-6">

        {/* ── 1. Profile / Tenant Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar with Electric Green Ring */}
              <div style={{
                position: 'relative',
                width: 68,
                height: 68,
                borderRadius: '50%',
                backgroundColor: NEO.electricGreen,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                boxShadow: '0 0 24px rgba(199, 255, 46, 0.45)',
              }}>
                {currentTenant.logoUrl ? (
                  <img
                    src={currentTenant.logoUrl}
                    alt={currentTenant.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: NEO.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Motif kind={ft.motif} size={30} color={NEO.electricGreen} />
                  </div>
                )}
              </div>

              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: NEO.black, margin: 0, lineHeight: 1.15 }}>
                  {currentTenant.name}
                </h1>
                <p style={{ fontSize: 13, color: NEO.midGray, margin: '4px 0 0 0', fontWeight: 600 }}>
                  {currentTenant.contact.phone || '온라인 공식 봉헌 플랫폼'}
                </p>
              </div>
            </div>

            {/* Quick Action Icon */}
            <button
              className="neo-pill-btn"
              onClick={() => navigate(`/${currentTenant.slug}/admin/login`)}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: NEO.white,
                border: `1px solid ${NEO.borderLight}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
              title="관리자 로그인"
            >
              <UserCheck size={18} color={NEO.black} />
            </button>
          </div>

          {/* ── Dual Pill Buttons ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 125px', gap: 10 }}>
            <div
              className="neo-pill-btn neo-glow-badge"
              style={{
                backgroundColor: NEO.electricGreen,
                color: NEO.black,
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 4px 20px rgba(199, 255, 46, 0.35)',
              }}
            >
              <Motif kind={ft.motif} size={16} color={NEO.black} />
              <span>공식 인증 {ft.name} 단체</span>
            </div>

            <button
              onClick={() => navigate(`/${currentTenant.slug}/my-donations`)}
              className="neo-pill-btn"
              style={{
                backgroundColor: NEO.black,
                color: NEO.white,
                padding: '14px 16px',
                border: 'none',
                fontSize: 13,
                fontWeight: 800,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(10, 10, 12, 0.15)',
              }}
            >
              마이페이지
            </button>
          </div>
        </div>

        {/* ── 2. Dashboard Stats Card ── */}
        <div
          className="neo-card-round"
          style={{
            backgroundColor: NEO.black,
            color: NEO.white,
            padding: '26px 26px 22px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.30)',
            marginTop: 20,
          }}
        >
          {/* Top Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, borderBottom: `1px solid ${NEO.borderDark}`, paddingBottom: 22 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: NEO.white, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {totalDonationCount}
              </div>
              <div style={{ fontSize: 11, color: NEO.textSub, marginTop: 7, fontWeight: 600 }}>
                누적 봉헌
              </div>
            </div>

            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: NEO.white, lineHeight: 1, letterSpacing: '-0.02em' }}>
                86<span style={{ fontSize: 14, fontWeight: 600, color: NEO.textSub }}>명</span>
              </div>
              <div style={{ fontSize: 11, color: NEO.textSub, marginTop: 7, fontWeight: 600 }}>
                참여 성도
              </div>
            </div>

            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: NEO.electricGreen, lineHeight: 1, letterSpacing: '-0.02em' }}>
                ₩1,240<span style={{ fontSize: 13, fontWeight: 600, color: NEO.electricGreen }}>만</span>
              </div>
              <div style={{ fontSize: 11, color: NEO.textSub, marginTop: 7, fontWeight: 600 }}>
                이달의 나눔
              </div>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div style={{ paddingTop: 18 }}>
            <div style={{ height: 7, backgroundColor: NEO.charcoal, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: `${monthlyGoalPercent}%`, height: '100%', backgroundColor: NEO.electricGreen, borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: NEO.textSub, fontWeight: 600 }}>
              <span>월간 나눔 목표 달성률</span>
              <span style={{ color: NEO.electricGreen, fontWeight: 800 }}>{monthlyGoalPercent}%</span>
            </div>
          </div>
        </div>

        {/* ── 3. Choose Your Donation Items ── */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 23, fontWeight: 900, color: NEO.black, letterSpacing: '-0.03em', margin: 0 }}>
              {currentTenant.terminology.donation} 항목 선택
            </h2>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', backgroundColor: NEO.white, padding: 4, borderRadius: 9999, border: `1px solid ${NEO.borderLight}` }}>
              {(['all', 'recurring', 'onetime'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className="neo-pill-btn"
                  style={{
                    border: 'none',
                    padding: '5px 14px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: activeFilter === filter ? NEO.black : 'transparent',
                    color: activeFilter === filter ? NEO.electricGreen : NEO.midGray,
                    transition: 'all 0.18s ease',
                  }}
                >
                  {filter === 'all' ? '전체' : filter === 'recurring' ? '정기' : '일회성'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: NEO.midGray }} />
            <input
              type="text"
              placeholder="봉헌 항목 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                paddingLeft: 42,
                paddingRight: 16,
                borderRadius: 18,
                border: `1px solid ${NEO.borderLight}`,
                backgroundColor: NEO.white,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = NEO.black;
                e.target.style.boxShadow = '0 0 0 3px rgba(10, 10, 12, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = NEO.borderLight;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredItems.map((item, index) => {
              const isSelected = item.id === selectedItemId;
              const isDarkCard = isSelected || index === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className="neo-card-round neo-card-hover"
                  style={{
                    backgroundColor: isDarkCard ? NEO.black : NEO.white,
                    color: isDarkCard ? NEO.white : NEO.black,
                    padding: '22px 24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: isSelected ? `2px solid ${NEO.electricGreen}` : `1px solid ${isDarkCard ? NEO.charcoal : NEO.borderLight}`,
                    boxShadow: isSelected ? '0 10px 28px rgba(199, 255, 46, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.03)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    {/* Icon Box */}
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      backgroundColor: isDarkCard ? NEO.charcoal : NEO.lightBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkCard ? NEO.electricGreen : NEO.black,
                    }}>
                      {itemIcons[item.name] || <Heart size={20} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
                          {item.name}
                        </span>
                        {item.allowRecurring && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 800,
                            backgroundColor: isDarkCard ? 'rgba(199, 255, 46, 0.18)' : 'rgba(10, 10, 12, 0.08)',
                            color: isDarkCard ? NEO.electricGreen : NEO.black,
                            padding: '3px 8px',
                            borderRadius: 9999,
                          }}>
                            정기
                          </span>
                        )}
                      </div>

                      <p style={{
                        fontSize: 13,
                        color: isDarkCard ? NEO.textSub : NEO.midGray,
                        margin: '5px 0 0 0',
                        lineHeight: 1.45,
                        fontWeight: 400,
                      }}>
                        {item.description || `${currentTenant.name} 온라인 ${currentTenant.terminology.donation}`}
                      </p>
                    </div>
                  </div>

                  {/* Price Tag Highlight */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: isDarkCard ? NEO.electricGreen : NEO.black,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {item.amountType === 'fixed' && item.fixedAmount
                        ? `₩${fmt(item.fixedAmount)}`
                        : '자율 금액'}
                    </div>
                    <div style={{ fontSize: 12, color: isDarkCard ? NEO.textSub : NEO.midGray, fontWeight: 700, marginTop: 2 }}>
                      선택하기
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Information Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginTop: 16 }}>
          <div className="neo-card-round" style={{ backgroundColor: NEO.white, padding: '22px 24px', border: `1px solid ${NEO.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: NEO.black, fontWeight: 900, fontSize: 15 }}>
              <Clock size={18} color={NEO.black} />
              <span>{currentTenant.religionType === 'protestant' ? '예배' : currentTenant.religionType === 'buddhist' ? '법회' : '미사'} 시간 안내</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentTenant.schedule?.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: NEO.black }}>
                  <span style={{ color: NEO.midGray, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{s.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="neo-card-round" style={{ backgroundColor: NEO.white, padding: '22px 24px', border: `1px solid ${NEO.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: NEO.black, fontWeight: 900, fontSize: 15 }}>
              <MapPin size={18} color={NEO.black} />
              <span>위치 및 안내</span>
            </div>
            <p style={{ fontSize: 14, color: NEO.midGray, margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
              {currentTenant.address || '주소 정보가 준비 중입니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Fixed Bottom Action Bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: 0,
        right: 0,
        zIndex: 99,
        padding: '0 16px',
        maxWidth: 680,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        <button
          onClick={() => navigate(`/${currentTenant.slug}/donate`, { state: { selectedItem } })}
          className="neo-pill-btn neo-glow-badge"
          style={{
            width: '100%',
            height: 60,
            backgroundColor: NEO.electricGreen,
            color: NEO.black,
            border: 'none',
            fontSize: 18,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 14px 36px rgba(0, 0, 0, 0.45)',
            cursor: 'pointer',
          }}
        >
          <Motif kind={ft.motif} size={22} color={NEO.black} />
          <span>
            {selectedItem?.name ? `${selectedItem.name} ${currentTenant.terminology.donation}하기` : `${currentTenant.terminology.donation}하기`}
          </span>
          <ChevronRight size={22} color={NEO.black} />
        </button>
      </div>
    </div>
  );
}

