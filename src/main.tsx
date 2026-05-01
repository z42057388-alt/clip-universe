import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service Worker — только в production и не в iframe/превью
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") && host.includes("--");
const isLocalhost = host === "localhost" || host === "127.0.0.1";

if ("serviceWorker" in navigator) {
  if (isInIframe || isPreviewHost || isLocalhost || import.meta.env.DEV) {
    // В превью/dev снимаем с регистрации, чтобы не залипал старый кэш
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Автообновление при выходе новой версии
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener("statechange", () => {
              if (sw.state === "installed" && navigator.serviceWorker.controller) {
                sw.postMessage("SKIP_WAITING");
              }
            });
          });
          // Перезагрузка страницы при смене активного SW
          let refreshing = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        })
        .catch(() => {});
    });
  }
}
