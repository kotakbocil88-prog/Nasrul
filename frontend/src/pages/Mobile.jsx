import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  Leaf, QrCode, MapPin, Camera, CameraOff, CheckCircle2, XCircle,
  Loader2, LogOut, RefreshCw, ScanLine, Ruler, Navigation, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// Jarak antar dua titik lat/lng dalam meter (Haversine)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MEAS_FIELDS = [
  { key: "jumlah_pelepah", label: "Jumlah Pelepah", step: "1", unit: "" },
  { key: "panjang_pelepah", label: "Panjang Pelepah", step: "0.1", unit: "cm" },
  { key: "lebar_petiol", label: "Lebar Petiol", step: "0.1", unit: "cm" },
  { key: "tebal_petiol", label: "Tebal Petiol", step: "0.1", unit: "cm" },
  { key: "panjang_helai_1", label: "Panjang Helai Daun 1", step: "0.1", unit: "cm" },
  { key: "panjang_helai_2", label: "Panjang Helai Daun 2", step: "0.1", unit: "cm" },
  { key: "lebar_helai_1", label: "Lebar Helai Daun 1", step: "0.1", unit: "cm" },
  { key: "lebar_helai_2", label: "Lebar Helai Daun 2", step: "0.1", unit: "cm" },
  { key: "jumlah_anak_daun", label: "Jumlah Helai Daun", step: "1", unit: "" },
];

const IDENTITY = [
  ["kebun", "Kebun"],
  ["afdeling", "Afdeling"],
  ["code_lsu", "Kode LSU"],
  ["blok", "Blok"],
  ["kategori", "Kelas"],
  ["luas_ha", "Luas (Ha)"],
  ["jumlah_pokok", "Jumlah Pokok"],
  ["titik_sample", "Titik Sampel"],
];

