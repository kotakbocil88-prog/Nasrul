import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

/**
 * PwaControls:
 *  - Menangkap event beforeinstallprompt dan menampilkan tombol "Install Aplikasi".
 *  - Menampilkan banner ketika perangkat sedang offline (mode luring).
 */
export default function PwaControls() {
  const [deferred, setDeferred] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("pwa_install_dismissed") === "1"
  );

  useEffect(() => {
    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShowInstall(true);
    };
    const onInstalled = () => {
      setShowInstall(false);
      setDeferred(null);
    };
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch (e) {
      // ignore
    }
    setDeferred(null);
    setShowInstall(false);
  };

  const dismiss = () => {
    setShowInstall(false);
    setDismissed(true);
    try {
      localStorage.setItem("pwa_install_dismissed", "1");
    } catch (e) {
      // ignore
    }
  };

  return (
    <>
      {offline && (
        <div
          data-testid="offline-banner"
          className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-amber-950 text-sm font-semibold py-1.5 px-3 flex items-center justify-center gap-2 shadow-md"
        >
          <WifiOff className="w-4 h-4" />
          Mode luring (offline) — menampilkan data terakhir yang tersimpan
        </div>
      )}

      {showInstall && !dismissed && (
        <div
          data-testid="pwa-install-banner"
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-[60] bg-[#0F291E] text-white rounded-2xl shadow-2xl ring-1 ring-white/10 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="w-11 h-11 rounded-xl bg-[#84CC16] text-[#0F291E] flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">Install Aplikasi</p>
            <p className="text-xs text-white/70 mt-0.5">
              Pasang DATA EQMS TAGGING ke layar HP untuk akses cepat & bisa dipakai offline.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                data-testid="pwa-install-button"
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#84CC16] text-[#0F291E] text-sm font-bold px-3 py-1.5 hover:bg-lime-400 transition-colors"
              >
                <Download className="w-4 h-4" /> Install
              </button>
              <button
                onClick={dismiss}
                className="text-sm text-white/70 hover:text-white px-2 py-1.5"
              >
                Nanti saja
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Tutup"
            className="text-white/50 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
