import React, { useMemo, useState } from "react";
import { Search, RefreshCw, ScanLine, ChevronRight, MapPin, Award } from "lucide-react";
import { isTagged, recordTitle, fmtNum } from "@/lib/recordFields";

export default function MobileHome({ records, loading, myToday, userName, onRefresh, onOpen, onGoScan }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | tagged | untagged

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return records.filter((r) => {
      if (status === "tagged" && !isTagged(r)) return false;
      if (status === "untagged" && isTagged(r)) return false;
      if (!norm) return true;
      const hay = [r.kebun, r.afdeling, r.blok, r.code_lsu, r.titik_sample, r.id_actual]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return hay.includes(norm);
    });
  }, [records, q, status]);

  const taggedCount = useMemo(() => records.filter(isTagged).length, [records]);

  const chip = (id, label, count, color) => (
    <button
      data-testid={`filter-${id}`}
      onClick={() => setStatus(id)}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
        status === id ? `${color} text-white border-transparent` : "bg-white text-slate-600 border-slate-200"
      }`}
    >
      {label} {count != null && <span className="opacity-80">({count})</span>}
    </button>
  );

  return (
    <div className="p-4 space-y-3">
      {myToday != null && (
        <div
          data-testid="petugas-summary"
          className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 flex items-center gap-3 shadow-sm"
        >
          <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-emerald-100/90">
              Halo{userName ? `, ${userName}` : ""} 👋
            </div>
            <div className="text-sm font-semibold leading-tight">
              Hari ini kamu sudah tagging{" "}
              <span data-testid="petugas-today-count" className="text-lg font-extrabold">{myToday}</span> titik
            </div>
            <div className="text-[11px] text-emerald-100/80">
              {myToday === 0 ? "Ayo mulai tagging titik pertamamu!" : "Kerja bagus, terus semangat! 🌱"}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            data-testid="home-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kebun / blok / LSU / Id"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button
          onClick={onRefresh}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <button
        onClick={onGoScan}
        data-testid="home-scan-cta"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm active:scale-[.99]"
      >
        <ScanLine className="h-5 w-5" /> Scan QR Lokasi
      </button>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {chip("all", "Semua", records.length, "bg-slate-700")}
        {chip("tagged", "Sudah", taggedCount, "bg-emerald-600")}
        {chip("untagged", "Belum", records.length - taggedCount, "bg-amber-500")}
      </div>

      <div className="text-xs text-slate-500">{filtered.length} lokasi</div>

      <div className="space-y-2">
        {loading && records.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">Memuat data...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">Tidak ada data cocok.</div>
        )}
        {filtered.slice(0, 300).map((r) => {
          const tagged = isTagged(r);
          return (
            <button
              key={r._id}
              data-testid="record-card"
              onClick={() => onOpen(r)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 active:bg-slate-50"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tagged ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 truncate">{recordTitle(r)}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {tagged ? `X: ${fmtNum(r.koord_x)}  Y: ${fmtNum(r.koord_y)}` : "Koordinat belum diisi"}
                </div>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagged ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {tagged ? "Sudah di-tagging" : "Belum di-tagging"}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