export default function Mobile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("scan"); // scan | result | form | done
  const [tolerance, setTolerance] = useState(5);

  // GPS
  const [pos, setPos] = useState(null); // {lat,lng,accuracy}
  const [posErr, setPosErr] = useState("");
  const watchIdRef = useRef(null);

  // Camera / QR
  const [cameraOn, setCameraOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [manualQr, setManualQr] = useState("");
  const scannerRef = useRef(null);

  // Verification + form
  const [verifying, setVerifying] = useState(false);
  const [verifyRes, setVerifyRes] = useState(null); // {qr_found, record, distance_m, ok...}
  const [qr, setQr] = useState("");
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Manual location (fallback bila GPS perangkat tidak tersedia)
  const [manualLoc, setManualLoc] = useState(false);
  const [mLat, setMLat] = useState("");
  const [mLng, setMLng] = useState("");

  const effectivePos = React.useMemo(
    () =>
      manualLoc && mLat !== "" && mLng !== ""
        ? { lat: parseFloat(mLat), lng: parseFloat(mLng), accuracy: 0 }
        : pos,
    [manualLoc, mLat, mLng, pos]
  );

  // ---- ambil konfigurasi toleransi ----
  useEffect(() => {
    api.get("/mobile/config").then((r) => setTolerance(r.data.tolerance_m || 5)).catch(() => {});
  }, []);

  // ---- pantau lokasi GPS ----
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPosErr("Perangkat tidak mendukung GPS");
      return;
    }
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (p) => {
          setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
          setPosErr("");
        },
        (e) => setPosErr(e.message || "Gagal mengambil lokasi"),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
    } catch (e) {
      setPosErr("Gagal mengaktifkan GPS");
    }
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ---- kontrol kamera scanner ----
  const stopCamera = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try { await s.stop(); } catch (e) { /* ignore */ }
      try { await s.clear(); } catch (e) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!cameraOn || step !== "scan") return;
      setCamErr("");
      try {
        const html5 = new Html5Qrcode("qr-reader", { verbose: false });
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled) return;
            handleDecoded(decoded);
          },
          () => {}
        );
      } catch (e) {
        setCamErr("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan, atau gunakan input manual.");
        setCameraOn(false);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [cameraOn, step]);

  // stop kamera saat unmount
  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const handleDecoded = async (text) => {
    await stopCamera();
    setCameraOn(false);
    setQr(text);
    await runVerify(text);
  };

  const runVerify = async (qrText) => {
    const p = effectivePos;
    if (!p) {
      toast.error("Lokasi belum siap. Aktifkan GPS atau isi lokasi manual.");
      return;
    }
    setVerifying(true);
    try {
      const { data } = await api.post("/mobile/verify", {
        qr: qrText, lat: p.lat, lng: p.lng, accuracy: p.accuracy,
      });
      setVerifyRes(data);
      if (data.qr_found && data.record) {
        // prefill form dengan nilai pengukuran yang ada (bisa diubah petugas)
        const init = {};
        MEAS_FIELDS.forEach((f) => { init[f.key] = data.record[f.key] ?? ""; });
        setForm(init);
      }
      setStep("result");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setVerifying(false);
    }
  };

  // jarak live (dihitung ulang saat posisi berubah)
  const liveDistance = React.useMemo(() => {
    if (!verifyRes?.record || !effectivePos) return null;
    const rx = parseFloat(verifyRes.record.koord_x) || 0; // lng
    const ry = parseFloat(verifyRes.record.koord_y) || 0; // lat
    if (rx === 0 && ry === 0) return null;
    return haversine(effectivePos.lat, effectivePos.lng, ry, rx);
  }, [verifyRes, effectivePos]);

  const locationOk = liveDistance != null && liveDistance <= tolerance;
  const qrOk = !!verifyRes?.qr_found;
  const canProceed = qrOk && locationOk;

  const submit = async () => {
    if (!verifyRes?.record || !effectivePos) return;
    setSubmitting(true);
    try {
      const payload = {
        record_id: verifyRes.record.id,
        qr,
        lat: effectivePos.lat,
        lng: effectivePos.lng,
        accuracy: effectivePos.accuracy,
      };
      MEAS_FIELDS.forEach((f) => { payload[f.key] = parseFloat(form[f.key]) || 0; });
      const { data } = await api.post("/mobile/submit", payload);
      setResult(data);
      setStep("done");
      toast.success("Data pengukuran berhasil disimpan & tersinkron");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = async () => {
    await stopCamera();
    setStep("scan");
    setVerifyRes(null);
    setQr("");
    setManualQr("");
    setForm({});
    setResult(null);
  };

  const doLogout = async () => {
    await stopCamera();
    await logout();
    navigate("/login");
  };

  // ---------------------------------------------------------------- UI
  const gpsBadge = (
    <div className="flex items-center gap-2 text-xs" data-testid="gps-status">
      <Navigation className={`w-3.5 h-3.5 ${pos ? "text-emerald-300" : "text-amber-300"}`} />
      {pos ? (
        <span className="text-emerald-50/90">
          GPS aktif · akurasi ±{Math.round(pos.accuracy)} m
        </span>
      ) : (
        <span className="text-amber-200">{posErr || "Mencari lokasi..."}</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F291E] via-[#123528] to-[#0B1D15] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0F291E]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#84CC16] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#0F291E]" />
            </div>
            <div className="leading-tight">
              <div className="font-heading font-extrabold text-sm">EQMS Lapangan</div>
              <div className="text-[10px] text-white/60">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={doLogout}
            data-testid="mobile-logout"
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-24 pt-4 space-y-4">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-white/60">
          {[
            ["scan", "Scan QR"],
            ["result", "Validasi"],
            ["form", "Isi Form"],
            ["done", "Selesai"],
          ].map(([k, lbl], i) => {
            const order = ["scan", "result", "form", "done"];
            const active = order.indexOf(step) >= i;
            return (
              <React.Fragment key={k}>
                <span className={`px-2 py-1 rounded-full ${active ? "bg-[#84CC16] text-[#0F291E] font-semibold" : "bg-white/10"}`}>
                  {lbl}
                </span>
                {i < 3 && <ChevronRight className="w-3 h-3 opacity-40" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* GPS status */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            {gpsBadge}
            <button
              onClick={() => setManualLoc((v) => !v)}
              className="text-[11px] text-white/50 hover:text-white/80 underline"
              data-testid="toggle-manual-loc"
            >
              {manualLoc ? "Pakai GPS" : "Lokasi manual"}
            </button>
          </div>
          {manualLoc && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input
                data-testid="manual-lat"
                placeholder="Lat (Y)"
                value={mLat}
                onChange={(e) => setMLat(e.target.value)}
                className="h-10 bg-white/10 border-white/15 text-white placeholder:text-white/40"
              />
              <Input
                data-testid="manual-lng"
                placeholder="Lng (X)"
                value={mLng}
                onChange={(e) => setMLng(e.target.value)}
                className="h-10 bg-white/10 border-white/15 text-white placeholder:text-white/40"
              />
            </div>
          )}
        </div>

        {/* STEP: SCAN */}
        {step === "scan" && (
          <div className="space-y-4" data-testid="step-scan">
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-[#84CC16]" />
                <span className="font-semibold text-sm">Pindai QR Titik Sampel</span>
              </div>
              <div className="p-4 space-y-3">
                <div
                  id="qr-reader"
                  className="rounded-xl overflow-hidden bg-black/40 min-h-[220px] flex items-center justify-center"
                >
                  {!cameraOn && (
                    <div className="text-center text-white/50 text-sm py-10 px-4">
                      <QrCode className="w-10 h-10 mx-auto mb-2 opacity-60" />
                      Kamera mati. Tekan tombol di bawah untuk memindai QR.
                    </div>
                  )}
                </div>
                {camErr && <p className="text-amber-300 text-xs">{camErr}</p>}
                {!cameraOn ? (
                  <Button
                    onClick={() => setCameraOn(true)}
                    data-testid="start-camera"
                    className="w-full h-12 bg-[#84CC16] hover:bg-[#a3e635] text-[#0F291E] font-bold rounded-xl"
                  >
                    <Camera className="w-5 h-5 mr-2" /> Nyalakan Kamera
                  </Button>
                ) : (
                  <Button
                    onClick={async () => { await stopCamera(); setCameraOn(false); }}
                    variant="outline"
                    data-testid="stop-camera"
                    className="w-full h-12 bg-transparent border-white/20 text-white hover:bg-white/10 rounded-xl"
                  >
                    <CameraOff className="w-5 h-5 mr-2" /> Matikan Kamera
                  </Button>
                )}
              </div>
            </div>

            {/* input manual QR */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <Label className="text-xs text-white/60 uppercase tracking-wider">Input QR / Id Actual manual</Label>
              <div className="flex gap-2">
                <Input
                  data-testid="manual-qr"
                  value={manualQr}
                  onChange={(e) => setManualQr(e.target.value)}
                  placeholder="Tempel isi QR di sini"
                  className="h-11 bg-white/10 border-white/15 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={() => manualQr.trim() && handleDecoded(manualQr.trim())}
                  disabled={verifying || !manualQr.trim()}
                  data-testid="verify-manual-qr"
                  className="h-11 px-4 bg-[#1B4D3E] hover:bg-[#0F291E] text-white rounded-xl"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cek"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: RESULT (validasi QR + lokasi) */}
        {step === "result" && verifyRes && (
          <div className="space-y-4" data-testid="step-result">
            {/* QR status */}
            <div className={`rounded-2xl border p-4 flex items-start gap-3 ${qrOk ? "bg-emerald-500/10 border-emerald-400/30" : "bg-red-500/10 border-red-400/30"}`}>
              {qrOk ? <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" /> : <XCircle className="w-6 h-6 text-red-300 shrink-0" />}
              <div className="text-sm">
                <div className="font-semibold">{qrOk ? "QR cocok dengan data" : "QR tidak dikenali"}</div>
                <div className="text-white/60 break-all text-xs mt-0.5">{qr}</div>
                {!qrOk && <div className="text-red-200 text-xs mt-1">{verifyRes.message}</div>}
              </div>
            </div>

            {/* Lokasi status */}
            {qrOk && (
              <div className={`rounded-2xl border p-4 ${locationOk ? "bg-emerald-500/10 border-emerald-400/30" : "bg-amber-500/10 border-amber-400/30"}`} data-testid="location-status">
                <div className="flex items-start gap-3">
                  <MapPin className={`w-6 h-6 shrink-0 ${locationOk ? "text-emerald-300" : "text-amber-300"}`} />
                  <div className="text-sm flex-1">
                    <div className="font-semibold">{locationOk ? "Lokasi sesuai" : "Lokasi belum sesuai"}</div>
                    <div className="text-white/70 text-xs mt-0.5">
                      Jarak ke titik: {liveDistance != null ? `${liveDistance.toFixed(1)} m` : "—"} · toleransi {tolerance} m
                    </div>
                    {!locationOk && (
                      <div className="text-amber-200 text-xs mt-1">
                        Dekati titik sampel hingga jarak ≤ {tolerance} m. {pos ? `Akurasi GPS ±${Math.round(pos.accuracy)} m.` : "Menunggu GPS..."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Identitas ringkas */}
            {qrOk && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Data titik (otomatis)</div>
                <div className="text-sm font-semibold break-all mb-2">{verifyRes.record.id_actual}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {IDENTITY.map(([k, lbl]) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-white/5 pb-1">
                      <span className="text-white/50">{lbl}</span>
                      <span className="font-medium text-right">{String(verifyRes.record[k] ?? "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={resetAll}
                variant="outline"
                data-testid="result-rescan"
                className="flex-1 h-12 bg-transparent border-white/20 text-white hover:bg-white/10 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Ulangi Scan
              </Button>
              <Button
                onClick={() => setStep("form")}
                disabled={!canProceed}
                data-testid="result-continue"
                className="flex-1 h-12 bg-[#84CC16] hover:bg-[#a3e635] text-[#0F291E] font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Isi Form <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {!canProceed && (
              <p className="text-center text-xs text-amber-200" data-testid="proceed-blocked">
                Form terkunci sampai QR & lokasi sesuai.
              </p>
            )}
          </div>
        )}

        {/* STEP: FORM */}
        {step === "form" && verifyRes?.record && (
          <div className="space-y-4" data-testid="step-form">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Titik</div>
              <div className="text-sm font-semibold break-all">{verifyRes.record.id_actual}</div>
              <div className="text-xs text-white/60 mt-1">
                {verifyRes.record.kebun} · Afd {verifyRes.record.afdeling} · Blok {verifyRes.record.blok} · {verifyRes.record.titik_sample}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-300">
                <MapPin className="w-3.5 h-3.5" /> {liveDistance != null ? `${liveDistance.toFixed(1)} m` : "—"} dari titik
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Ruler className="w-4 h-4 text-[#84CC16]" /> Pengukuran Agronomi
              </div>
              {MEAS_FIELDS.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs text-white/70">{f.label} {f.unit && <span className="text-white/40">({f.unit})</span>}</Label>
                  <Input
                    data-testid={`meas-${f.key}`}
                    type="number"
                    inputMode="decimal"
                    step={f.step}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="h-11 mt-1 bg-white/10 border-white/15 text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep("result")}
                variant="outline"
                className="flex-1 h-12 bg-transparent border-white/20 text-white hover:bg-white/10 rounded-xl"
              >
                Kembali
              </Button>
              <Button
                onClick={submit}
                disabled={submitting || !canProceed}
                data-testid="submit-form"
                className="flex-[2] h-12 bg-[#84CC16] hover:bg-[#a3e635] text-[#0F291E] font-bold rounded-xl disabled:opacity-40"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan & Sinkron"}
              </Button>
            </div>
            {!canProceed && (
              <p className="text-center text-xs text-amber-200">
                Anda menjauh dari titik ({liveDistance != null ? liveDistance.toFixed(1) : "?"} m). Dekati lagi untuk menyimpan.
              </p>
            )}
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && result && (
          <div className="space-y-4 text-center" data-testid="step-done">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-6">
              <CheckCircle2 className="w-14 h-14 text-emerald-300 mx-auto mb-3" />
              <div className="font-heading text-lg font-bold">Tersimpan & Tersinkron</div>
              <div className="text-sm text-white/70 mt-1">
                Data pengukuran terkirim ke dashboard secara real-time.
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-[10px] text-white/50 uppercase">LAI</div>
                  <div className="font-bold text-[#84CC16]">{result.record?.lai ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-[10px] text-white/50 uppercase">SPH</div>
                  <div className="font-bold">{result.record?.sph ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-[10px] text-white/50 uppercase">Jarak</div>
                  <div className="font-bold">{result.distance_m} m</div>
                </div>
              </div>
            </div>
            <Button
              onClick={resetAll}
              data-testid="scan-next"
              className="w-full h-12 bg-[#84CC16] hover:bg-[#a3e635] text-[#0F291E] font-bold rounded-xl"
            >
              <ScanLine className="w-5 h-5 mr-2" /> Scan Titik Berikutnya
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
