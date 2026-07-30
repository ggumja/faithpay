import { useNavigate } from 'react-router';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif } from '../components/Motif';
import { Shield, Repeat, Smartphone, BarChart3, ArrowRight, CheckCircle, Heart } from 'lucide-react';

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
 * macrostructure: Bento Grid + Hero Visual Split · nav: N1b Canonical SaaS · footer: Ft5 Statement
 * genre: modern-minimal (authentic editorial photographic warm-community inflection) · theme: Hum
 * paper-band: light (> 85%) · display-style: rounded humanist sans · accent-hue: warm amber (48°)
 * audience: 종교단체 운영진 · use-case: 서비스 신청하기 · tone: 따뜻·공동체
 */

/* ── Responsive + component CSS ──────────────────────────────── */
const ROOT_CSS = `
  /* Nav */
  .rp-nav-links { display: none; }

  /* Hero Layout */
  .rp-hero-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 48px;
    align-items: center;
  }

  .rp-hero-title {
    font-size: clamp(34px, 5.5vw, 64px);
    font-weight: 900;
    line-height: 1.12;
    letter-spacing: -0.04em;
    color: var(--hm-warm-ink);
    overflow-wrap: anywhere;
    min-width: 0;
  }

  .rp-hero-img-wrap {
    position: relative;
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
  }

  .rp-hero-img {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 24px;
    box-shadow: 0 20px 50px -10px oklch(0.14 0.025 50 / 0.18), 0 0 0 1px var(--hm-warm-border);
    transition: transform 300ms ease;
  }
  .rp-hero-img-wrap:hover .rp-hero-img {
    transform: translateY(-4px);
  }

  /* Bento grid */
  .rp-bento {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Dashboard Section */
  .rp-dash-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 44px;
    align-items: center;
  }

  /* Steps */
  .rp-steps { display: flex; flex-direction: column; gap: 16px; }

  /* Religion grid */
  .rp-religion { display: grid; grid-template-columns: 1fr; gap: 16px; }

  /* Footer row */
  .rp-footer-row { flex-direction: column; gap: 24px; align-items: flex-start; }
  .rp-footer-links { gap: 16px; flex-wrap: wrap; }

  /* Section header */
  .rp-section-h2 {
    font-size: clamp(24px, 4vw, 40px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--hm-warm-ink);
    line-height: 1.15;
    overflow-wrap: anywhere;
    min-width: 0;
  }

  /* ── Buttons ── */
  .rp-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    height: 50px; padding: 0 26px;
    background: var(--hm-warm-amber);
    color: white; border: none; border-radius: 12px;
    font-family: inherit; font-size: 14.5px; font-weight: 700;
    cursor: pointer; white-space: nowrap;
    box-shadow: 0 4px 20px var(--hm-warm-amber-glow);
    transition: background 180ms, transform 150ms, box-shadow 180ms;
  }
  .rp-btn-primary:hover { background: var(--hm-warm-amber-dim); transform: translateY(-2px); box-shadow: 0 8px 30px var(--hm-warm-amber-glow); }
  .rp-btn-primary:active { transform: translateY(0); }
  .rp-btn-primary:focus-visible { outline: 2px solid var(--hm-warm-amber); outline-offset: 3px; }

  .rp-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    height: 50px; padding: 0 24px;
    background: transparent; color: var(--hm-warm-ink-2);
    border: 1.5px solid var(--hm-warm-border); border-radius: 12px;
    font-family: inherit; font-size: 14.5px; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: border-color 180ms, color 180ms, background 180ms;
  }
  .rp-btn-ghost:hover { border-color: var(--hm-warm-amber-border); color: var(--hm-warm-amber); background: var(--hm-warm-amber-bg); }
  .rp-btn-ghost:focus-visible { outline: 2px solid var(--hm-warm-amber); outline-offset: 3px; }

  /* Chip */
  .rp-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 16px; border-radius: 20px;
    background: var(--hm-warm-amber-bg); border: 1px solid var(--hm-warm-amber-border);
    color: var(--hm-warm-amber); font-family: var(--font-mono);
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  }

  /* Feature card */
  .rp-feat {
    background: white; border: 1px solid var(--hm-warm-border);
    border-radius: 20px; padding: 32px;
    transition: box-shadow 200ms, transform 200ms, border-color 200ms;
  }
  .rp-feat:hover {
    box-shadow: 0 12px 40px oklch(0.14 0.015 55 / 0.08);
    transform: translateY(-3px); border-color: var(--hm-warm-amber-border);
  }
  .rp-feat-large {
    background: linear-gradient(145deg, var(--hm-warm-amber-bg) 0%, white 100%);
    border-color: var(--hm-warm-amber-border);
  }

  /* Step card */
  .rp-step {
    flex: 1; padding: 32px 24px;
    background: white; border: 1px solid var(--hm-warm-border);
    border-radius: 18px; position: relative;
    transition: box-shadow 200ms;
  }
  .rp-step:hover { box-shadow: 0 8px 30px oklch(0.14 0.015 55 / 0.08); }

  /* Religion card */
  .rp-rel-card {
    border-radius: 20px; padding: 36px 24px;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    text-align: center; border: 1px solid transparent;
    transition: transform 200ms, box-shadow 200ms;
  }
  .rp-rel-card:hover { transform: translateY(-4px); box-shadow: 0 14px 44px oklch(0.14 0.015 55 / 0.10); }

  /* Animations */
  @keyframes rp-fade-up {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .rp-up   { animation: rp-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .rp-in   { animation: rp-fade-in 0.5s ease both; }
  .rp-d1   { animation-delay: 60ms; }
  .rp-d2   { animation-delay: 160ms; }
  .rp-d3   { animation-delay: 260ms; }
  .rp-d4   { animation-delay: 360ms; }

  /* ── Responsive breakpoints ── */
  @media (min-width: 540px) {
    .rp-bento    { grid-template-columns: repeat(2, 1fr); }
    .rp-religion { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 768px) {
    .rp-nav-links { display: flex; }
    .rp-steps { flex-direction: row; }
    .rp-footer-row { flex-direction: row; align-items: center; }
    .rp-footer-links { gap: 28px; }
  }
  @media (min-width: 1024px) {
    .rp-hero-container { grid-template-columns: 1fr 1fr; }
    .rp-dash-grid { grid-template-columns: 1.05fr 0.95fr; }
    .rp-bento { grid-template-columns: repeat(3, 1fr); }
    .rp-bento-large { grid-column: span 2; }
  }

  @media (max-width: 767px) {
    .rp-nav-text { display: none; }
  }
`;

