// PWA helper: registrasi service worker (khusus konteks aman / produksi)
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Hanya daftarkan bila konteks aman (https) atau localhost
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => {
        // diamkan error registrasi agar tidak mengganggu app
        console.warn("SW register gagal:", err);
      });
  });
}
