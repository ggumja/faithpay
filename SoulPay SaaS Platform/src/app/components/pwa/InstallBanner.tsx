import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, X, Share, PlusSquare, MoreVertical, CheckCircle2, Download } from 'lucide-react';
import type { Tenant } from '../context/AppContext';
import { detectIsIOS } from '../../hooks/useTenantPWA';

interface InstallBannerProps {
  tenant: Tenant;
  onInstall: () => Promise<boolean | void> | boolean | void;
  hasNativePrompt?: boolean;
  primaryColor: string;
}

/**
 * 브라우저 종류 감지
 */
function getBrowserInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isIOS: false, isIOSChrome: false, isIOSSafari: false, isAndroidChrome: false };
  }
  const ua = navigator.userAgent;
  const isIOS = detectIsIOS();
  const isIOSChrome = isIOS && /CriOS/.test(ua);
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|Whale/.test(ua);
  const isAndroidChrome = !isIOS && /Android/.test(ua) && /Chrome/.test(ua);

  return { isIOS, isIOSChrome, isIOSSafari, isAndroidChrome };
}

/**
 * 테넌트 홈 상단에 표시되는 PWA 설치 안내 배너
 * - Chrome / Android: 원클릭 네이티브 설치창 지원
 * - iOS Safari / iOS Chrome: 홈 화면 추가 3단계 시각 가이드 모달 지원
 */
export function InstallBanner({ tenant, onInstall, hasNativePrompt, primaryColor }: InstallBannerProps) {
  const [visible, setVisible] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const browserInfo = useMemo(() => getBrowserInfo(), []);

  if (!visible) return null;

  const handleActionClick = async () => {
    // 1. iOS 환경이거나 네이티브 프롬프트가 없는 경우: 즉시 가이드 모달 오픈
    if (browserInfo.isIOS || !hasNativePrompt) {
      setShowGuideModal(true);
      return;
    }

    // 2. 크롬 네이티브 프롬프트가 준비된 경우: 설치 창 실행 시도
    setInstalling(true);
    try {
      const result = await onInstall();
      if (result !== true) {
        setShowGuideModal(true);
      }
    } catch {
      setShowGuideModal(true);
    } finally {
      setInstalling(false);
    }
  };


  return (
    <>
      <div
        role="banner"
        aria-label={`${tenant.name} 앱 설치 안내`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: `${primaryColor}14`,
          borderBottom: `1px solid ${primaryColor}28`,
          animation: 'pwa-banner-slide 0.35s cubic-bezier(0.4,0,0.2,1) both',
        }}
      >
        <style>{`
          @keyframes pwa-banner-slide {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* 앱 로고 아이콘 */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
          background: `${primaryColor}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${primaryColor}30`,
          boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
        }}>
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                e.currentTarget.nextElementSibling?.removeAttribute('style');
              }}
            />
          ) : null}
          <Smartphone size={18} color={primaryColor} style={{ display: tenant.logoUrl ? 'none' : undefined }} />
        </div>

        {/* 텍스트 안내 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📱 {tenant.name} 앱으로 홈 화면 추가
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2, fontWeight: 500 }}>
            {browserInfo.isIOS ? '홈 화면에 추가하면 전용 앱처럼 편리해요' : '앱으로 설치하고 매번 검색 없이 바로 접속하세요'}
          </div>
        </div>

        {/* 설치 또는 추가 버튼 */}
        <button
          id="pwa-install-btn"
          onClick={handleActionClick}
          disabled={installing}
          aria-label="앱 설치 또는 홈 화면 추가"
          style={{
            flexShrink: 0,
            height: 34,
            padding: '0 14px',
            background: primaryColor,
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 800,
            color: 'white',
            cursor: installing ? 'default' : 'pointer',
            opacity: installing ? 0.7 : 1,
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
          }}
          onMouseEnter={e => { if (!installing) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
        >
          {installing ? (
            '준비 중…'
          ) : hasNativePrompt ? (
            <>
              <Download size={14} />
              <span>앱 설치</span>
            </>
          ) : (
            <>
              <PlusSquare size={14} />
              <span>추가 방법</span>
            </>
          )}
        </button>


        {/* 닫기 버튼 */}
        <button
          onClick={() => setVisible(false)}
          aria-label="배너 닫기"
          style={{
            flexShrink: 0,
            width: 30, height: 30,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6,
            padding: 0,
            transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── 브라우저별 홈 화면 추가 안내 모달 (createPortal로 뷰포트 최상위에 안정적 렌더링) ── */}
      {showGuideModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              maxWidth: 420,
              width: '100%',
              padding: '24px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              color: '#0f172a',
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: `${primaryColor}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Smartphone size={20} color={primaryColor} />
                </div>
                <div>
                  <h3 id="pwa-modal-title" style={{ fontSize: 17, fontWeight: 900, margin: 0, color: '#0f172a' }}>
                    {tenant.name} 홈 화면 추가
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                    {browserInfo.isIOS ? '아이폰(iOS) 전용 설치 안내' : '브라우저 홈 화면 추가 안내'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 안내 본문: iOS Safari / iOS Chrome / 일반 Chrome 분기 */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 14 }}>
                👉 아래 순서대로 3초 만에 홈 화면에 등록하세요:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1단계 */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: primaryColor,
                    color: '#fff', fontSize: 13, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    1
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: '#1e293b' }}>
                    {browserInfo.isIOSChrome ? (
                      <>브라우저 상단 주소창 또는 메뉴의 <strong>[공유(Share)]</strong> 아이콘을 누릅니다.</>
                    ) : browserInfo.isIOS ? (
                      <>Safari 브라우저 화면 하단 메뉴바의 <strong>[공유] 아이콘 (<Share size={15} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />)</strong>을 터치합니다.</>
                    ) : (
                      <>크롬(Chrome) 브라우저 우측 상단 <strong>메뉴 (<MoreVertical size={15} style={{ display: 'inline', verticalAlign: 'middle' }} />)</strong>를 누릅니다.</>
                    )}
                  </div>
                </div>

                {/* 2단계 */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: primaryColor,
                    color: '#fff', fontSize: 13, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    2
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: '#1e293b' }}>
                    메뉴 목록을 위로 살짝 올려 <strong>[홈 화면에 추가] (<PlusSquare size={15} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />)</strong> 또는 <strong>[앱 설치]</strong>를 선택합니다.
                  </div>
                </div>

                {/* 3단계 */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: primaryColor,
                    color: '#fff', fontSize: 13, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    3
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: '#1e293b' }}>
                    우측 상단의 <strong>[추가]</strong> 또는 <strong>[설치]</strong> 버튼을 누르면 스마트폰 바탕화면에 단체 바로가기 아이콘이 완성됩니다!
                  </div>
                </div>
              </div>
            </div>

            {/* 확인 완료 버튼 */}
            <button
              onClick={() => setShowGuideModal(false)}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: primaryColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                marginTop: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <CheckCircle2 size={18} />
              <span>확인했습니다</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}


