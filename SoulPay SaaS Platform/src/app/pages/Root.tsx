import { useNavigate } from 'react-router';
import { ArrowRight, Check } from 'lucide-react';
import { navigateToAdminPortal } from '../utils/domainUtils';

/* ── Modern Minimal Styles ─────────────────────────────────── */
const ROOT_CSS = `
  .rp-root {
    min-height: 100vh;
    background: #FFFFFF;
    color: #191F28;
    font-family: -apple-system, BlinkMacSystemFont, "Pretendard JP", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    letter-spacing: -0.02em;
    overflow-x: clip;
    -webkit-font-smoothing: antialiased;
  }

  /* Nav Links */
  .rp-nav-links { display: none; }

  /* Hero */
  .rp-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    align-items: center;
  }

  .rp-hero-title {
    font-size: clamp(34px, 5.2vw, 58px);
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.035em;
    color: #191F28;
    word-break: keep-all;
  }

  .rp-hero-img-box {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #E5E8EB;
    background: #F9FAFB;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.04);
  }

  .rp-hero-img {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    display: block;
    transition: transform 300ms ease;
  }
  .rp-hero-img-box:hover .rp-hero-img {
    transform: scale(1.02);
  }

  /* Bento Feature Grid */
  .rp-bento-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .rp-card {
    background: #FFFFFF;
    border: 1px solid #E5E8EB;
    border-radius: 18px;
    padding: 28px;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }
  .rp-card:hover {
    border-color: #D1D6DB;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  }

  .rp-card-spotlight {
    background: #F9FAFB;
    border: 1px solid #E5E8EB;
  }

  /* Steps Grid */
  .rp-steps-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Dashboard Section Layout */
  .rp-dash-split {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    align-items: center;
  }

  /* Religion Grid */
  .rp-rel-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .rp-rel-box {
    background: #F9FAFB;
    border: 1px solid #E5E8EB;
    border-radius: 16px;
    padding: 24px;
    text-align: left;
    transition: all 160ms ease;
  }
  .rp-rel-box:hover {
    background: #FFFFFF;
    border-color: #2563EB;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.06);
    transform: translateY(-2px);
  }

  /* Modern Solid Buttons */
  .rp-btn-dark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    padding: 0 24px;
    background: #191F28;
    color: #FFFFFF;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 150ms ease, transform 150ms ease;
  }
  .rp-btn-dark:hover {
    background: #333D4B;
  }
  .rp-btn-dark:active {
    transform: scale(0.99);
  }

  .rp-btn-blue {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    padding: 0 24px;
    background: #2563EB;
    color: #FFFFFF;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 150ms ease, transform 150ms ease;
  }
  .rp-btn-blue:hover {
    background: #1D4ED8;
  }
  .rp-btn-blue:active {
    transform: scale(0.99);
  }

  .rp-btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    padding: 0 22px;
    background: #FFFFFF;
    color: #333D4B;
    border: 1px solid #D1D6DB;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms ease;
  }
  .rp-btn-outline:hover {
    background: #F9FAFB;
    border-color: #B0B8C1;
    color: #191F28;
  }

  /* Subtle Chip */
  .rp-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 6px;
    background: #EFF6FF;
    border: 1px solid #DBEAFE;
    color: #1D4ED8;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  /* Responsive Queries */
  @media (min-width: 640px) {
    .rp-bento-grid { grid-template-columns: repeat(2, 1fr); }
    .rp-steps-grid { grid-template-columns: repeat(3, 1fr); }
    .rp-rel-grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (min-width: 768px) {
    .rp-nav-links { display: flex; }
    .rp-footer-row { flex-direction: row; align-items: center; justify-content: space-between; }
  }

  @media (min-width: 1024px) {
    .rp-hero-grid { grid-template-columns: 1.15fr 0.85fr; }
    .rp-dash-split { grid-template-columns: 1.05fr 0.95fr; }
    .rp-bento-grid { grid-template-columns: repeat(3, 1fr); }
    .rp-bento-wide { grid-column: span 2; }
    .rp-rel-grid { grid-template-columns: repeat(5, 1fr); }
  }
`;

