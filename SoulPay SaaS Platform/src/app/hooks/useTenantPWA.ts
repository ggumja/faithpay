import { useEffect, useState } from 'react';
import type { Tenant } from '../context/AppContext';

// Chrome / Chromium 계열의 beforeinstallprompt 이벤트 타입 선언
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function resolveAbsoluteUrl(rawUrl?: string, fallbackPath: string = '/icon-192x192.png'): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return `${window.location.origin}${fallbackPath}`;
  }
  try {
    return new URL(rawUrl, window.location.origin).href;
  } catch {
    return `${window.location.origin}${fallbackPath}`;
  }
}

/** iOS 환경 감지 (iPhone, iPad, iPod) */
export function detectIsIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
  );
}

/** 테넌트 정보로 동적 manifest 및 iOS 전용 메타/아이콘 태그 교체 */
function injectTenantManifest(tenant: Tenant) {
  const icon192 = resolveAbsoluteUrl(tenant.logoUrl, '/icon-192x192.png');
  const icon512 = resolveAbsoluteUrl(tenant.logoUrl, '/icon-512x512.png');

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
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  // 1. Blob URL로 manifest link 동적 교체 (Chrome / Android / Edge)
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

  // 2. iOS Safari 홈 화면 추가 시 앱 아이콘 및 제목 동적 교체
  let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = icon192;

  let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitle) {
    appleTitle = document.createElement('meta');
    appleTitle.name = 'apple-mobile-web-app-title';
    document.head.appendChild(appleTitle);
  }
  appleTitle.content = tenant.name;
}

export interface TenantPWAState {
  /** 설치 안내 또는 프롬프트를 띄울 수 있는 상태 (조건 충족 & 미설치) */
  canInstall: boolean;
  /** iOS 기기 여부 (Safari/Chrome on iOS) */
  isIOS: boolean;
  /** 네이티브 설치 프롬프트(Chrome/Edge) 준비 여부 */
  hasNativePrompt: boolean;
  /** 이미 홈화면에 설치되어 standalone으로 실행 중 */
  isInstalled: boolean;
  /** 설치 프롬프트를 호출 (Chrome) */
  install: () => Promise<boolean>;
}

/**
 * 테넌트 페이지에서 사용하는 PWA 훅
 * - 테넌트 정보로 동적 manifest 및 apple-touch-icon 주입
 * - Chrome: beforeinstallprompt 이벤트 캡처 → 네이티브 install() 제공
 * - iOS: Safari/WebKit 특성에 맞춰 안내 UI를 띄울 수 있도록 canInstall 보장
 * - 이미 standalone 모드(설치됨)인 경우 안내 배너 비활성화
 */
export function useTenantPWA(tenant: Tenant | null): TenantPWAState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isIOS = detectIsIOS();

  // 1. 테넌트 변경 시 동적 manifest 및 iOS 아이콘/타이틀 주입
  useEffect(() => {
    if (!tenant) return;
    injectTenantManifest(tenant);
    document.title = tenant.name;
  }, [tenant]);

  // 2. beforeinstallprompt 이벤트 캡처 (Chrome/Chromium 브라우저 설치 준비)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 미니 인포바 억제
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 3. 이미 standalone(홈 화면에 설치됨) 모드로 실행 중인지 감지
  useEffect(() => {
    const checkInstalled = () => {
      const isStandaloneMq = window.matchMedia('(display-mode: standalone)').matches;
      // iOS Safari 전용 navigator.standalone 속성
      const isIOSStandalone = 'standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true;
      return isStandaloneMq || isIOSStandalone;
    };

    setIsInstalled(checkInstalled());

    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => setIsInstalled(e.matches || checkInstalled());
    mq.addEventListener('change', mqHandler);
    return () => mq.removeEventListener('change', mqHandler);
  }, []);

  // 4. appinstalled 이벤트: Chrome 등에서 설치 완료 시 상태 갱신
  useEffect(() => {
    const handler = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const install = async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstalled(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Chrome은 installPrompt가 있거나, iOS는 설치되어 있지 않은 브라우저 접속 시 canInstall=true
  const canInstall = !isInstalled && (!!installPrompt || isIOS);

  return {
    canInstall,
    isIOS,
    hasNativePrompt: !!installPrompt,
    isInstalled,
    install,
  };
}

