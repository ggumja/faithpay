import { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import type { Tenant } from '../context/AppContext';

interface InstallBannerProps {
  tenant: Tenant;
  onInstall: () => Promise<void>;
  primaryColor: string;
}

/**
 * 테넌트 홈 상단에 표시되는 PWA 설치 권유 배너
 * canInstall === true 일 때만 렌더링
 */
export function InstallBanner({ tenant, onInstall, primaryColor }: InstallBannerProps) {
  const [visible, setVisible] = useState(true);
  const [installing, setInstalling] = useState(false);

  if (!visible) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      role="banner"
      aria-label={`${tenant.name} 앱 설치 안내`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: `${primaryColor}12`,
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

      {/* 아이콘 */}
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0, overflow: 'hidden',
        background: `${primaryColor}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${primaryColor}30`,
      }}>
        {tenant.logoUrl ? (
          <img
            src={tenant.logoUrl}
            alt={tenant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => {
              // 이미지 로드 실패 시 아이콘으로 폴백
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              e.currentTarget.nextElementSibling?.removeAttribute('style');
            }}
          />
        ) : null}
        <Smartphone size={16} color={primaryColor} style={{ display: tenant.logoUrl ? 'none' : undefined }} />
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          📱 {tenant.name} 앱으로 설치하기
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>
          홈 화면에 추가하면 더 편리하게 이용할 수 있어요
        </div>
      </div>

      {/* 설치 버튼 */}
      <button
        id="pwa-install-btn"
        onClick={handleInstall}
        disabled={installing}
        aria-label="앱 설치"
        style={{
          flexShrink: 0,
          height: 32,
          padding: '0 14px',
          background: primaryColor,
          border: 'none',
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 700,
          color: 'white',
          cursor: installing ? 'default' : 'pointer',
          opacity: installing ? 0.7 : 1,
          transition: 'opacity 150ms, transform 150ms',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => { if (!installing) e.currentTarget.style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
      >
        {installing ? '설치 중…' : '설치'}
      </button>

      {/* 닫기 버튼 */}
      <button
        onClick={() => setVisible(false)}
        aria-label="배너 닫기"
        style={{
          flexShrink: 0,
          width: 28, height: 28,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#999',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6,
          padding: 0,
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#333'; e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'none'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