const FEATURES = [
  {
    tag: '정산 보고서',
    title: '실시간 정산 및 통계 리포트',
    desc: '봉헌 및 기부 내역을 실시간으로 확인하고, 월별 정산 내역과 기부금 영수증 기초 데이터를 자동으로 관리합니다.',
  },
  {
    tag: '보안 표준',
    title: 'PCI-DSS 및 금융권 암호화',
    desc: '국제 결제 보안 표준(PCI-DSS)과 256-bit SSL 암호화 전송을 통해 결제 및 봉헌 데이터를 안전하게 보호합니다.',
  },
  {
    tag: '모바일 환경',
    title: '기기 제약 없는 반응형 및 PWA 지원',
    desc: '별도 앱 설치 없이 스마트폰, 태블릿, PC 어디서나 쾌적하게 접속하여 봉헌에 참여할 수 있습니다.',
  },
  {
    tag: '정기 후원',
    title: '정기 봉헌 및 자동 결제 관리',
    desc: '매월 지정된 일자에 정기적으로 헌금과 후원금이 수납되도록 편리한 자동 출금 체계를 제공합니다.',
  },
];

const STEPS = [
  { step: '01', title: '단체 기본 정보 입력', desc: '단체명, 대표자, 고유번호증 또는 사업자 정보를 입력하고 3분 만에 계정을 생성합니다.' },
  { step: '02', title: '봉헌 및 모금 항목 설정', desc: '십일조, 감사헌금, 인등보시, 정기후원 등 단체 성격에 맞는 항목과 금액을 자유롭게 구성합니다.' },
  { step: '03', title: '전용 URL 공유 및 수납 개시', desc: '생성된 단체 전용 모금 페이지 주소(URL)를 성도, 신도, 후원자에게 공유하여 바로 시작합니다.' },
];

const RELIGIONS = [
  { label: '개신교 교회', sub: '십일조 · 감사헌금 · 건축헌금', badge: '교회 전용' },
  { label: '불교 사찰', sub: '인등보시 · 영탑공양 · 불사금', badge: '사찰 전용' },
  { label: '천주교 성당', sub: '교무금 · 미사예물 · 후원금', badge: '성당 전용' },
  { label: '구호 및 복지재단', sub: '정기후원 · 일시후원 · 긴급구호', badge: 'NPO 재단' },
  { label: '비영리 사단법인', sub: '회원 회비 · 목적 사업 후원금', badge: '비영리법인' },
];

