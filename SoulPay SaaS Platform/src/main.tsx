
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

  createRoot(document.getElementById("root")!).render(<App />);
  