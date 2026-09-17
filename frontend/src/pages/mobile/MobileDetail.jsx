import React, { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Crosshair, Save, Leaf, Lock, Navigation, Ruler,
  ScanLine, CheckCircle2, Circle,
} from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import {
  buildPayload, MEASUREMENT_FIELDS, recordTitle, isTagged, fmtNum,
  haversineMeters, fmtDistance, coordFilled,
} from "@/lib/recordFields";
import { enqueueUpdate } from "@/lib/offlineQueue";

const MAX_MOVE_M = 4; // toleransi jarak GPS terhadap titik koordinat yang ada (meter)

export default function MobileDetail({ record, isEditor, online, viaScan, onBack, onSaved }) {
  const refX = Number(record.koord_x) || 0; // koordinat acuan (bujur)
  const refY = Number(record.koord_y) || 0; // koordinat acuan (lintang)
  const hasRef = coordFilled(refX) && coordFilled(refY);

  const [koordX, setKoordX] = useState(hasRef ? String(refX) : "");
  const [koordY, setKoordY] = useState(hasRef ? String(refY) : "");
  const [accuracy, setAccuracy] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsDone, setGpsDone] = useState(false); // GPS diambil & lolos syarat pada sesi ini
  const [saving, setSaving] = useState(false);
  const [distance, setDistance] = useState(null);
  const [distBusy, setDistBusy] = useState(false);
  const [meas, setMeas] = useState(() => {
    const m = {};
    MEASUREMENT_FIELDS.forEach((f) => {
      const v = record[f.key];
      m[f.key] = v != null && v !== 0 ? String(v) : "";
    });
    return m;
  });

  // Mode isi data hanya aktif bila dibuka via Scan QR & user boleh edit
  const canFill = Boolean(viaScan && isEditor);
  const measUnlocked = canFill && gpsDone;
  const allMeasFilled = MEASUREMENT_FIELDS.every((f) => String(meas[f.key]).trim() !== "");
  const canSave = measUnlocked && allMeasFilled;

  const takeGps = () => {
    if (!navigator.geolocation) { toast.error("Perangkat tidak mendukung GPS"); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        if (hasRef) {
          const d = haversineMeters(latitude, longitude, refY, refX);
          if (d > MAX_MOVE_M) {
            setGpsBusy(false);
            toast.error(`Koordinat terlalu jauh (${Math.round(d)} m) dari titik. Maksimal ${MAX_MOVE_M} m — dekati titik lalu ulangi.`);
            return;
          }
        }
        setKoordY(String(latitude));   // Y = lintang
        setKoordX(String(longitude));  // X = bujur
        setAccuracy(acc ? Math.round(acc) : null);
        setGpsDone(true);
        setGpsBusy(false);
        toast.success("Koordinat GPS terverifikasi");
      },
      (err) => {
        setGpsBusy(false);
        toast.error(err.code === 1 ? "Izin lokasi ditolak" : "Gagal mengambil GPS");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const parseCoord = (v) => Number(String(v).replace(",", "."));
  const navX = gpsDone ? parseCoord(koordX) : refX;
  const navY = gpsDone ? parseCoord(koordY) : refY;
  const showNav = hasRef || gpsDone;

  const openMaps = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${navY},${navX}`, "_blank");
  };

  const calcDistance = () => {
    if (!navigator.geolocation) { toast.error("Perangkat tidak mendukung GPS"); return; }
    setDistBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDistance(haversineMeters(pos.coords.latitude, pos.coords.longitude, navY, navX));
        setDistBusy(false);
      },
      (err) => {
        setDistBusy(false);
        toast.error(err.code === 1 ? "Izin lokasi ditolak" : "Gagal mengambil posisi");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!canSave) {
      if (!gpsDone) toast.error("Ambil koordinat GPS terlebih dahulu");
      else if (!allMeasFilled) toast.error("Semua field pengukuran wajib diisi");
      return;
    }
    const overrides = {
      koord_x: parseCoord(koordX),
      koord_y: parseCoord(koordY),
    };
    MEASUREMENT_FIELDS.forEach((f) => {
      overrides[f.key] = meas[f.key] === "" ? 0 : parseCoord(meas[f.key]);
    });
    const payload = buildPayload(record, overrides);
    setSaving(true);

    if (!navigator.onLine) {
      await enqueueUpdate(record._id, payload, { title: recordTitle(record) });
      toast.success("Disimpan offline — akan sinkron saat online");
      setSaving(false);
      onSaved({ ...record, ...payload }, true);
      return;
    }
    try {
      const res = await api.put(`/records/${record._id}`, payload);
      toast.success("Data tersimpan");
      setSaving(false);
      onSaved(res.data, false);
    } catch (e) {
      if (!e.response) {
        await enqueueUpdate(record._id, payload, { title: recordTitle(record) });
        toast.success("Koneksi terputus — disimpan ke antrian");
        setSaving(false);
        onSaved({ ...record, ...payload }, true);
      } else {
        setSaving(false);
        toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Gagal menyimpan");
      }
    }
  };

  const tagged = isTagged(record);

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-2.5 flex items-center gap-2">
        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-600 active:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-800 truncate">{recordTitle(record)}</div>
          <div className="text-[11px] text-slate-500 truncate">{record.id_actual}</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info lokasi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 gap-3 text-sm">
          <Info label="Kebun" value={record.kebun} />
          <Info label="Afdeling" value={record.afdeling} />
          <Info label="Blok" value={record.blok} />
          <Info label="Kode LSU" value={record.code_lsu} />
          <Info label="Titik Sample" value={record.titik_sample} />
          <Info label="Status" value={tagged ? "Sudah di-tagging" : "Belum di-tagging"} />
        </div>

        {!isEditor && (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-500 text-xs rounded-xl px-3 py-2">
            <Lock className="h-4 w-4" /> Akun Anda hanya bisa melihat data (read-only).
          </div>
        )}

        {isEditor && !viaScan && (
          <div data-testid="scan-required" className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2.5">
            <ScanLine className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Untuk <b>mengisi / memperbarui</b> data, buka lokasi ini melalui menu <b>Scan</b> lalu pindai QR-nya. Halaman ini hanya menampilkan data.</span>
          </div>
        )}

        {/* Langkah wajib (bertahap) */}
        {canFill && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Langkah Wajib</div>
            <Step done={true} label="1. Scan QR lokasi" hint="Terverifikasi" />
            <Step done={gpsDone} label="2. Ambil koordinat GPS" hint={gpsDone ? "Selesai" : "Belum"} />
            <Step done={measUnlocked && allMeasFilled} label="3. Isi data pengukuran" hint={measUnlocked ? (allMeasFilled ? "Lengkap" : "Belum lengkap") : "Terkunci"} />
          </div>
        )}

        {/* Koordinat GPS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <MapPin className="h-4 w-4 text-emerald-600" /> Koordinat Tagging
          </div>
          {canFill && (
            <>
              <button
                data-testid="gps-btn"
                onClick={takeGps}
                disabled={gpsBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
              >
                <Crosshair className={`h-4 w-4 ${gpsBusy ? "animate-pulse" : ""}`} /> {gpsBusy ? "Mengambil GPS..." : "Ambil Koordinat GPS"}
              </button>
              {hasRef && (
                <div className="text-[11px] text-slate-500 text-center">
                  Hasil GPS harus dalam radius {MAX_MOVE_M} m dari titik acuan.
                </div>
              )}
              {accuracy != null && (
                <div className="text-[11px] text-emerald-600 text-center">Akurasi ±{accuracy} m • koordinat terverifikasi</div>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Koord X (Bujur)" testid="koord-x" value={koordX} disabled readOnly placeholder="via GPS" />
            <Field label="Koord Y (Lintang)" testid="koord-y" value={koordY} disabled readOnly placeholder="via GPS" />
          </div>
        </div>

        {/* Navigasi ke lokasi */}
        {showNav && (
          <div data-testid="nav-card" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Navigation className="h-4 w-4 text-emerald-600" /> Navigasi ke Lokasi
            </div>
            <button
              data-testid="maps-btn"
              onClick={openMaps}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm"
            >
              <Navigation className="h-4 w-4" /> Arahkan via Google Maps
            </button>
            <button
              data-testid="distance-btn"
              onClick={calcDistance}
              disabled={distBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm disabled:opacity-60"
            >
              <Ruler className={`h-4 w-4 ${distBusy ? "animate-pulse" : ""}`} /> {distBusy ? "Menghitung..." : "Hitung Jarak dari Posisi Saya"}
            </button>
            {distance != null && (
              <div data-testid="distance-value" className="text-center text-sm text-slate-700">
                Jarak dari posisi Anda: <span className="font-bold text-emerald-700">{fmtDistance(distance)}</span>
              </div>
            )}
          </div>
        )}

        {/* Pengukuran daun */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Leaf className="h-4 w-4 text-emerald-600" /> Data Pengukuran Daun
            </div>
            {canFill && !measUnlocked && (
              <span data-testid="meas-locked" className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                <Lock className="h-3 w-3" /> Ambil GPS dulu
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <Field
                key={f.key}
                testid={`meas-${f.key}`}
                label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}
                value={meas[f.key]}
                onChange={(v) => setMeas((m) => ({ ...m, [f.key]: v }))}
                disabled={!measUnlocked}
              />
            ))}
          </div>
        </div>

        {canFill && (
          <>
            <button
              data-testid="save-btn"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0F291E] text-white font-semibold text-sm shadow-md disabled:opacity-40"
            >
              <Save className="h-5 w-5" /> {saving ? "Menyimpan..." : online ? "Simpan Data" : "Simpan (Offline)"}
            </button>
            {!canSave && (
              <div className="text-center text-[11px] text-slate-400 -mt-1">
                {!gpsDone ? "Ambil koordinat GPS untuk membuka pengisian." : "Lengkapi semua field pengukuran agar bisa menyimpan."}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Step({ done, label, hint }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
      <span className={done ? "text-slate-800" : "text-slate-500"}>{label}</span>
      <span className={`ml-auto text-[10px] font-semibold ${done ? "text-emerald-600" : "text-slate-400"}`}>{hint}</span>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-800 font-medium truncate">{value || "-"}</div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, testid, readOnly, placeholder }) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        data-testid={testid}
        inputMode="decimal"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder != null ? placeholder : "0"}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}
