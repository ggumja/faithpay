
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { setupServiceWorker } from "./app/utils/pwaUtils";
import * as Sentry from "@sentry/react";

// ─── Sentry 에러 트래킹 초기화 ──────────────────────────────────────────────
// VITE_SENTRY_DSN 환경변수 미설정 시 조용히 skip (개발 환경 무해)
// .env.local에 VITE_SENTRY_DSN=https://xxxx@o.ingest.sentry.io/xxxx 추가
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,   // 'production' | 'development'
    tracesSampleRate: 0.1,               // 10% 트레이스 — 무료 할당량(5k/월) 절약
    replaysSessionSampleRate: 0,         // Session Replay 비활성 (할당량 절약)
    replaysOnErrorSampleRate: 0,
    ignoreErrors: [
      // 네트워크 단순 오류 — 실제 버그 아님
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // 청크 로딩 오류 — 이미 별도 처리
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
    ],
    beforeSend(event) {
      // localhost 개발 중 이벤트 전송 차단
      if (window.location.hostname === 'localhost') return null;
      return event;
    },
  });
}

// Service Worker 안전 등록 및 Dev 환경 자동 정리
setupServiceWorker();

// 🔄 신규 배포 청크 불일치 시 30초 쿨다운을 둔 안전한 1회 복구 (무한 새로고침 및 세션 깜빡임 차단)
window.addEventListener("vite:preloadError", (event) => {
  const reloadKey = "preload_reload_" + window.location.pathname;
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 30000) {
    sessionStorage.setItem(reloadKey, String(now));
    console.warn("[Vite] 신규 배포 청크 갱신을 위해 1회 새로고침을 수행합니다.");
    window.location.reload();
  } else {
    console.warn("[Vite] 반복 새로고침 방지를 위해 추가 새로고침을 차단했습니다.");
    event?.preventDefault?.();
  }
});

window.addEventListener("error", (e) => {
  const msg = e?.message || "";
  if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("Importing a module script failed")) {
    const reloadKey = "chunk_reload_" + window.location.pathname;
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 30000) {
      sessionStorage.setItem(reloadKey, String(now));
      window.location.reload();
    }
  }
});

  createRoot(document.getElementById("root")!).render(<App />);
  