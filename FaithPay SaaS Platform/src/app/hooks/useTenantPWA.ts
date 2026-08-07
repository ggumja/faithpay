import { useEffect, useState } from 'react';
import type { Tenant } from '../context/AppContext';

// Chrome의 beforeinstallprompt 이벤트 타입 선언
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** 테넌트 정보로 동적 manifest를 생성해 <link rel="manifest">를 교체한다 */
function injectTenantManifest(tenant: Tenant) {
  const manifest = {
    name: tenant.name,
    short_name: tenant.name,
    description: tenant.description || `${tenant.name} 온라인 봉헌 플랫폼`,
    theme_color: tenant.primaryColor || '#1a1a2e',
    background_color: '#ffffff',
    display: 'standalone',
    scope: `${window.location.origin}/`,
    // 앱 실행 시 해당 테넌트 홈으로 바로 진입
    start_url: `${window.location.origin}/${tenant.slug}`,
    lang: 'ko',
    icons: [
      {
        src: tenant.logoUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: tenant.logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  // Blob URL로 manifest link 동적 교체
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const url = URL.createObjectURL(blob);

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }

  // 이전 Blob URL이 있으면 메모리 해제
  if (link.href.startsWith('blob:')) {
    URL.revokeObjectURL(link.href);
  }

  link.href = url;
}

export interface TenantPWAState {
  /** 설치 프롬프트를 띄울 수 있는 상태 (조건 충족 & 미설치) */
  canInstall: boolean;
  /** 이미 홈화면에 설치되어 standalone으로 실행 중 */
  isInstalled: boolean;
  /** 설치 프롬프트를 호출 */
  install: () => Promise<void>;
}

/**
 * 테넌트 페이지에서 사용하는 PWA 훅
 * - 테넌트 정보로 동적 manifest 주입
 * - beforeinstallprompt 이벤트 캡처 → canInstall 상태 제공
 * - install() 호출 시 브라우저 설치 다이얼로그 표시
 */
export function useTenantPWA(tenant: Tenant | null): TenantPWAState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // 1. 테넌트 변경 시 동적 manifest 주입 + 탭 타이틀 업데이트
  useEffect(() => {
    if (!tenant) return;
    injectTenantManifest(tenant);
    document.title = tenant.name;
  }, [tenant]);

  // 2. beforeinstallprompt 이벤트 캡처 (Chrome이 설치 조건 충족 시 발생)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 미니 인포바 억제
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 3. 이미 standalone(설치됨) 모드로 실행 중인지 감지
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches);
    const mqHandler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener('change', mqHandler);
    return () => mq.removeEventListener('change', mqHandler);
  }, []);

  // 4. appinstalled 이벤트: 설치 완료 시 프롬프트 상태 초기화
  useEffect(() => {
    const handler = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    install,
  };
}