const STEPS = [
  { num: '01', title: '단체 정보 입력', desc: '단체 이름, 종교 유형, 연락처를 입력합니다. 5분이면 준비 완료입니다.' },
  { num: '02', title: '봉헌 항목 설정', desc: '헌금·보시·봉헌 항목을 자유롭게 추가하고 고정/자율 금액을 지정하세요.' },
  { num: '03', title: '링크 공유 후 시작', desc: '발급된 전용 단체 페이지 URL을 성도·불자·교우에게 공유하면 됩니다.' },
];

const SMALL_FEATURES = [
  {
    icon: <BarChart3 size={24} color="var(--hm-warm-amber)" />,
    title: '실시간 정산 · 통계 리포트',
    desc: '봉헌 현황을 실시간 모니터링하고 월별 정산 보고서를 자동으로 발행합니다.',
  },
  {
    icon: <Shield size={24} color="var(--hm-warm-amber)" />,
    title: 'PCI-DSS 결제 보안 인증',
    desc: '국제 결제 보안 표준을 완벽히 준수하여 소중한 봉헌금을 안전하게 보호합니다.',
  },
  {
    icon: <Smartphone size={24} color="var(--hm-warm-amber)" />,
    title: '모바일 PWA 앱 지원',
    desc: '별도 스토어 다운로드 없이 홈화면에 바로 앱 아이콘으로 설치 및 사용할 수 있습니다.',
  },
  {
    icon: <Repeat size={24} color="var(--hm-warm-amber)" />,
    title: '정기 봉헌 자동 관리',
    desc: '매월 설정한 날짜에 정기 헌금/보시가 자동으로 처리되어 관리가 쉬워집니다.',
  },
];

