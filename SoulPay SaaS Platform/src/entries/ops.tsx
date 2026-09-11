import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { opsRouter } from "../routes/opsRoutes";
import "../styles/index.css";
import { setupServiceWorker } from "../app/utils/pwaUtils";

setupServiceWorker();

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={opsRouter} />
);
