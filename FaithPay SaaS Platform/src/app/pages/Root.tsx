import { useNavigate } from 'react-router';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif } from '../components/Motif';
import { Shield, Repeat, Smartphone, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

/* Hallmark · pre-emit critique: P5 H5 E4 S4 R5 V5
 * macrostructure: Bento Grid · nav: N1b Canonical SaaS · footer: Ft5 Statement
 * genre: modern-minimal (warm-community inflection) · theme: Hum
 * paper-band: light (> 85%) · display-style: rounded humanist sans · accent-hue: warm amber (48°)
 * audience: 종교단체 운영진 · use-case: 서비스 신청하기 · tone: 따뜻·공동체
 * prev: H2-Split Diptych (Cobalt-01) · differs: structure + display-style + accent-hue (3/3 axes)
 */

/* ── Responsive + component CSS ──────────────────────────────── */
const ROOT_CSS = `
  /* Nav */
  .rp-nav-links { display: none; }

  /* Hero */
  .rp-hero-title {
    font-size: clamp(34px, 6.5vw, 76px);
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.04em;
    color: var(--hm-warm-ink);
    overflow-wrap: anywhere;
    min-width: 0;
  }

  /* Bento grid */
  .rp-bento {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Steps */
  .rp-steps { display: flex; flex-direction: column; gap: 14px; }

  /* Religion grid */
  .rp-religion { display: grid; grid-template-columns: 1fr; gap: 14px; }

  /* Footer row */
  .rp-footer-row { flex-direction: column; gap: 24px; align-items: flex-start; }
  .rp-footer-links { gap: 16px; flex-wrap: wrap; }

  /* Section header */
  .rp-section-h2 {
    font-size: clamp(24px, 4vw, 38px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--hm-warm-ink);
    line-height: 1.15;
    overflow-wrap: anywhere;
    min-width: 0;
  }

  /* ── Buttons ── */
  .rp-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    height: 48px; padding: 0 24px;
    background: var(--hm-warm-amber);
    color: white; border: none; border-radius: 10px;
    font-family: inherit; font-size: 14px; font-weight: 700;
    cursor: pointer; white-space: nowrap;
    box-shadow: 0 2px 16px var(--hm-warm-amber-glow);
    transition: background 180ms, transform 150ms, box-shadow 180ms;
  }
  .rp-btn-primary:hover { background: var(--hm-warm-amber-dim); transform: translateY(-2px); box-shadow: 0 6px 28px var(--hm-warm-amber-glow); }
  .rp-btn-primary:active { transform: translateY(0); }
  .rp-btn-primary:focus-visible { outline: 2px solid var(--hm-warm-amber); outline-offset: 3px; }

  .rp-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    height: 48px; padding: 0 24px;
    background: transparent; color: var(--hm-warm-ink-2);
    border: 1.5px solid var(--hm-warm-border); border-radius: 10px;
    font-family: inherit; font-size: 14px; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: border-color 180ms, color 180ms, background 180ms;
  }
  .rp-btn-ghost:hover { border-color: var(--hm-warm-amber-border); color: var(--hm-warm-amber); background: var(--hm-warm-amber-bg); }
  .rp-btn-ghost:focus-visible { outline: 2px solid var(--hm-warm-amber); outline-offset: 3px; }

  /* Chip */
  .rp-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 20px;
    background: var(--hm-warm-amber-bg); border: 1px solid var(--hm-warm-amber-border);
    color: var(--hm-warm-amber); font-family: var(--font-mono);
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  }

  /* Feature card */
  .rp-feat {
    background: white; border: 1px solid var(--hm-warm-border);
    border-radius: 18px; padding: 28px;
    transition: box-shadow 200ms, transform 200ms, border-color 200ms;
  }
  .rp-feat:hover {
    box-shadow: 0 8px 36px oklch(0.14 0.015 55 / 0.08);
    transform: translateY(-3px); border-color: var(--hm-warm-amber-border);
  }
  .rp-feat-large {
    background: var(--hm-warm-amber-bg); border-color: var(--hm-warm-amber-border);
  }

  /* Step card */
  .rp-step {
    flex: 1; padding: 28px 24px;
    background: white; border: 1px solid var(--hm-warm-border);
    border-radius: 16px; position: relative;
    transition: box-shadow 200ms;
  }
  .rp-step:hover { box-shadow: 0 6px 24px oklch(0.14 0.015 55 / 0.07); }

  /* Religion card */
  .rp-rel-card {
    border-radius: 18px; padding: 36px 24px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    text-align: center; border: 1px solid transparent;
    transition: transform 200ms, box-shadow 200ms;
  }
  .rp-rel-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px oklch(0.14 0.015 55 / 0.09); }

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
    .rp-bento   { grid-template-columns: repeat(2, 1fr); }
    .rp-religion { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 768px) {
    .rp-nav-links { display: flex; }
    .rp-steps { flex-direction: row; }
    .rp-footer-row { flex-direction: row; align-items: center; }
    .rp-footer-links { gap: 28px; }
  }
  @media (min-width: 1024px) {
    .rp-bento { grid-template-columns: repeat(3, 1fr); }
    .rp-bento-large { grid-column: span 2; }
  }

  /* Prevent two-line nav items */
  @media (max-width: 767px) {
    .rp-nav-text { display: none; }
  }
`;

const STEPS = [
  { num: '01', title: '단체 정보 입력', desc: '단체 이름, 종교 유형, 연락처를 입력합니다. 5분이면 충분합니다.' },
  { num: '02', title: '봉헌 항목 설정', desc: '헌금·보시·봉헌 항목을 자유롭게 추가하고 금액 방식을 설정합니다.' },
  { num: '03', title: '링크 공유 후 시작', desc: '생성된 단체 페이지 링크를 성도·불자·교우에게 공유하세요.' },
];

const SMALL_FEATURES = [
  {
    icon: <BarChart3 size={22} color="var(--hm-warm-amber)" />,
    title: '실시간 정산 · 통계',
    desc: '봉헌 현황을 실시간으로 확인하고 월별 정산 보고서를 자동 생성합니다.',
  },
  {
    icon: <Shield size={22} color="var(--hm-warm-amber)" />,
    title: 'PCI-DSS 결제 보안',
    desc: '국제 결제 보안 표준을 준수해 봉헌금이 안전하게 처리됩니다.',
  },
  {
    icon: <Smartphone size={22} color="var(--hm-warm-amber)" />,
    title: '모바일 최적화 · PWA',
    desc: '스마트폰에서 간편하게. 앱처럼 홈화면에 추가할 수 있습니다.',
  },
  {
    icon: <Repeat size={22} color="var(--hm-warm-amber)" />,
    title: '정기 봉헌 자동화',
    desc: '월 정기 봉헌을 설정하면 매달 자동으로 처리됩니다.',
  },
];

const RELIGIONS: { id: ReligionId; label: string; sub: string }[] = [
  { id: 'protestant', label: '기독교', sub: '교회 · 헌금 관리' },
  { id: 'buddhist',   label: '불교',   sub: '사찰 · 보시 관리' },
  { id: 'catholic',   label: '천주교', sub: '성당 · 봉헌 관리' },
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

      {/* ══ N1b Canonical SaaS Nav ══════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'oklch(0.99 0.006 80 / 0.90)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--hm-warm-border)',
        height: 56, padding: '0 clamp(16px, 4vw, 40px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--hm-warm-amber) 0%, var(--hm-warm-amber-dim) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px var(--hm-warm-amber-glow)',
          }}>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 900, letterSpacing: '-0.02em' }}>FP</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--hm-warm-ink)', letterSpacing: '-0.03em' }}>FaithPay</span>
        </div>

        {/* Center links — tablet+ */}
        <div className="rp-nav-links" style={{ display: 'flex', gap: 2 }}>
          {[
            { label: '서비스 소개', href: '#features' },
            { label: '시작 방법', href: '#how' },
            { label: '지원 종교', href: '#religions' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '6px 12px', borderRadius: 7,
                fontSize: 13, fontWeight: 500, color: 'var(--hm-warm-ink-3)',
                fontFamily: 'inherit', textDecoration: 'none',
                transition: 'color 150ms, background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--hm-warm-ink)'; e.currentTarget.style.background = 'var(--hm-warm-paper-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--hm-warm-ink-3)'; e.currentTarget.style.background = 'transparent'; }}
            >{label}</a>
          ))}
        </div>

        {/* Right: admin + CTA */}
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
            <span className="rp-nav-text">관리자</span>
            <span style={{ display: 'none' }} className="rp-nav-mobile">로그인</span>
            <span className="rp-nav-text"> 로그인</span>
          </button>
          <button
            className="rp-btn-primary"
            onClick={() => navigate('/onboarding')}
            style={{ height: 36, padding: '0 16px', fontSize: 13, borderRadius: 8 }}
          >
            서비스 신청
          </button>
        </div>
      </nav>

      {/* ══ HERO — centered, warm ══════════════════════════════════ */}
      <section style={{
        maxWidth: 860, margin: '0 auto',
        padding: 'clamp(72px, 10vw, 128px) clamp(16px, 4vw, 40px) clamp(56px, 8vw, 96px)',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div className="rp-chip rp-in" style={{ marginBottom: 28 }}>
          ✦ 종교 단체 전용 온라인 봉헌 플랫폼
        </div>

        {/* Headline */}
        <h1 className="rp-hero-title rp-up rp-d1">
          마음을 담은<br />
          <span style={{ color: 'var(--hm-warm-amber)' }}>봉헌, 이제 온라인으로</span>
        </h1>

        {/* Body */}
        <p className="rp-up rp-d2" style={{
          fontSize: 'clamp(15px, 2.2vw, 18px)',
          color: 'var(--hm-warm-ink-2)', lineHeight: 1.75,
          maxWidth: 520, margin: '20px auto 36px',
        }}>
          기독교 · 불교 · 천주교를 위한 하나의 봉헌 플랫폼.<br />
          복잡한 설치 없이, 오늘 바로 우리 단체만의 봉헌 페이지를 시작하세요.
        </p>

        {/* CTAs */}
        <div className="rp-up rp-d3" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="rp-btn-primary" id="hero-cta" onClick={() => navigate('/onboarding')}>
            서비스 신청하기 <ArrowRight size={16} />
          </button>
          <button
            className="rp-btn-ghost"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            주요 기능 보기
          </button>
        </div>

        {/* Security strip */}
        <div className="rp-up rp-d4" style={{
          marginTop: 48, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {[
            ['🔒', 'ISMS-P', '정보보호 인증'],
            ['💳', 'PCI-DSS', '결제 보안'],
            ['🔐', 'SSL 256-bit', '암호화'],
          ].map(([icon, key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--hm-warm-amber)' }}>{key}</span>
              <span style={{ fontSize: 11, color: 'var(--hm-warm-ink-3)' }}>{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURE BENTO ═══════════════════════════════════════════ */}
      <section id="features" style={{
        maxWidth: 1160, margin: '0 auto',
        padding: 'clamp(48px, 7vw, 80px) clamp(16px, 4vw, 40px)',
      }}>
        {/* Section header */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div className="rp-chip" style={{ marginBottom: 14 }}>주요 기능</div>
          <h2 className="rp-section-h2">FaithPay가 선택받는 이유</h2>
          <p style={{ fontSize: 15, color: 'var(--hm-warm-ink-3)', marginTop: 10, lineHeight: 1.65 }}>
            종교 단체의 봉헌 문화와 용어를 정확히 이해하고 반영합니다.
          </p>
        </div>

        <div className="rp-bento">
          {/* ── Large featured card ── */}
          <div className="rp-feat rp-feat-large rp-bento-large" style={{ minHeight: 240 }}>
            <div style={{ fontSize: 40, marginBottom: 18, lineHeight: 1 }}>🕍</div>
            <h3 style={{
              fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
              color: 'var(--hm-warm-ink)', marginBottom: 10,
            }}>
              종교별 맞춤 봉헌 항목
            </h3>
            <p style={{ fontSize: 14, color: 'var(--hm-warm-ink-2)', lineHeight: 1.75, maxWidth: 400 }}>
              기독교(십일조·감사헌금·건축헌금), 불교(인등보시·불사공양), 천주교(교무금·미사예물)에 맞는
              전용 항목과 용어가 자동으로 구성됩니다. 각 종교의 고유한 전통과 문화를 존중합니다.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['기독교', '불교', '천주교'].map(r => (
                <span key={r} style={{
                  padding: '5px 12px',
                  background: 'white', border: '1px solid var(--hm-warm-amber-border)',
                  borderRadius: 7, fontSize: 12, fontWeight: 700,
                  color: 'var(--hm-warm-amber)',
                }}>{r}</span>
              ))}
            </div>
          </div>

          {/* ── Small feature cards ── */}
          {SMALL_FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="rp-feat">
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: 'var(--hm-warm-amber-bg)', border: '1px solid var(--hm-warm-amber-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--hm-warm-ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                {title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--hm-warm-ink-3)', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS — 3 steps ══════════════════════════════════ */}
      <section id="how" style={{
        background: 'var(--hm-warm-paper-2)',
        borderTop: '1px solid var(--hm-warm-border)',
        borderBottom: '1px solid var(--hm-warm-border)',
        padding: 'clamp(48px, 7vw, 80px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="rp-chip" style={{ marginBottom: 14 }}>시작하기</div>
            <h2 className="rp-section-h2">단 3단계로 시작합니다</h2>
          </div>

          <div className="rp-steps">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="rp-step">
                {/* Step number — decorative */}
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 900,
                  color: 'var(--hm-warm-amber-bg)', letterSpacing: '-0.04em',
                  lineHeight: 1, marginBottom: 16, userSelect: 'none',
                  textShadow: '0 0 0 var(--hm-warm-amber)',
                }}>
                  <span style={{ color: 'var(--hm-warm-amber-border)' }}>{num}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hm-warm-ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--hm-warm-ink-3)', lineHeight: 1.7 }}>{desc}</p>

                {/* Check icon */}
                <div style={{
                  position: 'absolute', top: 24, right: 24,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--hm-warm-amber-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={14} color="var(--hm-warm-amber)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RELIGION COVERAGE ════════════════════════════════════════ */}
      <section id="religions" style={{
        maxWidth: 920, margin: '0 auto',
        padding: 'clamp(48px, 7vw, 80px) clamp(16px, 4vw, 40px)',
        textAlign: 'center',
      }}>
        <div className="rp-chip" style={{ marginBottom: 14 }}>지원 종교</div>
        <h2 className="rp-section-h2" style={{ marginBottom: 10 }}>
          세 종교를 하나의 플랫폼으로
        </h2>
        <p style={{ fontSize: 14, color: 'var(--hm-warm-ink-3)', lineHeight: 1.7, marginBottom: 44, maxWidth: 480, margin: '10px auto 44px' }}>
          FaithPay는 기독교, 불교, 천주교 모두의 봉헌 문화와 용어를 정확히 이해하고 지원합니다.
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
                  width: 60, height: 60, borderRadius: 16, background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 20px ${ft.primary}22`,
                }}>
                  <Motif kind={ft.motif} size={28} color={ft.primary} />
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--hm-warm-ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--hm-warm-ink-3)' }}>{sub}</div>
                </div>
                <div style={{ fontSize: 12, color: ft.primary, fontWeight: 600, background: 'white', padding: '4px 12px', borderRadius: 6, border: `1px solid ${ft.primary}30` }}>
                  {ft.name}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ FINAL CTA — warm dark ════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(150deg, var(--hm-warm-paper-deep) 0%, oklch(0.12 0.020 48) 100%)',
        padding: 'clamp(64px, 9vw, 112px) clamp(16px, 4vw, 40px)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Warm ambient glow */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480, height: 320,
          background: 'oklch(0.62 0.18 48 / 0.10)',
          borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="rp-chip" style={{
            marginBottom: 22,
            background: 'oklch(0.62 0.18 48 / 0.15)',
            border: '1px solid oklch(0.62 0.18 48 / 0.28)',
            color: 'oklch(0.82 0.10 65)',
          }}>
            지금 시작하기
          </div>

          <h2 style={{
            fontSize: 'clamp(30px, 5.5vw, 56px)', fontWeight: 900,
            letterSpacing: '-0.04em', lineHeight: 1.1, color: 'white',
            marginBottom: 16, overflowWrap: 'anywhere', minWidth: 0,
          }}>
            우리 단체도<br />
            <span style={{ color: 'var(--hm-warm-amber)' }}>오늘 바로 시작할 수 있습니다</span>
          </h2>

          <p style={{
            fontSize: 15, color: 'oklch(0.72 0.010 70)',
            lineHeight: 1.75, maxWidth: 440, margin: '0 auto 40px',
          }}>
            복잡한 계약 없이, 단체 정보만 입력하면 즉시 봉헌 페이지가 생성됩니다.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="cta-apply"
              className="rp-btn-primary"
              onClick={() => navigate('/onboarding')}
              style={{ boxShadow: '0 4px 28px oklch(0.62 0.18 48 / 0.45)' }}
            >
              서비스 신청하기 <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 48, padding: '0 24px',
                background: 'transparent',
                color: 'oklch(0.72 0.010 70)',
                border: '1.5px solid oklch(0.62 0.18 48 / 0.32)',
                borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 180ms', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'oklch(0.62 0.18 48 / 0.65)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'oklch(0.62 0.18 48 / 0.32)'; e.currentTarget.style.color = 'oklch(0.72 0.010 70)'; }}
            >
              관리자 로그인
            </button>
          </div>
        </div>
      </section>

      {/* ══ Ft5 Statement Footer ═════════════════════════════════════ */}
      <footer style={{
        background: 'var(--hm-warm-paper-deep)',
        borderTop: '1px solid oklch(0.62 0.18 48 / 0.12)',
        padding: 'clamp(24px, 4vw, 36px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="rp-footer-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'var(--hm-warm-amber)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>FP</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'oklch(0.82 0.010 70)', letterSpacing: '-0.02em' }}>FaithPay</span>
            </div>

            {/* Links */}
            <div className="rp-footer-links" style={{ display: 'flex', alignItems: 'center' }}>
              {[
                { label: '서비스 소개', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: '관리자 로그인', action: () => navigate('/admin/login') },
                { label: '서비스 신청', action: () => navigate('/onboarding') },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'oklch(0.52 0.010 65)', fontFamily: 'inherit',
                    transition: 'color 150ms', padding: '4px 0', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'oklch(0.75 0.010 70)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'oklch(0.52 0.010 65)'}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Legal */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'oklch(0.42 0.008 60)', letterSpacing: '0.03em',
              textAlign: 'right', lineHeight: 1.6,
            }}>
              ISMS-P · PCI-DSS · SSL 256-bit<br />
              © 2026 FaithPay
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
