import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { Camera, CameraOff, Search, ChevronRight, MapPin } from "lucide-react";
import api from "@/lib/api";
import { recordTitle, isTagged, fmtNum } from "@/lib/recordFields";

export default function MobileScan({ records, onOpen }) {
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const scannerRef = useRef(null);
  const boxId = "qr-reader-box";

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (e) { /* noop */ }
      try { await scannerRef.current.clear(); } catch (e) { /* noop */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => () => { stopScanner(); }, []);

  const resolve = async (text, fromCamera = false) => {
    const raw = String(text || "").trim();
    if (!raw) return;
    const norm = raw.toLowerCase().replace(/\s/g, "");
    const local =
      records.find((r) => String(r.id_actual || "").toLowerCase().replace(/\s/g, "") === norm) ||
      (norm.length > 3 ? records.find((r) => String(r.payload || "").toLowerCase().replace(/\s/g, "").includes(norm)) : null);
    if (local) { onOpen(local); return; }
    setSearching(true);
    try {
      const res = await api.get("/records/lookup", { params: { q: raw } });
      const list = res.data || [];
      if (fromCamera) {
        // Hasil scan QR fisik: harus cocok, kalau tidak -> tolak
        if (list.length >= 1) onOpen(list[0]);
        else toast.error("QR tidak sesuai lokasi");
      } else if (list.length === 1) {
        onOpen(list[0]);
      } else {
        setResults(list);
      }
    } catch (e) {
      toast.error("Gagal mencari data (periksa koneksi)");
    } finally {
      setSearching(false);
    }
  };

  const startScanner = async () => {
    setResults(null);
    setScanning(true);
    try {
      const html5 = new Html5Qrcode(boxId, { verbose: false });
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopScanner();
          resolve(decodedText, true);
        },
        () => {}
      );
    } catch (e) {
      setScanning(false);
      scannerRef.current = null;
      toast.error("Tidak dapat mengakses kamera. Gunakan pencarian manual di bawah.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-800 mb-1">Scan QR Lokasi</div>
        <p className="text-xs text-slate-500 mb-3">Arahkan kamera ke QR label untuk membuka data lokasi.</p>

        <div
          id={boxId}
          className={`w-full rounded-xl overflow-hidden bg-slate-900 ${scanning ? "block" : "hidden"}`}
          style={{ minHeight: scanning ? 260 : 0 }}
        />

        {!scanning ? (
          <button
            data-testid="scan-start"
            onClick={startScanner}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            <Camera className="h-5 w-5" /> Mulai Kamera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-200 text-slate-700 font-semibold text-sm"
          >
            <CameraOff className="h-5 w-5" /> Berhenti
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-800 mb-2">Cari Manual</div>
        <div className="flex gap-2">
          <input
            data-testid="scan-manual-input"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resolve(manual)}
            placeholder="Ketik Id Actual / Kebun-Blok-LSU"
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            data-testid="scan-manual-search"
            onClick={() => resolve(manual)}
            disabled={searching}
            className="px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-60"
          >
            <Search className="h-4 w-4" /> Cari
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500">{results.length} hasil ditemukan</div>
          {results.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">Data tidak ditemukan.</div>
          )}
          {results.map((r) => {
            const tagged = isTagged(r);
            return (
              <button
                key={r._id}
                onClick={() => onOpen(r)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 active:bg-slate-50"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tagged ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 truncate">{recordTitle(r)}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.id_actual}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
