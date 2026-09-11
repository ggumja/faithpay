
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { setupServiceWorker } from "./app/utils/pwaUtils";

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
  