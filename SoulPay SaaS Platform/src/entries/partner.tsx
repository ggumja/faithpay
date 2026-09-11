import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { partnerRouter } from "../routes/partnerRoutes";
import "../styles/index.css";
import { setupServiceWorker } from "../app/utils/pwaUtils";

setupServiceWorker();

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={partnerRouter} />
);
