import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { useEffect } from 'react';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';

export default function Root() {
  const navigate = useNavigate();
  const { tenants, fetchTenants } = useApp();

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fp-bg-subtle)', fontFamily: 'var(--font-ui)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '80px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, opacity: 0.05, color: '#fff' }}>
          <MotifLarge kind="cross" color="#fff" opacity={1} />
        </div>
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 9999,
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
            marginBottom: 24,
          }}>FAITHPAY</div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800, lineHeight: 1.2,
            letterSpacing: '-0.027em',
            color: '#fff',
            margin: '0 0 16px',
          }}>
            마음으로 드리는<br />
            <span style={{ opacity: 0.65 }}>봉헌의 시작</span>
          </h1>
          <p style={{
            fontSize: 16, fontWeight: 500, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.006em',
            margin: 0,
          }}>
            기독교 · 불교 · 천주교를 위한 종교 통합 봉헌 플랫폼
          </p>
        </div>
      </div>

      {/* Tenant list */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 8px' }}>
            단체를 선택해주세요
          </h2>
          <p style={{ fontSize: 14, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', margin: 0 }}>
            소속된 단체를 선택하여 봉헌을 시작하세요
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tenants.map((tenant) => {
            const ft = FAITH_THEMES[tenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;
            return (
              <TenantCard
                key={tenant.id}
                name={tenant.name}
                religionName={ft.name}
                tagline={ft.tagline}
                motif={ft.motif}
                primary={ft.primary}
                primaryBg={ft.primaryBg}
                heroGradient={ft.heroGradient}
                donationLabel={tenant.terminology.donation}
                onClick={() => navigate(`/${tenant.slug}`)}
              />
            );
          })}
        </div>

        {/* Admin section */}
        <div style={{
          marginTop: 56,
          background: '#fff',
          border: '1px solid var(--fp-border-strong)',
          borderRadius: 20,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: 16,
          textAlign: 'center' as const,
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.018em', margin: 0 }}>
            관리자이신가요?
          </h3>
          <p style={{ fontSize: 14, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', margin: 0, lineHeight: 1.6 }}>
            관리자 대시보드에서 봉헌 내역, 회원 관리, 정산 등을 확인하실 수 있습니다
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/admin/login')}
              style={{
                height: 48, padding: '0 24px', borderRadius: 12,
                border: '1.5px solid var(--fp-border-strong)',
                background: '#fff', color: 'var(--fp-fg-primary)',
                fontSize: 15, fontWeight: 700, letterSpacing: '0.006em',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              관리자 로그인
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              style={{
                height: 48, padding: '0 28px', borderRadius: 12,
                border: 0, background: 'var(--fp-fg-primary)', color: '#fff',
                fontSize: 15, fontWeight: 700, letterSpacing: '0.006em',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              우리 단체 시작하기
            </button>
          </div>
        </div>

        <div style={{
          textAlign: 'center' as const,
          marginTop: 32,
          fontSize: 12, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em',
        }}>
          FaithPay · 종교 통합 봉헌 플랫폼 · ISMS-P 인증
        </div>
      </div>
    </div>
  );
}

interface TenantCardProps {
  name: string;
  religionName: string;
  tagline: string;
  motif: 'cross' | 'lotus' | 'rosary';
  primary: string;
  primaryBg: string;
  heroGradient: string;
  donationLabel: string;
  onClick: () => void;
}

function TenantCard({ name, religionName, tagline, motif, primary, primaryBg, heroGradient, donationLabel, onClick }: TenantCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: '#fff',
        border: '1px solid var(--fp-border-strong)',
        borderRadius: 20,
        padding: '24px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 16,
        transition: 'all 200ms var(--fp-ease-standard)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--fp-shadow-3)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = primary;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--fp-border-strong)';
      }}
    >
      {/* Background motif */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, opacity: 0.06, color: primary }}>
        <MotifLarge kind={motif} color="currentColor" opacity={1} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: primaryBg, color: primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Motif kind={motif} size={28} color={primary} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.018em', lineHeight: 1.3 }}>
            {name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', marginTop: 2 }}>
            {religionName} · {tagline}
          </div>
        </div>
      </div>

      <div style={{
        height: 52, borderRadius: 14,
        background: heroGradient, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 15, fontWeight: 700, letterSpacing: '0.006em',
      }}>
        <Motif kind={motif} size={16} color="#fff" />
        {donationLabel}하기
      </div>
    </button>
  );
}
