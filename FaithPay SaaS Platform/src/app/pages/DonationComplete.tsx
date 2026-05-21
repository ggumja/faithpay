import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Share2, Download } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n || 0);
}

export default function DonationComplete() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, donationFormData } = useApp();
  const [receiptId] = useState(() => `FP${Date.now().toString().slice(-8)}`);

  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, []);

  if (!currentTenant || !donationFormData) return null;

  const ft = FAITH_THEMES[currentTenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;

  const completionMessage =
    currentTenant.religionType === 'buddhist' ? '맑고 따뜻한 마음이 전해졌습니다.' :
    currentTenant.religionType === 'catholic' ? '주님께서 봉헌을 받아주실 것입니다.' :
    '정성 어린 봉헌에 감사드립니다.';

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fp-bg-subtle)', fontFamily: 'var(--font-ui)' }}>
      {/* Success hero */}
      <div style={{
        background: ft.heroGradient,
        padding: '56px 28px 40px',
        position: 'relative', overflow: 'hidden',
        color: '#fff',
      }}>
        {/* Background decorations */}
        <div style={{ position: 'absolute', top: -60, right: -50, width: 260, height: 260, opacity: 0.14, color: '#fff' }}>
          <MotifLarge kind={ft.motif} color="#fff" opacity={1} />
        </div>
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 560, margin: '0 auto' }}>
          {/* Animated icon */}
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            animation: 'fp-ring-in 520ms var(--fp-ease-standard)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: '#fff', color: ft.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fp-pop-in 560ms 120ms both var(--fp-ease-standard)',
            }}>
              <Motif kind={ft.motif} size={32} color={ft.primary} />
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30, fontWeight: 800, lineHeight: 1.28, letterSpacing: '-0.027em',
            margin: '0 0 10px',
          }}>
            봉헌이<br />완료되었습니다
          </h1>
          <p style={{
            fontSize: 15, fontWeight: 500, lineHeight: 1.5,
            color: 'rgba(255,255,255,0.88)', letterSpacing: '0.006em',
            margin: '0 0 28px',
          }}>{completionMessage}</p>

          {/* Receipt preview in hero */}
          <div style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 18, padding: 20,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.75, letterSpacing: '0.031em' }}>봉헌 금액</span>
              <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.75, letterSpacing: '0.019em' }}>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.027em' }}>
                {fmt(donationFormData.amount)}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, opacity: 0.8 }}>원</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', margin: '0 0 14px' }} />
            {[
              [currentTenant.terminology.donation, donationFormData.itemName],
              ['받은 곳', currentTenant.name],
              ...(donationFormData.isRecurring ? [['결제', `매월 ${donationFormData.recurringDay}일 정기`]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 13, opacity: 0.7, letterSpacing: '0.019em', flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.014em', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed receipt */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Official receipt card */}
        <div style={{
          background: '#fff',
          border: `1px solid ${ft.primaryBgStrong}`,
          borderRadius: 20, padding: '24px',
          position: 'relative', overflow: 'hidden',
          marginBottom: 14,
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, opacity: 0.06, color: ft.primary }}>
            <MotifLarge kind={ft.motif} color="currentColor" opacity={1} />
          </div>
          <div style={{ position: 'relative' }}>
            {/* Header */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: ft.primaryBg, color: ft.primary,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.031em',
              marginBottom: 14,
            }}>
              <Motif kind={ft.motif} size={12} color={ft.primary} />
              기부금 영수증
            </div>

            <div style={{ fontSize: 12, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.031em', marginBottom: 6 }}>봉헌 금액</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: ft.primaryDark, marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.027em' }}>
                {fmt(donationFormData.amount)}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>원</span>
            </div>

            {/* Dashed divider */}
            <div style={{ borderTop: '1px dashed var(--fp-border-strong)', margin: '0 -24px', padding: '20px 24px 0' }}>
              {[
                ['영수증번호', receiptId],
                ['봉헌일시', formattedDate],
                [`${currentTenant.terminology.donation} 항목`, donationFormData.itemName],
                ['받은 곳', currentTenant.name],
                ['성명', donationFormData.name],
                ...(donationFormData.baptismName ? [['세례명', donationFormData.baptismName]] : []),
                ['전화번호', donationFormData.phone],
                ...(donationFormData.isRecurring ? [['결제 유형', `정기 결제 (매월 ${donationFormData.recurringDay}일)`]] : [['결제 유형', '단발']]),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}>
                  <span style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.014em', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}
            </div>

            {donationFormData.prayerText && (
              <div style={{
                margin: '16px -24px -24px', padding: '16px 24px',
                background: ft.accentBg, borderTop: `1px solid ${ft.primaryBgStrong}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ft.accent, letterSpacing: '0.031em', marginBottom: 6 }}>
                  {currentTenant.terminology.prayer}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fp-fg-primary)', letterSpacing: '0.019em' }}>
                  {donationFormData.prayerText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax auto-reported */}
        <div style={{
          background: '#fff', border: '1px solid var(--fp-border-strong)',
          borderRadius: 16, padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#FFF1DD', color: '#B86B00',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M3 9h18M8 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.014em' }}>홈택스 자동 신고됨</div>
            <div style={{ fontSize: 12, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', marginTop: 2 }}>
              연말정산 기부금공제 자동 반영
            </div>
          </div>
          <div style={{
            width: 22, height: 22, borderRadius: 999, background: '#00bf40', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </div>
        </div>

        {/* Kakao notice */}
        <div style={{
          background: ft.primaryBg, border: `1px solid ${ft.primaryBgStrong}`,
          borderRadius: 16, padding: '16px 18px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ft.primaryDark, letterSpacing: '-0.014em', marginBottom: 4 }}>
            알림톡이 발송되었습니다
          </div>
          <div style={{ fontSize: 12, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', lineHeight: 1.6 }}>
            {donationFormData.phone}으로 카카오 알림톡이 발송되었습니다.
            {donationFormData.isRecurring && ' 정기 결제는 마이페이지에서 관리하실 수 있습니다.'}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => toast.info('카카오톡 공유 기능은 실제 환경에서 구현됩니다')}
            style={{
              height: 52, borderRadius: 14,
              border: '1.5px solid var(--fp-border-strong)', background: '#fff',
              color: 'var(--fp-fg-primary)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-ui)',
            }}
          >
            <Share2 size={18} /> 공유
          </button>
          <button
            onClick={() => toast.info('영수증 저장 기능은 실제 환경에서 구현됩니다')}
            style={{
              height: 52, borderRadius: 14,
              border: '1.5px solid var(--fp-border-strong)', background: '#fff',
              color: 'var(--fp-fg-primary)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-ui)',
            }}
          >
            <Download size={18} /> PDF 저장
          </button>
        </div>

        <button
          onClick={() => navigate(`/${tenantSlug}`)}
          style={{
            width: '100%', height: 56, borderRadius: 14,
            background: ft.heroGradient, color: '#fff',
            border: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.006em',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Motif kind={ft.motif} size={18} color="#fff" />
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
