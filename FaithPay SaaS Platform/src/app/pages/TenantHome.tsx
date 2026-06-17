import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, mockTenants, mockDonationItems, DonationItem } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ChevronLeft, ChevronRight, MapPin, Phone, Mail, Clock, Search } from 'lucide-react';

export default function TenantHome() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant } = useApp();
  const [, setCurrentSlide] = useState(0);

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) setCurrentTenant(tenant);
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)' }}>
        <p style={{ color: 'var(--fp-fg-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

  const ft = FAITH_THEMES[currentTenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;
  const donationItems = mockDonationItems[currentTenant.religionType] || [];

  const scheduleLabel =
    currentTenant.religionType === 'protestant' ? '예배 시간' :
    currentTenant.religionType === 'buddhist' ? '법회 시간' : '미사 시간';

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    beforeChange: (_: number, next: number) => setCurrentSlide(next),
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fp-bg-subtle)', fontFamily: 'var(--font-ui)' }}>
      {/* Top nav */}
      <div style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--fp-border-default)',
        position: 'sticky', top: 0, zIndex: 40,
        padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: 'var(--fp-fg-primary)',
            letterSpacing: '0.019em', fontFamily: 'var(--font-ui)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          돌아가기
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate(`/${tenantSlug}/my-donations`)}
            style={{
              height: 36, padding: '0 14px', borderRadius: 999,
              border: '1px solid var(--fp-border-strong)',
              background: '#fff', color: 'var(--fp-fg-primary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >내 내역</button>
          <button
            onClick={() => navigate(`/${tenantSlug}/donate`, { state: { selectedItem: donationItems[0] } })}
            style={{
              height: 36, padding: '0 16px', borderRadius: 999,
              border: 0, background: ft.heroGradient, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)',
            }}
          >
            <Motif kind={ft.motif} size={14} color="#fff" />
            {currentTenant.terminology.donation}하기
          </button>
        </div>
      </div>

      {/* Hero banner slider */}
      <div style={{ position: 'relative' }}>
        <Slider {...sliderSettings}>
          {currentTenant.bannerImages.map((image, index) => (
            <div key={index}>
              <div style={{
                height: 420,
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)' }} />
              </div>
            </div>
          ))}
        </Slider>

        {/* Hero overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', zIndex: 10, pointerEvents: 'none',
          padding: '0 24px',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            animation: 'fp-ring-in 600ms var(--fp-ease-standard)',
          }}>
            <Motif kind={ft.motif} size={40} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 800, letterSpacing: '-0.027em',
            textAlign: 'center', margin: '0 0 8px',
            textShadow: '0 2px 16px rgba(0,0,0,0.3)',
          }}>{currentTenant.name}</h1>
          <p style={{
            fontSize: 15, fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
            textAlign: 'center', letterSpacing: '0.006em',
            textShadow: '0 1px 6px rgba(0,0,0,0.3)',
          }}>{ft.tagline}</p>
        </div>
      </div>

      {/* Quick action card — floats over banner */}
      <div style={{ maxWidth: 800, margin: '-28px auto 0', padding: '0 20px', position: 'relative', zIndex: 20 }}>
        <div style={{
          background: '#fff',
          border: '1px solid var(--fp-border-strong)',
          borderRadius: 20,
          padding: '16px',
          boxShadow: 'var(--fp-shadow-3)',
          display: 'flex', gap: 12,
        }}>
          <button
            onClick={() => navigate(`/${tenantSlug}/donate`, { state: { selectedItem: donationItems[0] } })}
            style={{
              flex: 1, height: 56, borderRadius: 14,
              background: ft.heroGradient, color: '#fff',
              border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 16, fontWeight: 700, letterSpacing: '0.006em', fontFamily: 'var(--font-ui)',
            }}
          >
            <Motif kind={ft.motif} size={18} color="#fff" />
            {currentTenant.terminology.donation}하기
          </button>
          <button
            style={{
              width: 56, height: 56, borderRadius: 14,
              border: '1px solid var(--fp-border-strong)', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Search size={22} color="var(--fp-fg-primary)" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Church info card */}
        <div style={{
          background: ft.primaryBg, borderRadius: 16, padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#fff', color: ft.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Motif kind={ft.motif} size={22} color={ft.primary} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.014em', color: ft.primaryDark }}>
              {currentTenant.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', marginTop: 2 }}>
              {currentTenant.address}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
            <path d="M9 6l6 6-6 6" stroke={ft.primaryDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Donation items */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.018em', margin: 0 }}>
              {currentTenant.terminology.donation} 안내
            </h2>
            <span style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em' }}>
              항목을 선택해주세요
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {donationItems.map((item) => (
              <DonationItemCard
                key={item.id}
                item={item}
                ft={ft}
                donationLabel={currentTenant.terminology.donation}
                onClick={() => navigate(`/${tenantSlug}/donate`, { state: { selectedItem: item } })}
              />
            ))}
          </div>
        </div>

        {/* Info section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          {/* Contact */}
          <div style={{ background: '#fff', border: '1px solid var(--fp-border-strong)', borderRadius: 16, padding: '20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.014em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color={ft.primary} /> 연락처
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: <MapPin size={14} />, text: currentTenant.address },
                { icon: <Phone size={14} />, text: currentTenant.contact.phone },
                { icon: <Mail size={14} />, text: currentTenant.contact.email },
              ].map(({ icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--fp-fg-tertiary)', fontSize: 13 }}>
                  <span style={{ marginTop: 1, flexShrink: 0 }}>{icon}</span>
                  <span style={{ letterSpacing: '0.019em', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div style={{ background: '#fff', border: '1px solid var(--fp-border-strong)', borderRadius: 16, padding: '20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.014em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color={ft.primary} /> {scheduleLabel}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentTenant.schedule.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8,
                  background: i % 2 === 0 ? ft.primaryBg : 'transparent',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.014em' }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em' }}>{s.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tax receipt banner */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: ft.accentBg,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: ft.accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="#fff" strokeWidth="2" />
              <path d="M3 9h18" stroke="#fff" strokeWidth="2" />
              <path d="M8 14h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.014em', color: ft.accent }}>
              연말정산 기부금 영수증
            </div>
            <div style={{ fontSize: 12, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', marginTop: 2 }}>
              국세청 홈택스 자동 연동 신청 가능
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke={ft.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Trust badges */}
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { num: '1', title: '간편한 결제', desc: '신용카드·간편결제·가상계좌 등 다양한 결제 수단을 지원합니다' },
            { num: '2', title: '투명한 관리', desc: '모든 거래 내역이 실시간으로 기록되고 투명하게 관리됩니다' },
            { num: '3', title: '디지털 영수증', desc: '즉시 발급되는 디지털 영수증과 알림톡을 받으실 수 있습니다' },
          ].map((b) => (
            <div key={b.num} style={{
              background: '#fff', border: '1px solid var(--fp-border-strong)',
              borderRadius: 16, padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: ft.heroGradient, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800,
              }}>{b.num}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.014em', marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: 'var(--fp-fg-tertiary)', lineHeight: 1.5, letterSpacing: '0.019em' }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--fp-neutral-5)', color: 'rgba(255,255,255,0.7)',
        padding: '40px 24px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{currentTenant.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, lineHeight: 1.6 }}>
              <span>{currentTenant.address}</span>
              <span>{currentTenant.contact.phone}</span>
              <span>{currentTenant.contact.email}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 }}>FaithPay</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              종교 통합 봉헌 플랫폼<br />
              <span style={{ fontSize: 11, opacity: 0.6 }}>© 2026 FaithPay. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DonationItemCard({ item, ft, donationLabel, onClick }: {
  item: DonationItem;
  ft: import('../theme/faithTheme').FaithTheme;
  donationLabel: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left',
        background: hovered ? ft.primary : '#fff',
        border: `1.5px solid ${hovered ? ft.primary : 'var(--fp-border-strong)'}`,
        borderRadius: 16, padding: '18px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        transition: 'all 160ms var(--fp-ease-standard)',
        color: hovered ? '#fff' : 'var(--fp-fg-primary)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: hovered ? 'rgba(255,255,255,0.18)' : ft.primaryBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Motif kind={ft.motif} size={22} color={hovered ? '#fff' : ft.primary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.014em' }}>{item.name}</div>
        <div style={{ fontSize: 13, marginTop: 2, color: hovered ? 'rgba(255,255,255,0.78)' : 'var(--fp-fg-tertiary)', letterSpacing: '0.019em' }}>
          {item.description}
          {item.amountType === 'fixed' && item.fixedAmount && ` · ${item.fixedAmount.toLocaleString()}원`}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {item.allowOneTime && (
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.031em',
              background: hovered ? 'rgba(255,255,255,0.18)' : ft.primaryBg,
              color: hovered ? 'rgba(255,255,255,0.9)' : ft.primary,
            }}>단발</span>
          )}
          {item.allowRecurring && (
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.031em',
              background: hovered ? 'rgba(255,255,255,0.18)' : ft.accentBg,
              color: hovered ? 'rgba(255,255,255,0.9)' : ft.accent,
            }}>↻ 정기</span>
          )}
        </div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function CustomPrevArrow(props: any) {
  return (
    <button onClick={props.onClick} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all">
      <ChevronLeft className="h-6 w-6 text-slate-800" />
    </button>
  );
}
function CustomNextArrow(props: any) {
  return (
    <button onClick={props.onClick} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all">
      <ChevronRight className="h-6 w-6 text-slate-800" />
    </button>
  );
}
