
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerSW } from "virtual:pwa-register";

  // Service Worker 등록 — 업데이트 알림 포함
  registerSW({
    onNeedRefresh() {
      // 새 버전이 배포되면 사용자에게 새로고침을 권장
      if (window.confirm("새 버전의 FaithPay가 있습니다. 업데이트하시겠습니까?")) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log("[PWA] 오프라인 준비 완료");
    },
  });

  createRoot(document.getElementById("root")!).render(<App />);
  