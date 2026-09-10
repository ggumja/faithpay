
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";

  // Service Worker 자동 최신화 — 구형 JS 번들 캐시 방지
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("[PWA] New version detected, clearing cache...");
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (let name of names) caches.delete(name);
        });
      }
      updateSW(true);
    },
    onOfflineReady() {
      console.log("[PWA] 오프라인 준비 완료");
    },
  });

  // 🔄 신규 배포 시 구버전 번들 청크 해시 불일치로 인한 오류 방지 (자동 새로고침 복구)
  window.addEventListener("vite:preloadError", () => {
    console.warn("[Vite] 신규 배포가 감지되었습니다. 최신 번들을 적용하기 위해 페이지를 자동 갱신합니다.");
    window.location.reload();
  });

  window.addEventListener("error", (e) => {
    const msg = e?.message || "";
    if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("Importing a module script failed")) {
      const reloadKey = "chunk_reload_" + window.location.pathname;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      }
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  