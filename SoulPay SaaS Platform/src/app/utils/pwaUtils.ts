import { registerSW } from 'virtual:pwa-register';

/**
 * PWA Service Worker 등록 및 라이프사이클 관리
 * 
 * 1. Dev / Staging / Localhost 환경:
 *    - 개발 및 테스트 중 잦은 배포로 인한 캐시 불일치와 강제 새로고침 루프를 방지하기 위해 Service Worker를 자동 등록 해제(unregister)합니다.
 * 2. 상용(Production) 환경:
 *    - 사용자가 작업 중인 화면을 갑자기 새로고침하지 않도록 `immediate: false` 및 비침습적 백그라운드 갱신을 적용합니다.
 *    - `onNeedRefresh`에서 `updateSW(true)`나 `caches.delete()`를 무단 실행하지 않아 사용자 입력 유실과 깜빡임을 원천 차단합니다.
 */
export function setupServiceWorker(): void {
  if (typeof window === 'undefined') return;

  const host = window.location.hostname.toLowerCase();
  const isDevHost =
    host.startsWith('dev.') ||
    host.startsWith('stage.') ||
    host.startsWith('staging.') ||
    host.startsWith('test.') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local');

  // 기존 구버전에서 디스크에 축적되었던 잔여 캐시 스토리지 1회성 완전 소거
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        if (name.includes('soulpay') || name.includes('workbox') || name.includes('precache')) {
          caches.delete(name);
        }
      }
    }).catch(() => {});
  }

  // Dev 및 통합 테스트 환경: 브라우저에 남아있을 수 있는 구형 Service Worker 및 캐시를 완전히 정리
  if (isDevHost) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
          console.log('[PWA] Dev 환경 불필요한 Service Worker 등록 해제 완료');
        }
      }).catch(() => {});
    }
    return;
  }

  // 상용 환경: Zero-Cache 링크 바로가기용 Service Worker 안전 등록 (진행 중인 세션 강제 새로고침 금지)
  try {
    registerSW({
      immediate: false,
      onNeedRefresh() {
        console.log('[PWA] 바로가기 전용 Service Worker 준비 완료');
      },
      onOfflineReady() {
        console.log('[PWA] 바로가기 준비 완료');
      },
    });
  } catch (err) {
    console.warn('[PWA] Service Worker 초기화 생략:', err);
  }
}
