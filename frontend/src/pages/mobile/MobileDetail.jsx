import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Crosshair, Save, Leaf, Lock, Navigation, Ruler } from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { buildPayload, MEASUREMENT_FIELDS, recordTitle, isTagged, fmtNum, haversineMeters, fmtDistance } from "@/lib/recordFields";
import { enqueueUpdate } from "@/lib/offlineQueue";

export default function MobileDetail({ record, isEditor, online, onBack, onSaved }) {
  const [koordX, setKoordX] = useState(record.koord_x != null ? String(record.koord_x) : "");
  const [koordY, setKoordY] = useState(record.koord_y != null ? String(record.koord_y) : "");
  const [accuracy, setAccuracy] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
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

  const takeGps = () => {
    if (!navigator.geolocation) { toast.error("Perangkat tidak mendukung GPS"); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setKoordY(String(latitude));   // Y = lintang (lat)
        setKoordX(String(longitude));  // X = bujur (lng)
        setAccuracy(acc ? Math.round(acc) : null);
        setGpsBusy(false);
        toast.success("Koordinat GPS diambil");
      },
      (err) => {
        setGpsBusy(false);
        toast.error(err.code === 1 ? "Izin lokasi ditolak" : "Gagal mengambil GPS");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const parseCoord = (v) => Number(String(v).replace(",", "."));
  const hasCoord = () => {
    const x = parseCoord(koordX);
    const y = parseCoord(koordY);
    return Number.isFinite(x) && Number.isFinite(y) && (x !== 0 || y !== 0);
  };

  const openMaps = () => {
    const x = parseCoord(koordX);
    const y = parseCoord(koordY);
    // Google Maps directions: destination lat,lng (origin = posisi perangkat)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${y},${x}`, "_blank");
  };

  const calcDistance = () => {
    if (!navigator.geolocation) { toast.error("Perangkat tidak mendukung GPS"); return; }
    setDistBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const x = parseCoord(koordX);
        const y = parseCoord(koordY);
        setDistance(haversineMeters(pos.coords.latitude, pos.coords.longitude, y, x));
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
    const overrides = {
      koord_x: koordX === "" ? 0 : Number(String(koordX).replace(",", ".")),
      koord_y: koordY === "" ? 0 : Number(String(koordY).replace(",", ".")),
    };
    MEASUREMENT_FIELDS.forEach((f) => {
      overrides[f.key] = meas[f.key] === "" ? 0 : Number(String(meas[f.key]).replace(",", "."));
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
        // kegagalan jaringan -> antre offline
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

        {/* Koordinat GPS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <MapPin className="h-4 w-4 text-emerald-600" /> Koordinat Tagging
          </div>
          <button
            data-testid="gps-btn"
            onClick={takeGps}
            disabled={!isEditor || gpsBusy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            <Crosshair className={`h-4 w-4 ${gpsBusy ? "animate-pulse" : ""}`} /> {gpsBusy ? "Mengambil GPS..." : "Ambil Koordinat GPS"}
          </button>
          {accuracy != null && (
            <div className="text-[11px] text-slate-500 text-center">Akurasi ±{accuracy} m</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Koord X (Bujur)" testid="koord-x" value={koordX} onChange={setKoordX} disabled={!isEditor} />
            <Field label="Koord Y (Lintang)" testid="koord-y" value={koordY} onChange={setKoordY} disabled={!isEditor} />
          </div>
        </div>

        {/* Navigasi ke lokasi */}
        {hasCoord() && (
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
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Leaf className="h-4 w-4 text-emerald-600" /> Data Pengukuran Daun
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <Field
                key={f.key}
                testid={`meas-${f.key}`}
                label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}
                value={meas[f.key]}
                onChange={(v) => setMeas((m) => ({ ...m, [f.key]: v }))}
                disabled={!isEditor}
              />
            ))}
          </div>
        </div>

        {isEditor && (
          <button
            data-testid="save-btn"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0F291E] text-white font-semibold text-sm shadow-md disabled:opacity-60"
          >
            <Save className="h-5 w-5" /> {saving ? "Menyimpan..." : online ? "Simpan Data" : "Simpan (Offline)"}
          </button>
        )}
      </div>
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

function Field({ label, value, onChange, disabled, testid }) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        data-testid={testid}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0"
        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}
