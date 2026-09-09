import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { payRouter } from "../routes/payRoutes";
import "../styles/index.css";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
    updateSW(true);
  },
});

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={payRouter} />
);