const RELIGIONS: { id: ReligionId; label: string; sub: string }[] = [
  { id: 'protestant', label: '기독교', sub: '교회 · 헌금/십일조 관리' },
  { id: 'buddhist',   label: '불교',   sub: '사찰 · 인등보시/불사 관리' },
  { id: 'catholic',   label: '천주교', sub: '성당 · 교무금/미사예물 관리' },
];

export default function Root() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--hm-warm-paper)',
      color: 'var(--hm-warm-ink)',
      fontFamily: 'var(--font-ui)',
      overflowX: 'clip',
    }}>
      <style>{ROOT_CSS}</style>

      {/* ══ Nav ════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'oklch(0.99 0.006 80 / 0.92)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--hm-warm-border)',
        height: 60, padding: '0 clamp(16px, 4vw, 40px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--hm-warm-amber) 0%, var(--hm-warm-amber-dim) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px var(--hm-warm-amber-glow)',
          }}>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 900, letterSpacing: '-0.02em' }}>FP</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--hm-warm-ink)', letterSpacing: '-0.03em' }}>FaithPay</span>
        </div>

        {/* Center links */}
        <div className="rp-nav-links" style={{ display: 'flex', gap: 4 }}>
          {[
            { label: '서비스 특징', href: '#features' },
            { label: '관리자 대시보드', href: '#dashboard' },
            { label: '시작 방법', href: '#how' },
            { label: '지원 종교', href: '#religions' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '6px 14px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, color: 'var(--hm-warm-ink-3)',
                fontFamily: 'inherit', textDecoration: 'none',
                transition: 'color 150ms, background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--hm-warm-ink)'; e.currentTarget.style.background = 'var(--hm-warm-paper-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--hm-warm-ink-3)'; e.currentTarget.style.background = 'transparent'; }}
            >{label}</a>
          ))}
        </div>

        {/* Right buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/admin/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 6, fontFamily: 'inherit',
              fontSize: 13, fontWeight: 500, color: 'var(--hm-warm-ink-3)',
              transition: 'color 150ms', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--hm-warm-ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--hm-warm-ink-3)'}
          >
            <span className="rp-nav-text">관리자 </span>로그인
          </button>
          <button
            className="rp-btn-primary"
            onClick={() => navigate('/onboarding')}
            style={{ height: 38, padding: '0 18px', fontSize: 13, borderRadius: 9 }}
          >
            서비스 신청
          </button>
        </div>
      </nav>

      {/* ══ HERO WITH AUTHENTIC EDITORIAL PHOTOGRAPH ═══════════════ */}
      <section style={{
        maxWidth: 1160, margin: '0 auto',
        padding: 'clamp(56px, 8vw, 96px) clamp(16px, 4vw, 40px) clamp(48px, 6vw, 80px)',
      }}>
        <div className="rp-hero-container">
          {/* Left Hero Text */}
          <div className="rp-up rp-d1">
            <div className="rp-chip" style={{ marginBottom: 24 }}>
              <Heart size={13} fill="var(--hm-warm-amber)" color="var(--hm-warm-amber)" /> 정성을 담는 스마트 종교 봉헌 서비스
            </div>

            <h1 className="rp-hero-title">
              마음으로 드리는<br />
              <span style={{ color: 'var(--hm-warm-amber)' }}>진정성 있는 온라인 봉헌</span>
            </h1>

            <p style={{
              fontSize: 'clamp(15px, 2vw, 17.5px)',
              color: 'var(--hm-warm-ink-2)', lineHeight: 1.75,
              margin: '20px 0 36px', maxWidth: 480,
            }}>
              기독교 · 불교 · 천주교 교인을 위한 따뜻하고 정갈한 봉헌 플랫폼.<br />
              복잡한 절차 없이 5분 만에 우리 단체 전용 공간을 개설하세요.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="rp-btn-primary" onClick={() => navigate('/onboarding')}>
                우리 단체 신청하기 <ArrowRight size={16} />
              </button>
              <button
                className="rp-btn-ghost"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                기능 살펴보기
              </button>
            </div>

            {/* Security Badges */}
            <div style={{
              marginTop: 40, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
            }}>
              {[
                ['🔒', 'ISMS-P', '보안 인증'],
                ['💳', 'PCI-DSS', '결제준수'],
                ['🔐', 'SSL 256-bit', '암호화'],
              ].map(([icon, key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--hm-warm-amber)' }}>{key}</span>
                  <span style={{ fontSize: 11, color: 'var(--hm-warm-ink-3)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Hero Image (Authentic Editorial Photography) */}
          <div className="rp-hero-img-wrap rp-up rp-d2">
            <img
              src="/faithpay/images/hero-illustration.png"
              alt="진정성을 담은 두 손과 따뜻한 봉헌의 모습"
              className="rp-hero-img"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/hero-illustration.png';
              }}
            />
          </div>
        </div>
      </section>

      {/* ══ FEATURE BENTO ═══════════════════════════════════════════ */}
      <section id="features" style={{
        maxWidth: 1160, margin: '0 auto',
        padding: 'clamp(48px, 7vw, 80px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div className="rp-chip" style={{ marginBottom: 14 }}>서비스 핵심 가치</div>
          <h2 className="rp-section-h2">왜 FaithPay인가요?</h2>
          <p style={{ fontSize: 15, color: 'var(--hm-warm-ink-3)', marginTop: 10, lineHeight: 1.65 }}>
            종교 단체의 고유한 봉헌 문화와 정산 체계에 맞춰 세밀하게 설계되었습니다.
          </p>
        </div>

        <div className="rp-bento">
          {/* Large featured card */}
          <div className="rp-feat rp-feat-large rp-bento-large">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>🕌</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--hm-warm-amber)', background: 'white', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--hm-warm-amber-border)' }}>
                맞춤형 템플릿
              </span>
            </div>
            <h3 style={{
              fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
              color: 'var(--hm-warm-ink)', marginBottom: 12,
            }}>
              종교별 전통과 용어를 반영한 전용 봉헌 페이지
            </h3>
            <p style={{ fontSize: 14, color: 'var(--hm-warm-ink-2)', lineHeight: 1.75, maxWidth: 520, marginBottom: 20 }}>
              기독교(십일조·감사헌금·건축헌금), 불교(인등보시·불사공양·기도보시), 천주교(교무금·미사예물) 등
              각 종교 단체의 명칭과 성격을 그대로 녹여낸 전용 페이지가 제공됩니다.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['⛪ 개신교 헌금', '🪷 불교 보시', '✝️ 천주교 봉헌'].map(item => (
                <span key={item} style={{
                  padding: '6px 14px', background: 'white', border: '1px solid var(--hm-warm-amber-border)',
                  borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--hm-warm-ink-2)',
                  boxShadow: '0 2px 6px oklch(0.14 0.015 55 / 0.04)',
                }}>{item}</span>
              ))}
            </div>
          </div>

          {/* Small feature cards */}
          {SMALL_FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="rp-feat">
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--hm-warm-amber-bg)', border: '1px solid var(--hm-warm-amber-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                {icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hm-warm-ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                {title}
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--hm-warm-ink-3)', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ DASHBOARD VISUAL SHOWCASE (REALISTIC LIFESTYLE) ═════════ */}
      <section id="dashboard" style={{
        background: 'linear-gradient(180deg, var(--hm-warm-paper) 0%, var(--hm-warm-paper-2) 100%)',
        borderTop: '1px solid var(--hm-warm-border)',
        borderBottom: '1px solid var(--hm-warm-border)',
        padding: 'clamp(64px, 8vw, 96px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="rp-dash-grid">
            {/* Dashboard Real Photo */}
            <div style={{ position: 'relative' }}>
              <img
                src="/faithpay/images/dashboard-mockup.png"
                alt="실제 데스크 환경에서 활용되는 FaithPay 관리자 시스템"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 20,
                  boxShadow: '0 24px 60px -12px oklch(0.14 0.025 50 / 0.18), 0 0 0 1px var(--hm-warm-border)',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/dashboard-mockup.png';
                }}
              />
            </div>

            {/* Dashboard Info */}
            <div>
              <div className="rp-chip" style={{ marginBottom: 16 }}>체계적인 관리자 시스템</div>
              <h2 className="rp-section-h2" style={{ marginBottom: 16 }}>
                한눈에 파악하는<br />
                <span style={{ color: 'var(--hm-warm-amber)' }}>실시간 봉헌 통계 및 대시보드</span>
              </h2>
              <p style={{ fontSize: 15, color: 'var(--hm-warm-ink-2)', lineHeight: 1.75, marginBottom: 28 }}>
                어떤 봉헌 항목이 얼마나 수납되었는지 한눈에 보고서로 확인하세요.<br />
                기간별 통계, 기부금 영수증 발급 관리, 수납 내역 엑셀 다운로드까지 스마트하게 지원됩니다.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  '실시간 봉헌 내역 및 모금 현황 대시보드',
                  '월별 / 항목별 자동 통계 보고서 생성',
                  '투명하고 정교한 회원 및 수납 데이터 통합 관리',
                ].map((text) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: 'var(--hm-warm-amber-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CheckCircle size={14} color="var(--hm-warm-amber)" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--hm-warm-ink)' }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 32 }}>
                <button className="rp-btn-ghost" onClick={() => navigate('/admin/login')}>
                  관리자 기능 미리보기 →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — 3 steps ══════════════════════════════════ */}
      <section id="how" style={{
        maxWidth: 1040, margin: '0 auto',
        padding: 'clamp(64px, 8vw, 96px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="rp-chip" style={{ marginBottom: 14 }}>간편한 가입 절차</div>
          <h2 className="rp-section-h2">복잡한 설정 없이 3단계로 끝</h2>
        </div>

        <div className="rp-steps">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="rp-step">
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 900,
                color: 'var(--hm-warm-amber-border)', letterSpacing: '-0.04em',
                lineHeight: 1, marginBottom: 16,
              }}>
                {num}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--hm-warm-ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                {title}
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--hm-warm-ink-3)', lineHeight: 1.7 }}>{desc}</p>

              <div style={{
                position: 'absolute', top: 28, right: 24,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--hm-warm-amber-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={15} color="var(--hm-warm-amber)" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ RELIGION COVERAGE ════════════════════════════════════════ */}
      <section id="religions" style={{
        maxWidth: 960, margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 40px) clamp(64px, 8vw, 96px)',
        textAlign: 'center',
      }}>
        <div className="rp-chip" style={{ marginBottom: 14 }}>맞춤형 종교 플랫폼</div>
        <h2 className="rp-section-h2" style={{ marginBottom: 10 }}>
          모든 종교 공동체를 위한 전용 솔루션
        </h2>
        <p style={{ fontSize: 14.5, color: 'var(--hm-warm-ink-3)', lineHeight: 1.7, maxWidth: 500, margin: '12px auto 44px' }}>
          FaithPay는 기독교, 불교, 천주교 각 공동체의 언어와 예배 문화를 존중하고 성심껏 지원합니다.
        </p>

        <div className="rp-religion">
          {RELIGIONS.map(({ id, label, sub }) => {
            const ft = FAITH_THEMES[id];
            return (
              <div
                key={id}
                className="rp-rel-card"
                style={{ background: ft.primaryBg, borderColor: `${ft.primary}28` }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 18, background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 24px ${ft.primary}25`,
                }}>
                  <Motif kind={ft.motif} size={30} color={ft.primary} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--hm-warm-ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--hm-warm-ink-3)' }}>{sub}</div>
                </div>
                <div style={{ fontSize: 12, color: ft.primary, fontWeight: 700, background: 'white', padding: '5px 14px', borderRadius: 8, border: `1px solid ${ft.primary}30` }}>
                  {ft.name}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ FINAL CTA WITH AUTHENTIC SANCTUARY PHOTO ═════════════════ */}
      <section style={{
        position: 'relative',
        padding: 'clamp(80px, 10vw, 120px) clamp(16px, 4vw, 40px)',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Authentic Sanctuary Background Image */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
        }}>
          <img
            src="/faithpay/images/community-banner.png"
            alt="평화로운 성소와 햇살"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, filter: 'blur(1px)' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/images/community-banner.png';
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, var(--hm-warm-paper-deep) 0%, oklch(0.12 0.022 45) 100%)',
            mixBlendMode: 'multiply',
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <div className="rp-chip" style={{
            marginBottom: 22,
            background: 'oklch(0.62 0.18 48 / 0.20)',
            border: '1px solid oklch(0.62 0.18 48 / 0.35)',
            color: 'oklch(0.88 0.10 65)',
          }}>
            신청 즉시 서비스 이용 가능
          </div>

          <h2 style={{
            fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 900,
            letterSpacing: '-0.04em', lineHeight: 1.15, color: 'white',
            marginBottom: 18, overflowWrap: 'anywhere', minWidth: 0,
          }}>
            우리 단체의 온라인 봉헌,<br />
            <span style={{ color: 'var(--hm-warm-amber)' }}>지금 바로 도입해 보세요</span>
          </h2>

          <p style={{
            fontSize: 16, color: 'oklch(0.80 0.010 70)',
            lineHeight: 1.75, marginBottom: 40,
          }}>
            가입비 없이 무료로 시작하고, 성도 및 부모님도 사용하기 편한<br />
            FaithPay의 스마트 봉헌 솔루션을 경험하세요.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="rp-btn-primary"
              onClick={() => navigate('/onboarding')}
              style={{ height: 50, padding: '0 28px', fontSize: 15, boxShadow: '0 6px 30px oklch(0.62 0.18 48 / 0.50)' }}
            >
              지금 서비스 신청하기 <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 50, padding: '0 24px',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 12, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 180ms', whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >
              관리자 로그인
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════════ */}
      <footer style={{
        background: 'var(--hm-warm-paper-deep)',
        borderTop: '1px solid oklch(0.62 0.18 48 / 0.12)',
        padding: 'clamp(28px, 4vw, 40px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="rp-footer-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--hm-warm-amber)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>FP</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'oklch(0.85 0.010 70)', letterSpacing: '-0.02em' }}>FaithPay</span>
            </div>

            {/* Links */}
            <div className="rp-footer-links" style={{ display: 'flex', alignItems: 'center' }}>
              {[
                { label: '서비스 특징', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: '관리자 대시보드', action: () => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: '관리자 로그인', action: () => navigate('/admin/login') },
                { label: '서비스 신청', action: () => navigate('/onboarding') },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'oklch(0.55 0.010 65)', fontFamily: 'inherit',
                    transition: 'color 150ms', padding: '4px 0', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'oklch(0.80 0.010 70)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'oklch(0.55 0.010 65)'}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Legal */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'oklch(0.45 0.008 60)', letterSpacing: '0.03em',
              textAlign: 'right', lineHeight: 1.6,
            }}>
              ISMS-P · PCI-DSS · SSL 256-bit<br />
              © 2026 FaithPay Platform
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