export default function Root() {
  const navigate = useNavigate();

  return (
    <div className="rp-root">
      <style>{ROOT_CSS}</style>

      {/* ── 1. Top Navigation Bar ──────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E8EB',
      }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto', height: 64, padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand Logo */}
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <img
              src="/images/logo_soulpay.png"
              alt="SoulPay"
              style={{ height: 34, width: 'auto', objectFit: 'contain' }}
            />
          </a>

          {/* Navigation Links */}
          <nav className="rp-nav-links" style={{ gap: 4 }}>
            {[
              { label: '서비스 특징', href: '#features' },
              { label: '관리자 시스템', href: '#dashboard' },
              { label: '도입 절차', href: '#how' },
              { label: '지원 분야', href: '#religions' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, color: '#4E5968',
                  textDecoration: 'none', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#191F28';
                  e.currentTarget.style.backgroundColor = '#F2F4F6';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#4E5968';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/partner/apply')}
              style={{
                background: '#FFFFFF', border: '1px solid #D1D6DB', cursor: 'pointer',
                padding: '7px 13px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: '#333D4B',
                whiteSpace: 'nowrap', transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#191F28';
                e.currentTarget.style.color = '#191F28';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#D1D6DB';
                e.currentTarget.style.color = '#333D4B';
              }}
            >
              영업 파트너 신청
            </button>
            <button
              onClick={() => navigateToAdminPortal(undefined, navigate)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '7px 12px', borderRadius: 8,
                fontSize: 13.5, fontWeight: 500, color: '#4E5968',
                whiteSpace: 'nowrap', transition: 'color 150ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#191F28'}
              onMouseLeave={e => e.currentTarget.style.color = '#4E5968'}
            >
              관리자 로그인
            </button>
            <button
              className="rp-btn-dark"
              onClick={() => navigate('/onboarding')}
              style={{ height: 38, padding: '0 16px', fontSize: 13.5, borderRadius: 8 }}
            >
              서비스 신청
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ────────────────────────────────────── */}
      <section style={{
        maxWidth: 1160, margin: '0 auto',
        padding: 'clamp(56px, 7vw, 92px) 20px clamp(48px, 6vw, 80px)',
      }}>
        <div className="rp-hero-grid">
          {/* Left Text */}
          <div>
            <div className="rp-tag" style={{ marginBottom: 20 }}>
              종교 단체 및 공익법인을 위한 스마트 수납 솔루션
            </div>

            <h1 className="rp-hero-title">
              마음과 정성을 잇는<br />
              <span style={{ color: '#2563EB' }}>투명하고 편리한 온라인 수납</span>
            </h1>

            <p style={{
              fontSize: 'clamp(15.5px, 1.8vw, 17.5px)',
              color: '#4E5968', lineHeight: 1.7,
              margin: '20px 0 36px', maxWidth: 520,
              wordBreak: 'keep-all',
            }}>
              교회, 사찰, 성당부터 구호재단과 비영리법인까지 단체의 특성에 꼭 맞춘 맞춤형 봉헌 환경을 제공합니다. 복잡한 서류 절차 없이 손쉽게 개설하세요.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="rp-btn-blue" onClick={() => navigate('/onboarding')}>
                우리 단체 신청하기 <ArrowRight size={16} />
              </button>
              <button
                className="rp-btn-outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                주요 기능 보기
              </button>
            </div>

            {/* Standard Security Indicators (Clean text without emojis) */}
            <div style={{
              marginTop: 40, paddingTop: 28, borderTop: '1px solid #F2F4F6',
              display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
            }}>
              {[
                { title: 'PCI-DSS 인증', desc: '국제 결제 보안 표준 준수' },
                { title: 'SSL 256-bit', desc: '금융권 수준 데이터 암호화' },
                { title: '실시간 정산', desc: '투명한 수납 내역 조회' },
              ].map(({ title, desc }) => (
                <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>{title}</span>
                  <span style={{ fontSize: 12, color: '#8B95A1' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Box */}
          <div>
            <div className="rp-hero-img-box">
              <img
                src="/soulpay/images/hero-illustration.png"
                alt="소울페이 스마트 봉헌 솔루션"
                className="rp-hero-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/hero-illustration.png';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Feature Bento Section ───────────────────────────── */}
      <section id="features" style={{
        maxWidth: 1160, margin: '0 auto',
        padding: 'clamp(48px, 6vw, 80px) 20px',
      }}>
        <div style={{ marginBottom: 44, textAlign: 'center' }}>
          <div className="rp-tag" style={{ marginBottom: 12 }}>핵심 차별점</div>
          <h2 style={{
            fontSize: 'clamp(26px, 3.8vw, 38px)', fontWeight: 800,
            color: '#191F28', letterSpacing: '-0.03em',
          }}>
            단체 운영에 꼭 필요한 스마트한 기능
          </h2>
          <p style={{
            fontSize: 15.5, color: '#4E5968', marginTop: 10,
            maxWidth: 580, margin: '10px auto 0', lineHeight: 1.6,
          }}>
            각 종교 및 비영리 단체의 고유한 수납 문화와 기부금 관리 체계에 맞추어 세심하게 설계되었습니다.
          </p>
        </div>

        <div className="rp-bento-grid">
          {/* Main Large Card */}
          <div className="rp-card rp-card-spotlight rp-bento-wide">
            <div style={{ display: 'inline-block', marginBottom: 14 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#2563EB',
                background: '#FFFFFF', padding: '4px 10px', borderRadius: 6,
                border: '1px solid #DBEAFE',
              }}>
                단체별 맞춤 템플릿
              </span>
            </div>
            <h3 style={{
              fontSize: 22, fontWeight: 800, color: '#191F28',
              marginBottom: 12, letterSpacing: '-0.02em',
            }}>
              종교 및 비영리 단체별 전용 명칭과 맞춤 모금 페이지
            </h3>
            <p style={{
              fontSize: 14.5, color: '#4E5968', lineHeight: 1.7,
              maxWidth: 540, marginBottom: 24, wordBreak: 'keep-all',
            }}>
              개신교의 십일조와 감사헌금, 불교의 인등보시와 불사공양, 천주교의 교무금과 미사예물, 구호재단의 정기 후원까지 단체 고유의 용어와 모금 방식을 완벽히 지원합니다.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['개신교 헌금', '불교 보시', '천주교 봉헌', '구호재단 후원', '비영리 기부'].map(item => (
                <span key={item} style={{
                  padding: '6px 13px', background: '#FFFFFF',
                  border: '1px solid #E5E8EB', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: '#333D4B',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 4 Regular Feature Cards */}
          {FEATURES.map(({ tag, title, desc }) => (
            <div key={title} className="rp-card">
              <div style={{
                fontSize: 11.5, fontWeight: 700, color: '#2563EB',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                marginBottom: 12,
              }}>
                {tag}
              </div>
              <h3 style={{
                fontSize: 17, fontWeight: 700, color: '#191F28',
                marginBottom: 8, letterSpacing: '-0.015em',
              }}>
                {title}
              </h3>
              <p style={{
                fontSize: 13.5, color: '#6B7684', lineHeight: 1.65,
                wordBreak: 'keep-all',
              }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Dashboard Showcase ──────────────────────────────── */}
      <section id="dashboard" style={{
        background: '#F9FAFB',
        borderTop: '1px solid #E5E8EB',
        borderBottom: '1px solid #E5E8EB',
        padding: 'clamp(64px, 8vw, 96px) 20px',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="rp-dash-split">
            {/* Mockup Image */}
            <div>
              <img
                src="/soulpay/images/dashboard-mockup.png"
                alt="SoulPay 관리자 대시보드 화면"
                style={{
                  width: '100%', height: 'auto',
                  borderRadius: 16, border: '1px solid #E5E8EB',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05)',
                  display: 'block',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/dashboard-mockup.png';
                }}
              />
            </div>

            {/* Info */}
            <div>
              <div className="rp-tag" style={{ marginBottom: 16 }}>체계적인 관리 환경</div>
              <h2 style={{
                fontSize: 'clamp(26px, 3.6vw, 36px)', fontWeight: 800,
                color: '#191F28', letterSpacing: '-0.03em', lineHeight: 1.25,
                marginBottom: 16,
              }}>
                실시간 수납 통계와<br />
                <span style={{ color: '#2563EB' }}>투명한 기부금 관리 시스템</span>
              </h2>
              <p style={{
                fontSize: 15, color: '#4E5968', lineHeight: 1.75,
                marginBottom: 28, wordBreak: 'keep-all',
              }}>
                어떤 항목으로 얼마의 봉헌금이 수납되었는지 한눈에 파악하세요. 일자별·항목별 통계부터 엑셀 다운로드와 기부금 영수증 연동까지 모든 업무를 지원합니다.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {[
                  '실시간 수납 및 봉헌 현황 대시보드',
                  '월별 / 항목별 자동 집계 및 통계 리포트',
                  '투명한 기부자 정보 및 수납 내역 엑셀 다운로드',
                ].map((text) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Check size={13} color="#2563EB" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: '#333D4B' }}>{text}</span>
                  </div>
                ))}
              </div>

              <button
                className="rp-btn-outline"
                onClick={() => navigateToAdminPortal(undefined, navigate)}
                style={{ height: 44, padding: '0 20px', fontSize: 14 }}
              >
                관리자 콘솔 바로가기 →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. How It Works (3 Steps) ──────────────────────────── */}
      <section id="how" style={{
        maxWidth: 1160, margin: '0 auto',
        padding: 'clamp(64px, 8vw, 96px) 20px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="rp-tag" style={{ marginBottom: 12 }}>간편한 도입</div>
          <h2 style={{
            fontSize: 'clamp(26px, 3.8vw, 36px)', fontWeight: 800,
            color: '#191F28', letterSpacing: '-0.03em',
          }}>
            복잡한 절차 없이 3단계로 시작하세요
          </h2>
        </div>

        <div className="rp-steps-grid">
          {STEPS.map(({ step, title, desc }) => (
            <div key={step} className="rp-card">
              <div style={{
                fontSize: 28, fontWeight: 800, color: '#D1D6DB',
                fontFamily: 'monospace', letterSpacing: '-0.04em',
                lineHeight: 1, marginBottom: 16,
              }}>
                {step}
              </div>
              <h3 style={{
                fontSize: 17, fontWeight: 700, color: '#191F28',
                marginBottom: 8, letterSpacing: '-0.015em',
              }}>
                {title}
              </h3>
              <p style={{
                fontSize: 13.5, color: '#6B7684', lineHeight: 1.65,
                wordBreak: 'keep-all',
              }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Supported Religion & Organizations ──────────────── */}
      <section id="religions" style={{
        maxWidth: 1160, margin: '0 auto',
        padding: '0 20px clamp(64px, 8vw, 96px)',
        textAlign: 'center',
      }}>
        <div className="rp-tag" style={{ marginBottom: 12 }}>지원 단체</div>
        <h2 style={{
          fontSize: 'clamp(26px, 3.8vw, 36px)', fontWeight: 800,
          color: '#191F28', letterSpacing: '-0.03em', marginBottom: 10,
        }}>
          모든 종교와 비영리 공익 단체 지원
        </h2>
        <p style={{
          fontSize: 14.5, color: '#6B7684', lineHeight: 1.6,
          maxWidth: 520, margin: '0 auto 40px',
        }}>
          SoulPay는 각 단체의 고유한 수납 언어와 기부 문화를 깊이 이해하고 성심껏 지원합니다.
        </p>

        <div className="rp-rel-grid">
          {RELIGIONS.map(({ label, sub, badge }) => (
            <div key={label} className="rp-rel-box">
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#2563EB',
                marginBottom: 8,
              }}>
                {badge}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, color: '#191F28',
                marginBottom: 4, letterSpacing: '-0.02em',
              }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: '#8B95A1', lineHeight: 1.5 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Final Call To Action ────────────────────────────── */}
      <section style={{
        maxWidth: 1160, margin: '0 auto 60px', padding: '0 20px',
      }}>
        <div style={{
          background: '#191F28',
          borderRadius: 24,
          padding: 'clamp(48px, 6vw, 72px) 24px',
          textAlign: 'center',
          color: '#FFFFFF',
        }}>
          <div style={{
            display: 'inline-flex', padding: '4px 12px', borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.1)', color: '#93C5FD',
            fontSize: 12, fontWeight: 600, marginBottom: 20,
          }}>
            가입비 무료 · 즉시 개설 지원
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800,
            letterSpacing: '-0.035em', lineHeight: 1.2,
            marginBottom: 16, wordBreak: 'keep-all',
          }}>
            우리 단체의 온라인 기부 · 수납,<br />
            지금 바로 시작해 보세요
          </h2>

          <p style={{
            fontSize: 15.5, color: '#B0B8C1', lineHeight: 1.7,
            maxWidth: 500, margin: '0 auto 36px', wordBreak: 'keep-all',
          }}>
            별도 구축 비용 없이 누구나 쉽게 사용하는 SoulPay로 더 편리하고 투명한 모금 환경을 구축하세요.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="rp-btn-blue"
              onClick={() => navigate('/onboarding')}
              style={{ height: 48, padding: '0 26px', fontSize: 14.5 }}
            >
              지금 서비스 신청하기 <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                height: 48, padding: '0 24px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: 10, fontSize: 14.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
              }}
            >
              관리자 로그인
            </button>
          </div>
        </div>
      </section>

      {/* ── 8. Clean Minimal Footer ────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #E5E8EB',
        background: '#FFFFFF',
        padding: '36px 20px 48px',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="rp-footer-row" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src="/images/logo_soulpay.png"
                alt="SoulPay"
                style={{ height: 26, width: 'auto', objectFit: 'contain' }}
              />
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { label: '서비스 특징', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: '관리자 시스템', action: () => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: '관리자 로그인', action: () => navigateToAdminPortal(undefined, navigate) },
                { label: '서비스 신청', action: () => navigate('/onboarding') },
                { label: '영업 파트너 신청', action: () => navigate('/partner/apply') },
                { label: '영업자 포털', action: () => navigate('/partner/login') },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#6B7684',
                    fontFamily: 'inherit', padding: '2px 0',
                    transition: 'color 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#191F28'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6B7684'}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Copyright & Security */}
            <div style={{
              fontSize: 12, color: '#8B95A1', lineHeight: 1.6,
            }}>
              ISMS-P · PCI-DSS · 256-bit SSL<br />
              © 2026 SoulPay Platform. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

