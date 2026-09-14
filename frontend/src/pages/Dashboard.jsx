import { useEffect, useMemo, useState, Fragment } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
  Leaf,
  LogOut,
  Plus,
  Search,
  Upload,
  FileText,
  Tags,
  Trash2,
  Pencil,
  Download,
  MapPin,
  Layers,
  Map as MapIcon,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  QrCode,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecordDialog } from "@/components/RecordDialog";
import { ImportDialog } from "@/components/ImportDialog";
import CoordinateMap from "@/components/CoordinateMap";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import api, { API } from "@/lib/api";

const HERO_IMG =
  "https://images.unsplash.com/photo-1540843650088-e05e97f1855b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

function StatCard({ icon: Icon, label, value, accent, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      className={`stat-elegant rounded-2xl border p-5 fade-in ${
        clickable
          ? "cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16]"
          : ""
      }`}
      style={{ "--stat-accent": accent }}
      data-testid={`stat-${label}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={clickable ? "Klik untuk lihat data di tabel" : undefined}
    >
      <div className="stat-glow" />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5"
          style={{ background: accent + "1A" }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
      <p className="relative font-heading text-[2.1rem] leading-none font-extrabold mt-4 text-[#0B1D15] dark:text-emerald-50 tracking-tight">
        {value}
      </p>
      <div className="relative mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: "100%", background: accent, opacity: 0.35 }} />
      </div>
      {clickable && (
        <span className="relative mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          Lihat di tabel <ChevronRight className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function KebunBreakdownCard({ item }) {
  const pct = item.total ? Math.round((item.tagged / item.total) * 100) : 0;
  return (
    <div className="stat-elegant rounded-2xl border p-5 fade-in" style={{ "--stat-accent": "#10B981" }}>
      <div className="stat-glow" />
      <div className="relative flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-black/5 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-lg text-[#0B1D15] dark:text-emerald-50 leading-none">{item.kebun}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {item.afdelings.length} afdeling · {item.blokCount} blok
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-2xl font-extrabold text-[#1B4D3E] dark:text-emerald-300 leading-none">
            {item.total.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">data</div>
        </div>
      </div>
      {/* Ringkasan tagging tingkat kebun */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{item.tagged.toLocaleString("id-ID")} sudah</span>
          <span className="font-semibold text-amber-600">{item.untagged.toLocaleString("id-ID")} belum</span>
        </div>
        <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden flex">
          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">{pct}% sudah di-tagging</div>
      </div>
      <div className="relative space-y-2">
        {item.afdelings.map((a) => {
          const apct = a.count ? (a.tagged / a.count) * 100 : 0;
          return (
            <div key={a.afdeling} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-medium text-[#0B1D15] dark:text-emerald-50 truncate" title={a.afdeling}>
                Afd {a.afdeling}
              </span>
              <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden flex" title={`${a.tagged} sudah / ${a.untagged} belum`}>
                <div className="h-full bg-emerald-500" style={{ width: `${apct}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-mono font-semibold">
                <span className="text-emerald-700 dark:text-emerald-400">{a.tagged.toLocaleString("id-ID")}</span>
                <span className="text-muted-foreground">/{a.count.toLocaleString("id-ID")}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtNum(v) {  if (v === "" || v === null || v === undefined) return "";
  const n = parseFloat(String(v).replace(",", "."));
  if (Number.isNaN(n)) return "";
  return String(n).replace(".", ",");
}

// Format angka umum utk tabel (buang desimal jika bulat, koma utk desimal)
function fmtGeneric(v) {
  if (v === "" || v === null || v === undefined) return "";
  const n = parseFloat(String(v).replace(",", "."));
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

// Kolom data tabel (selain QR, ID Actual, Status Tagging, Aksi)
const DATA_COLUMNS = [
  ["kebun", "Kebun", "text"],
  ["afdeling", "Afdeling", "text"],
  ["code_lsu", "Kode LSU", "mono"],
  ["blok", "Block", "text"],
  ["luas_ha", "Luas (Ha)", "num"],
  ["jumlah_pokok", "Jumlah Pokok", "num"],
  ["titik_sample", "Titik Sample", "text"],
  ["koord_x", "Koordinat (X)", "coord"],
  ["koord_y", "Koordinat (Y)", "coord"],
  ["kategori", "Kategori", "text"],
  ["keterangan", "Keterangan", "text"],
  ["sph", "SPH", "num"],
  ["jumlah_pelepah", "Jumlah pelepah", "num"],
  ["panjang_pelepah", "Panjang pelepah (cm)", "num"],
  ["lebar_petiol", "Lebar petiol (cm)", "num"],
  ["tebal_petiol", "Tebal petiol (cm)", "num"],
  ["panjang_helai_1", "Panjang helai anak daun 1 (cm)", "num"],
  ["panjang_helai_2", "Panjang helai anak daun 2 (cm)", "num"],
  ["lebar_helai_1", "Lebar helai anak daun 1 (cm)", "num"],
  ["lebar_helai_2", "Lebar helai anak daun 2 (cm)", "num"],
  ["jumlah_anak_daun", "Jumlah anak daun (helai)", "num"],
  ["tanggal_lsu", "Tanggal LSU", "text"],
  ["la", "LA", "num"],
  ["lai", "LAI", "num"],
];

function cellValue(r, key, kind) {
  const v = r[key];
  if (kind === "coord") return fmtNum(v);
  if (kind === "num") return fmtGeneric(v);
  return v === null || v === undefined ? "" : String(v);
}

// Metrik agronomi untuk panel ringkasan
const AGRO_METRICS = [
  { key: "lai", label: "LAI", unit: "", digits: 4, showTotal: false },
  { key: "panjang_pelepah", label: "Panjang Pelepah", unit: "cm", digits: 1, showTotal: false },
  { key: "sph", label: "SPH", unit: "pkk/ha", digits: 2, showTotal: false },
  { key: "jumlah_pelepah", label: "Jumlah Pelepah", unit: "", digits: 1, showTotal: true },
];

function metricStats(list, key) {
  const vals = list
    .map((r) => parseFloat(String(r[key]).replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!vals.length) return { avg: null, min: null, max: null, sum: 0, count: 0 };
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    avg: sum / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    sum,
    count: vals.length,
  };
}

function fmtStat(v, digits) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(r).replace(".", ",");
}

function payloadOf(r) {
  // Isi QR = Id Actual (gabungan Kebun+Afdeling+Blok+CodeLSU+Koord_X+Koord_Y, tanpa pemisah)
  return (
    r.id_actual ||
    `${r.kebun ?? ""}${r.afdeling ?? ""}${r.blok ?? ""}${r.code_lsu ?? ""}${fmtNum(r.koord_x)}${fmtNum(r.koord_y)}`
  );
}

// Status tagging: dianggap "sudah di-tagging" jika Koord X & Koord Y terisi dan bukan 0
function hasCoord(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (s === "") return false;
  const n = parseFloat(s.replace(",", "."));
  if (Number.isFinite(n) && n === 0) return false; // nilai 0 dianggap belum di-tagging
  return true;
}
function isTagged(r) {
  return hasCoord(r.koord_x) && hasCoord(r.koord_y);
}

// Tanda "Baru": data yang ditambahkan/di-upload dalam rentang tertentu (default 24 jam) berdasarkan created_at
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
function isNew(r, windowMs = NEW_WINDOW_MS) {
  if (!r || !r.created_at || !windowMs) return false;
  const t = new Date(r.created_at).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= windowMs;
}

const NEW_RANGE_OPTIONS = [
  { value: "1", label: "24 jam", days: 1 },
  { value: "3", label: "3 hari", days: 3 },
  { value: "7", label: "7 hari", days: 7 },
];


const LABEL_SIZES = {
  small: { name: "Kecil", perPage: 24, cols: 4, qr: 68, f1: "text-[11px]", f2: "text-[10px]" },
  medium: { name: "Sedang", perPage: 15, cols: 3, qr: 96, f1: "text-sm", f2: "text-xs" },
  large: { name: "Besar", perPage: 6, cols: 2, qr: 150, f1: "text-lg", f2: "text-base" },
};

function LabelPreview({ r, size }) {
  const cfg = LABEL_SIZES[size] || LABEL_SIZES.medium;
  const line1 = [r.kebun, r.afdeling, r.titik_sample, r.blok].filter(Boolean).join(" ");
  const line2 = `${fmtNum(r.koord_x)} ${fmtNum(r.koord_y)}`.trim();
  return (
    <div className="border-2 border-gray-900 rounded-sm bg-white flex flex-col items-center p-2">
      <div className="flex-1 flex items-center justify-center py-2">
        <QRCodeCanvas value={payloadOf(r)} size={cfg.qr} fgColor="#111827" level="M" />
      </div>
      <div className="w-full border-t border-gray-900 pt-1 text-center">
        <div className={`font-bold text-gray-900 leading-tight ${cfg.f1}`}>{line1}</div>
        <div className={`font-bold text-gray-900 leading-tight ${cfg.f2}`}>{line2}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kebunFilter, setKebunFilter] = useState("all");
  const [afdelingFilter, setAfdelingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | tagged | untagged
  const [newRange, setNewRange] = useState("1"); // "1" | "3" | "7" (hari)
  const [onlyNew, setOnlyNew] = useState(false);
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [tanggalFrom, setTanggalFrom] = useState("");
  const [tanggalTo, setTanggalTo] = useState("");
  const [visibleCols, setVisibleCols] = useState(() => new Set(DATA_COLUMNS.map((c) => c[0])));
  const [colMenuOpen, setColMenuOpen] = useState(false);
  // Tema gelap/terang
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {
      // ignore
    }
    setDark(next);
    window.setTimeout(() => root.classList.remove("theme-anim"), 400);
  };
  // Ikuti perubahan tema perangkat secara real-time (selama user belum memilih manual)
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      let saved = null;
      try {
        saved = localStorage.getItem("theme");
      } catch (err) {
        // ignore
      }
      if (saved) return; // hormati pilihan manual pengguna
      document.documentElement.classList.toggle("dark", e.matches);
      setDark(e.matches);
    };
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
  const [recordOpen, setRecordOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exporting, setExporting] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [mapOpen, setMapOpen] = useState(false);
  const [labelSize, setLabelSize] = useState("medium");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIds, setPreviewIds] = useState(null); // null = semua data, array = terpilih
  const [previewSource, setPreviewSource] = useState("all"); // all | filter | selected
  const [exportScope, setExportScope] = useState("all"); // all | filter

  const load = async () => {
    setLoading(true);
    try {
      const [r, s, p] = await Promise.all([
        api.get("/records"),
        api.get("/records/stats"),
        api.get("/records/tagging-progress"),
      ]);
      setRecords(r.data);
      setStats(s.data);
      setProgress(p.data);
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const kebunOptions = useMemo(
    () => [...new Set(records.map((r) => r.kebun).filter(Boolean))],
    [records]
  );

  const afdelingOptions = useMemo(() => {
    const src = kebunFilter === "all" ? records : records.filter((r) => r.kebun === kebunFilter);
    return [...new Set(src.map((r) => r.afdeling).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), "id", { numeric: true })
    );
  }, [records, kebunFilter]);

  const kategoriOptions = useMemo(
    () => [...new Set(records.map((r) => r.kategori).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), "id", { numeric: true })
    ),
    [records]
  );

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter((r) => {
      const matchQ =
        !q ||
        [r.kebun, r.afdeling, r.blok, r.code_lsu, r.titik_sample, r.kategori].some((v) =>
          String(v || "").toLowerCase().includes(q)
        );
      const matchK = kebunFilter === "all" || r.kebun === kebunFilter;
      const matchA = afdelingFilter === "all" || String(r.afdeling) === String(afdelingFilter);
      const matchKat = kategoriFilter === "all" || String(r.kategori) === String(kategoriFilter);
      const tgl = String(r.tanggal_lsu || "").slice(0, 10);
      const matchFrom = !tanggalFrom || (tgl && tgl >= tanggalFrom);
      const matchTo = !tanggalTo || (tgl && tgl <= tanggalTo);
      return matchQ && matchK && matchA && matchKat && matchFrom && matchTo;
    });
  }, [records, search, kebunFilter, afdelingFilter, kategoriFilter, tanggalFrom, tanggalTo]);

  const taggingStats = useMemo(() => {
    let tagged = 0;
    for (const r of baseFiltered) if (isTagged(r)) tagged += 1;
    return { tagged, untagged: baseFiltered.length - tagged, total: baseFiltered.length };
  }, [baseFiltered]);

  // Ringkasan status tagging per BLOK (identitas blok = Kebun + Afdeling + Blok).
  // Blok "sudah tertagging" = SEMUA titik samplenya sudah punya koordinat.
  // Blok "belum" = masih ada minimal 1 titik tanpa koordinat (sebagian atau kosong).
  const blockTaggingStats = useMemo(() => {
    const map = new Map(); // key -> { total, tagged }
    for (const r of baseFiltered) {
      if (!r.blok) continue;
      const key = `${r.kebun || ""}||${r.afdeling || ""}||${r.blok || ""}`;
      let e = map.get(key);
      if (!e) {
        e = { total: 0, tagged: 0 };
        map.set(key, e);
      }
      e.total += 1;
      if (isTagged(r)) e.tagged += 1;
    }
    let fully = 0;
    let partial = 0;
    let none = 0;
    for (const e of map.values()) {
      if (e.tagged === e.total) fully += 1;
      else if (e.tagged === 0) none += 1;
      else partial += 1;
    }
    const total = map.size;
    return { total, fully, partial, none, belum: partial + none };
  }, [baseFiltered]);

  const globalUntagged = useMemo(
    () => records.reduce((n, r) => n + (isTagged(r) ? 0 : 1), 0),
    [records]
  );

  const focusUntagged = () => {
    setStatusFilter("untagged");
    setTimeout(() => {
      document.querySelector('[data-testid="records-table"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const progressData = useMemo(() => {
    const s = progress?.series || [];
    return s.map((d) => ({
      ...d,
      label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
    }));
  }, [progress]);

  const newWindowMs = useMemo(
    () => (parseInt(newRange, 10) || 1) * 24 * 60 * 60 * 1000,
    [newRange]
  );

  const filtered = useMemo(() => {
    let out = baseFiltered;
    if (statusFilter === "tagged") out = out.filter((r) => isTagged(r));
    else if (statusFilter === "untagged") out = out.filter((r) => !isTagged(r));
    if (onlyNew) out = out.filter((r) => isNew(r, newWindowMs));
    return out;
  }, [baseFiltered, statusFilter, onlyNew, newWindowMs]);

  // Ekspor Terpilih: deteksi filter aktif + kumpulan id hasil filter/pencarian
  const hasActiveFilter = useMemo(
    () =>
      search.trim() !== "" ||
      kebunFilter !== "all" ||
      afdelingFilter !== "all" ||
      kategoriFilter !== "all" ||
      statusFilter !== "all" ||
      onlyNew ||
      tanggalFrom !== "" ||
      tanggalTo !== "",
    [search, kebunFilter, afdelingFilter, kategoriFilter, statusFilter, onlyNew, tanggalFrom, tanggalTo]
  );
  const filteredIds = useMemo(() => filtered.map((r) => r._id), [filtered]);

  const newCount = useMemo(
    () => baseFiltered.reduce((n, r) => n + (isNew(r, newWindowMs) ? 1 : 0), 0),
    [baseFiltered, newWindowMs]
  );

  const breakdown = useMemo(() => {
    const map = {};
    for (const r of baseFiltered) {
      const k = r.kebun || "(Tanpa Kebun)";
      if (!map[k]) map[k] = { kebun: k, total: 0, tagged: 0, afd: {}, bloks: new Set() };
      map[k].total += 1;
      const tg = isTagged(r);
      if (tg) map[k].tagged += 1;
      const a = r.afdeling || "-";
      if (!map[k].afd[a]) map[k].afd[a] = { count: 0, tagged: 0 };
      map[k].afd[a].count += 1;
      if (tg) map[k].afd[a].tagged += 1;
      if (r.blok) map[k].bloks.add(r.blok);
    }
    return Object.values(map)
      .map((x) => ({
        kebun: x.kebun,
        total: x.total,
        tagged: x.tagged,
        untagged: x.total - x.tagged,
        blokCount: x.bloks.size,
        afdelings: Object.entries(x.afd)
          .map(([afdeling, v]) => ({
            afdeling,
            count: v.count,
            tagged: v.tagged,
            untagged: v.count - v.tagged,
          }))
          .sort((p, q) => String(p.afdeling).localeCompare(String(q.afdeling), "id", { numeric: true })),
      }))
      .sort((p, q) => q.total - p.total);
  }, [baseFiltered]);

  // Ringkasan agronomi (LAI, Panjang Pelepah, SPH, Jumlah Pelepah) — ikut filter aktif
  const agroSummary = useMemo(
    () => Object.fromEntries(AGRO_METRICS.map((m) => [m.key, metricStats(filtered, m.key)])),
    [filtered]
  );

  const agroByKebun = useMemo(() => {
    const map = {};
    for (const r of filtered) {
      const k = r.kebun || "(Tanpa Kebun)";
      const a = r.afdeling || "-";
      if (!map[k]) map[k] = { kebun: k, rows: [], afd: {} };
      map[k].rows.push(r);
      if (!map[k].afd[a]) map[k].afd[a] = [];
      map[k].afd[a].push(r);
    }
    return Object.values(map)
      .map((x) => ({
        kebun: x.kebun,
        count: x.rows.length,
        stats: Object.fromEntries(AGRO_METRICS.map((m) => [m.key, metricStats(x.rows, m.key)])),
        afdelings: Object.entries(x.afd)
          .map(([afdeling, list]) => ({
            afdeling,
            count: list.length,
            stats: Object.fromEntries(AGRO_METRICS.map((m) => [m.key, metricStats(list, m.key)])),
          }))
          .sort((p, q) => String(p.afdeling).localeCompare(String(q.afdeling), "id", { numeric: true })),
      }))
      .sort((p, q) => q.count - p.count);
  }, [filtered]);


  useEffect(() => {
    setPage(1);
  }, [search, kebunFilter, afdelingFilter, statusFilter, kategoriFilter, tanggalFrom, tanggalTo, pageSize]);

  // Reset filter afdeling bila kebun berubah dan afdeling tak lagi tersedia
  useEffect(() => {
    if (afdelingFilter !== "all" && !afdelingOptions.map(String).includes(String(afdelingFilter))) {
      setAfdelingFilter("all");
    }
  }, [afdelingOptions, afdelingFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r._id));

  const visibleColumns = useMemo(
    () => DATA_COLUMNS.filter(([k]) => visibleCols.has(k)),
    [visibleCols]
  );
  const tableColSpan = visibleColumns.length + 5; // checkbox + QR + ID Actual + status + aksi

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r._id)));
    }
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = () => {
    setEditing(null);
    setRecordOpen(true);
  };
  const openEdit = (r) => {
    setEditing(r);
    setRecordOpen(true);
  };

  const doDelete = async () => {
    try {
      await api.delete(`/records/${deleteTarget._id}`);
      toast.success("Data dihapus");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget._id);
        return next;
      });
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  const doBulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkDeleting(true);
    try {
      const res = await api.post("/records/delete-bulk", { ids });
      toast.success(`${res.data?.deleted ?? ids.length} data dihapus`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      load();
    } catch (e) {
      toast.error("Gagal menghapus data terpilih");
    } finally {
      setBulkDeleting(false);
    }
  };

  const downloadSingleQR = (r) => {
    const canvas = document.getElementById(`qr-canvas-${r._id}`);
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${r.kebun}_${r.blok}_${r.code_lsu}.png`.replace(/\s+/g, "-");
    a.click();
  };

  const exportPdf = async (mode, ids = null, size = labelSize) => {
    const key = ids ? `sel-${mode}` : mode;
    setExporting(key);
    const meta = {
      labels: { file: "label_qr_kebun.pdf", label: "PDF" },
      table: { file: "laporan_tabel_kebun.pdf", label: "PDF" },
      untagged: { file: "daftar_belum_tagging.pdf", label: "PDF" },
      "untagged-excel": { file: "daftar_belum_tagging.xlsx", label: "Excel" },
      excel: { file: "data_kebun.xlsx", label: "Excel" },
    }[mode] || { file: "export", label: "File" };
    try {
      const res = ids
        ? await api.post(
            `/records/export/${mode}`,
            mode === "labels" ? { ids, size } : { ids },
            { responseType: "blob" }
          )
        : await api.get(
            mode === "labels" ? `/records/export/${mode}?size=${size}` : `/records/export/${mode}`,
            { responseType: "blob" }
          );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.file;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${meta.label} berhasil dibuat`);
    } catch (e) {
      toast.error(`Gagal mengekspor ${meta.label}`);
    } finally {
      setExporting("");
    }
  };

  const openPreview = (ids = null, source = ids ? "selected" : "all") => {
    setPreviewIds(ids);
    setPreviewSource(source);
    setPreviewOpen(true);
  };

  // Apakah ada filter/kriteria yang sedang aktif?
  const anyFilterActive =
    !!search.trim() ||
    kebunFilter !== "all" ||
    afdelingFilter !== "all" ||
    kategoriFilter !== "all" ||
    statusFilter !== "all" ||
    !!tanggalFrom ||
    !!tanggalTo ||
    onlyNew;

  // Cetak label sesuai kriteria/filter yang sedang aktif di dashboard
  const openFilteredPreview = () => {
    if (!anyFilterActive) openPreview(null, "all");
    else openPreview(filtered.map((r) => r._id), "filter");
  };

  // Ringkasan kriteria aktif untuk ditampilkan di dialog cetak
  const activeCriteria = useMemo(() => {
    const parts = [];
    if (search.trim()) parts.push(`Cari: "${search.trim()}"`);
    if (kebunFilter !== "all") parts.push(`Kebun: ${kebunFilter}`);
    if (afdelingFilter !== "all") parts.push(`Afdeling: ${afdelingFilter}`);
    if (kategoriFilter !== "all") parts.push(`Kategori: ${kategoriFilter}`);
    if (statusFilter === "tagged") parts.push("Sudah di-tagging");
    if (statusFilter === "untagged") parts.push("Belum di-tagging");
    if (onlyNew) parts.push("Baru");
    if (tanggalFrom) parts.push(`Dari: ${tanggalFrom}`);
    if (tanggalTo) parts.push(`Sampai: ${tanggalTo}`);
    return parts;
  }, [search, kebunFilter, afdelingFilter, kategoriFilter, statusFilter, onlyNew, tanggalFrom, tanggalTo]);

  // Chip filter aktif yang bisa dihapus satu per satu
  const filterChips = useMemo(() => {
    const chips = [];
    if (search.trim())
      chips.push({ key: "search", label: `Cari: "${search.trim()}"`, clear: () => setSearch("") });
    if (kebunFilter !== "all")
      chips.push({ key: "kebun", label: `Kebun: ${kebunFilter}`, clear: () => setKebunFilter("all") });
    if (afdelingFilter !== "all")
      chips.push({ key: "afdeling", label: `Afdeling: ${afdelingFilter}`, clear: () => setAfdelingFilter("all") });
    if (kategoriFilter !== "all")
      chips.push({ key: "kategori", label: `Kategori: ${kategoriFilter}`, clear: () => setKategoriFilter("all") });
    if (statusFilter === "tagged")
      chips.push({ key: "status", label: "Sudah di-tagging", clear: () => setStatusFilter("all") });
    if (statusFilter === "untagged")
      chips.push({ key: "status", label: "Belum di-tagging", clear: () => setStatusFilter("all") });
    if (onlyNew) chips.push({ key: "new", label: "Baru", clear: () => setOnlyNew(false) });
    if (tanggalFrom)
      chips.push({ key: "from", label: `Dari: ${tanggalFrom}`, clear: () => setTanggalFrom("") });
    if (tanggalTo) chips.push({ key: "to", label: `Sampai: ${tanggalTo}`, clear: () => setTanggalTo("") });
    return chips;
  }, [search, kebunFilter, afdelingFilter, kategoriFilter, statusFilter, onlyNew, tanggalFrom, tanggalTo]);

  const resetAllFilters = () => {
    setSearch("");
    setKebunFilter("all");
    setAfdelingFilter("all");
    setKategoriFilter("all");
    setStatusFilter("all");
    setOnlyNew(false);
    setTanggalFrom("");
    setTanggalTo("");
  };

  const previewDocs = useMemo(() => {
    if (previewIds) return records.filter((r) => previewIds.includes(r._id));
    return records;
  }, [records, previewIds]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-nav text-white border-b border-white/10">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#a3e635] to-[#65a30d] flex items-center justify-center shadow-lg shadow-lime-500/20 ring-1 ring-white/20">
              <Leaf className="w-5 h-5 text-[#0F291E]" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base leading-none block tracking-tight">
                DATA EQMS TAGGING
              </span>
              <span className="text-[11px] text-white/55">Manajemen Data &amp; Label QR</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {globalUntagged > 0 && (
              <button
                type="button"
                data-testid="header-untagged-badge"
                onClick={focusUntagged}
                title="Lihat lokasi yang belum di-tagging"
                className="flex items-center gap-1.5 rounded-full bg-amber-400/20 ring-1 ring-amber-300/40 px-2.5 sm:px-3 py-1.5 text-amber-100 hover:bg-amber-400/30 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  {globalUntagged.toLocaleString("id-ID")}
                  <span className="hidden sm:inline"> Belum di-tagging</span>
                </span>
              </button>
            )}
            <div
              className="hidden sm:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-white/10 ring-1 ring-white/10"
              data-testid="current-user"
            >
              <div className="w-7 h-7 rounded-full bg-[#84CC16] text-[#0F291E] flex items-center justify-center text-xs font-bold uppercase">
                {(user?.name || user?.email || "U").charAt(0)}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold">{user?.name}</div>
                <div className="text-[10px] text-white/50">{user?.email}</div>
              </div>
            </div>
            <Button
              data-testid="theme-toggle-button"
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              title={dark ? "Mode terang" : "Mode gelap"}
              aria-label="Ganti tema"
              className="text-white hover:bg-white/10 hover:text-white rounded-full w-9 h-9"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              data-testid="logout-button"
              onClick={logout}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-1.5" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero welcome banner */}
      <section className="relative hero-bg text-white">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={HERO_IMG}
            alt="Perkebunan"
            className="w-full h-full object-cover opacity-30"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D15] via-[#0B1D15]/85 to-[#0B1D15]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1D15] via-transparent to-transparent" />
        </div>
        <div className="relative z-10 max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 sm:pt-10 sm:pb-28">
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="fade-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-medium text-lime-200 mb-4 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16] animate-pulse" />
                Sistem Label QR Perkebunan
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                {greetingText()}, {user?.name?.split(" ")[0] || "Petugas"} 👋
              </h1>
              <p className="text-white/70 mt-2 max-w-xl text-sm sm:text-base">
                Kelola data blok, hasilkan QR unik per lokasi, dan cetak label siap lapangan dalam satu tempat.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-white/70 text-sm bg-white/10 ring-1 ring-white/15 rounded-full px-4 py-2 backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-[#84CC16]" />
              <span className="font-mono">{stats.total_records ?? 0} lokasi terdaftar</span>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10">
        {/* Filter utama — kartu elegan mengambang di bawah hero */}
        <div
          className="bg-card/95 backdrop-blur rounded-2xl border shadow-xl p-3 sm:p-4 -mt-16 sm:-mt-20 mb-6 relative z-10 transition-shadow hover:shadow-2xl"
          data-testid="top-filter-bar"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="top-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Kebun, Afdeling, Blok, Code LSU, Titik Sample..."
                className="pl-9 h-10"
              />
            </div>
            <Select value={kebunFilter} onValueChange={setKebunFilter}>
              <SelectTrigger className="w-full lg:w-48 h-10" data-testid="top-kebun-filter">
                <SelectValue placeholder="Semua Kebun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kebun</SelectItem>
                {kebunOptions.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={afdelingFilter} onValueChange={setAfdelingFilter}>
              <SelectTrigger className="w-full lg:w-44 h-10" data-testid="top-afdeling-filter">
                <SelectValue placeholder="Semua Afdeling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Afdeling</SelectItem>
                {afdelingOptions.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    Afdeling {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
              <SelectTrigger className="w-full lg:w-44 h-10" data-testid="top-kategori-filter">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {kategoriOptions.map((k) => (
                  <SelectItem key={k} value={String(k)}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
          <StatCard icon={MapPin} label="Total Data" value={stats.total_records ?? 0} accent="#1B4D3E" />
          <StatCard icon={Leaf} label="Kebun" value={stats.total_kebun ?? 0} accent="#10B981" />
          <StatCard icon={Layers} label="Blok" value={stats.total_blok ?? 0} accent="#84CC16" />
          <StatCard icon={QrCode} label="Code LSU" value={stats.total_lsu ?? 0} accent="#F59E0B" />
        </div>

        {/* Ringkasan Status Tagging */}
        <div className="mb-8" data-testid="tagging-summary-section">
          <div className="bg-card rounded-2xl border p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0B1D15] dark:text-emerald-50 leading-none">Status Tagging</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {taggingStats.total.toLocaleString("id-ID")} lokasi · klik untuk memfilter
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                data-testid="summary-tagged"
                onClick={() => setStatusFilter(statusFilter === "tagged" ? "all" : "tagged")}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                  statusFilter === "tagged"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 ring-2 ring-emerald-200 dark:ring-emerald-500/30"
                    : "border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10"
                }`}
              >
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Sudah di-tagging</span>
                </div>
                <p className="font-heading text-3xl font-extrabold text-[#0B1D15] dark:text-emerald-50 mt-2 leading-none">
                  {taggingStats.tagged.toLocaleString("id-ID")}
                </p>
              </button>
              <button
                type="button"
                data-testid="summary-untagged"
                onClick={() => setStatusFilter(statusFilter === "untagged" ? "all" : "untagged")}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                  statusFilter === "untagged"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-500/15 ring-2 ring-amber-200 dark:ring-amber-500/30"
                    : "border-amber-100 dark:border-amber-500/20 bg-white dark:bg-amber-500/5 hover:bg-amber-50/50 dark:hover:bg-amber-500/10"
                }`}
              >
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Belum di-tagging</span>
                </div>
                <p className="font-heading text-3xl font-extrabold text-[#0B1D15] dark:text-emerald-50 mt-2 leading-none">
                  {taggingStats.untagged.toLocaleString("id-ID")}
                </p>
              </button>
            </div>
            <div className="mt-4 h-2.5 w-full rounded-full bg-amber-100 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${taggingStats.total ? (taggingStats.tagged / taggingStats.total) * 100 : 0}%`,
                }}
                title={`${taggingStats.tagged} sudah di-tagging`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {taggingStats.total
                ? `${Math.round((taggingStats.tagged / taggingStats.total) * 100)}% lokasi sudah di-tagging`
                : "Belum ada data"}
            </p>
          </div>
        </div>

        {/* Ringkasan Status Tagging per Blok */}
        <div className="mb-8" data-testid="blok-tagging-summary-section">
          <div className="bg-card rounded-2xl border p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-lime-50 dark:bg-lime-500/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#84CC16]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0B1D15] dark:text-emerald-50 leading-none">
                  Status Tagging per Blok
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {blockTaggingStats.total.toLocaleString("id-ID")} blok · sudah = semua titik sample ter-tagging
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div
                data-testid="blok-summary-tagged"
                className="text-left rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5 p-4"
              >
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Blok sudah tertagging</span>
                </div>
                <p className="font-heading text-3xl font-extrabold text-[#0B1D15] dark:text-emerald-50 mt-2 leading-none">
                  {blockTaggingStats.fully.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1.5">Semua titik sample sudah ter-tagging</p>
              </div>
              <div
                data-testid="blok-summary-untagged"
                className="text-left rounded-xl border border-amber-100 dark:border-amber-500/20 bg-white dark:bg-amber-500/5 p-4"
              >
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Blok belum tertagging</span>
                </div>
                <p className="font-heading text-3xl font-extrabold text-[#0B1D15] dark:text-emerald-50 mt-2 leading-none">
                  {blockTaggingStats.belum.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {blockTaggingStats.partial.toLocaleString("id-ID")} sebagian · {blockTaggingStats.none.toLocaleString("id-ID")} kosong
                </p>
              </div>
            </div>
            <div className="mt-4 h-2.5 w-full rounded-full bg-amber-100 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${blockTaggingStats.total ? (blockTaggingStats.fully / blockTaggingStats.total) * 100 : 0}%`,
                }}
                title={`${blockTaggingStats.fully} blok sudah tertagging`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {blockTaggingStats.total
                ? `${Math.round((blockTaggingStats.fully / blockTaggingStats.total) * 100)}% blok sudah tertagging penuh`
                : "Belum ada data blok"}
            </p>
          </div>
        </div>

        {/* Ringkasan per Kebun & Afdeling */}
        <div className="mb-8" data-testid="kebun-breakdown-section">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#1B4D3E] dark:text-emerald-300" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0B1D15] dark:text-emerald-50 leading-none">
                  Ringkasan Tagging per Kebun &amp; Afdeling
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {breakdown.length} kebun · sudah vs belum di-tagging per afdeling
                </p>
              </div>
            </div>
          </div>
          {breakdown.length === 0 ? (
            <div className="bg-card rounded-2xl border p-8 text-center text-sm text-muted-foreground">
              Belum ada data untuk diringkas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {breakdown.map((item) => (
                <KebunBreakdownCard key={item.kebun} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Progres Harian tagging */}
        <div className="bg-card rounded-2xl border p-4 sm:p-5 mb-6" data-testid="progress-chart-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0B1D15] dark:text-emerald-50 leading-none">Progres Harian Tagging</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Perkembangan jumlah lokasi ter-tagging dari waktu ke waktu
                </p>
              </div>
            </div>
            {progress && (
              <div className="text-right hidden sm:block">
                <div className="font-heading text-xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">
                  {progress.tagged_total.toLocaleString("id-ID")}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">total ter-tagging</div>
              </div>
            )}
          </div>
          {progressData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground bg-muted/30 rounded-xl">
              Belum ada data tagging untuk ditampilkan.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={progressData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="tagGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} width={48} />
                <RTooltip
                  formatter={(value, name) => [
                    Number(value).toLocaleString("id-ID"),
                    name === "cumulative" ? "Total ter-tagging" : "Ditambahkan",
                  ]}
                  labelFormatter={(l) => `Tanggal ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#tagGrad)"
                  dot={progressData.length < 40 ? { r: 3, fill: "#059669" } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ringkasan Agronomi: LAI, Panjang Pelepah, SPH, Jumlah Pelepah */}
        <div className="mb-8" data-testid="agro-summary-section">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
            <div>
              <h3 className="font-heading font-bold text-base text-[#0B1D15] dark:text-emerald-50 leading-none">
                Ringkasan Agronomi
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                LAI, Panjang Pelepah, SPH & Jumlah Pelepah — dari {filtered.length} data terfilter
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {AGRO_METRICS.map((m, i) => {
              const s = agroSummary[m.key] || {};
              const accents = ["#10B981", "#84CC16", "#0EA5E9", "#F59E0B"];
              const accent = accents[i % accents.length];
              return (
                <div
                  key={m.key}
                  data-testid={`agro-card-${m.key}`}
                  className="bg-card rounded-2xl border p-4 flex flex-col"
                  style={{ borderTopColor: accent, borderTopWidth: 3 }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span
                      className="font-heading font-extrabold text-2xl leading-none"
                      data-testid={`agro-avg-${m.key}`}
                    >
                      {fmtStat(s.avg, m.digits)}
                    </span>
                    {m.unit && <span className="text-xs text-muted-foreground">{m.unit}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Rata-rata</span>
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase">Min</span>
                      <span className="font-semibold text-[#0B1D15] dark:text-emerald-50">{fmtStat(s.min, m.digits)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase">Maks</span>
                      <span className="font-semibold text-[#0B1D15] dark:text-emerald-50">{fmtStat(s.max, m.digits)}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {s.count || 0} sampel
                    {m.showTotal && s.count ? ` · Total ${fmtStat(s.sum, 0)}` : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {agroByKebun.length > 0 && (
            <div className="bg-card rounded-2xl border overflow-hidden" data-testid="agro-kebun-table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0F291E] text-white text-left">
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Kebun / Afdeling</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-center">Data</th>
                      {AGRO_METRICS.map((m) => (
                        <th key={m.key} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap">
                          {m.label} (rata²)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agroByKebun.map((kb) => (
                      <Fragment key={kb.kebun}>
                        <tr className="border-t bg-lime-50/50 font-semibold" data-testid={`agro-kebun-row-${kb.kebun}`}>
                          <td className="px-4 py-2 text-[#0F291E] dark:text-emerald-200">{kb.kebun}</td>
                          <td className="px-4 py-2 text-center">{kb.count}</td>
                          {AGRO_METRICS.map((m) => (
                            <td key={m.key} className="px-4 py-2 text-right font-mono">
                              {fmtStat(kb.stats[m.key].avg, m.digits)}
                            </td>
                          ))}
                        </tr>
                        {kb.afdelings.map((af) => (
                          <tr key={`${kb.kebun}-${af.afdeling}`} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-1.5 pl-8 text-muted-foreground">Afd {af.afdeling}</td>
                            <td className="px-4 py-1.5 text-center text-muted-foreground">{af.count}</td>
                            {AGRO_METRICS.map((m) => (
                              <td key={m.key} className="px-4 py-1.5 text-right font-mono text-muted-foreground">
                                {fmtStat(af.stats[m.key].avg, m.digits)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>


        {/* Mini map koordinat */}
        <div className="bg-card rounded-2xl border p-4 sm:p-5 mb-6" data-testid="mini-map-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <MapIcon className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0B1D15] dark:text-emerald-50 leading-none">Sebaran Koordinat</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {filtered.length} titik · peta OpenStreetMap · klik marker untuk detail
                </p>
              </div>
            </div>
            <Button
              data-testid="expand-map-button"
              onClick={() => setMapOpen(true)}
              variant="ghost"
              size="sm"
              className="text-[#0F291E] dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              Perbesar
            </Button>
          </div>
          <CoordinateMap records={filtered} height={220} testId="mini-coordinate-chart" newWindowMs={newWindowMs} newLabel={`Baru (${NEW_RANGE_OPTIONS.find((o) => o.value === newRange)?.label || "24 jam"})`} />
        </div>

        {/* Controls */}
        <div className="bg-card rounded-2xl border p-4 sm:p-5 mb-6 lg:sticky lg:top-16 z-20 shadow-sm" data-testid="controls-card">
          {/* Baris 1: filter status + Baru + aksi data */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Segmented status filter */}
            <div className="inline-flex items-center rounded-xl bg-muted p-1 h-11 self-start" data-testid="status-filter">
              <button
                type="button"
                data-testid="status-filter-all"
                onClick={() => setStatusFilter("all")}
                className={`px-4 h-9 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  statusFilter === "all" ? "bg-[#1B4D3E] text-white shadow-sm" : "text-[#1B4D3E] dark:text-emerald-300 hover:bg-white/70 dark:hover:bg-white/10"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                data-testid="status-filter-tagged"
                onClick={() => setStatusFilter("tagged")}
                className={`px-4 h-9 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  statusFilter === "tagged" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 dark:text-emerald-300 hover:bg-white/70 dark:hover:bg-white/10"
                }`}
              >
                Sudah
              </button>
              <button
                type="button"
                data-testid="status-filter-untagged"
                onClick={() => setStatusFilter("untagged")}
                className={`px-4 h-9 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  statusFilter === "untagged" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 dark:text-amber-300 hover:bg-white/70 dark:hover:bg-white/10"
                }`}
              >
                Belum
              </button>
            </div>

            {/* Filter cepat "Baru" + rentang */}
            <div className="flex items-center gap-2" data-testid="new-filter-group">
              <button
                type="button"
                data-testid="filter-new-toggle"
                onClick={() => setOnlyNew((v) => !v)}
                title="Tampilkan hanya data yang baru ditambahkan / di-upload"
                className={`inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap ${
                  onlyNew
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white dark:bg-card text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-500/10"
                }`}
              >
                <Sparkles className="w-4 h-4" /> Baru
                <span
                  className={`ml-0.5 rounded-full px-1.5 text-[11px] font-bold ${
                    onlyNew ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {newCount}
                </span>
              </button>
              <Select value={newRange} onValueChange={setNewRange}>
                <SelectTrigger className="h-11 w-28 rounded-xl bg-white dark:bg-card" data-testid="new-range-select" title="Rentang waktu dianggap 'Baru'">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEW_RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aksi data (admin) */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <Button
                  data-testid="add-record-button"
                  onClick={openAdd}
                  className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white h-11 rounded-xl px-5 shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah
                </Button>
                <Button
                  data-testid="import-button"
                  onClick={() => setImportOpen(true)}
                  variant="outline"
                  className="h-11 rounded-xl border-[#1B4D3E]/30 dark:border-emerald-400/30 text-[#1B4D3E] dark:text-emerald-300 hover:bg-[#1B4D3E]/5 dark:hover:bg-emerald-400/10"
                >
                  <Upload className="w-4 h-4 mr-1.5" /> Impor Excel
                </Button>
              </div>
            )}
          </div>

          {/* Baris 2: Ekspor & Cetak — dikelompokkan agar rapi */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Ekspor & Cetak
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Aksi utama: pratinjau & cetak label */}
              <Button
                data-testid="export-labels-button"
                onClick={openFilteredPreview}
                className="h-10 rounded-xl bg-[#4d7c0f] hover:bg-[#3f6212] text-white shadow-sm"
              >
                <Tags className="w-4 h-4 mr-1.5" /> Pratinjau & Cetak Label ({filtered.length})
              </Button>

              {/* Dropdown Ekspor — semua opsi ekspor digabung agar toolbar bersih */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="export-menu-button"
                    variant="outline"
                    className="h-10 rounded-xl bg-card hover:bg-muted"
                  >
                    <Download className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Ekspor
                    <ChevronDown className="w-4 h-4 ml-1.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Ekspor Data</DropdownMenuLabel>
                  <div className="px-2 pb-1.5">
                    <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                      <button
                        type="button"
                        data-testid="export-scope-all"
                        onClick={() => setExportScope("all")}
                        className={`flex-1 rounded-md px-2 py-1 transition ${exportScope === "all" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        Semua ({records.length})
                      </button>
                      <button
                        type="button"
                        data-testid="export-scope-filter"
                        onClick={() => setExportScope("filter")}
                        className={`flex-1 rounded-md px-2 py-1 transition ${exportScope === "filter" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        Hasil filter ({filtered.length})
                      </button>
                    </div>
                    {exportScope === "filter" && !hasActiveFilter && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Tidak ada filter aktif — sama dengan semua data.
                      </p>
                    )}
                  </div>
                  <DropdownMenuItem
                    data-testid="export-table-button"
                    disabled={exporting === "table" || exporting === "sel-table"}
                    onClick={() => exportPdf("table", exportScope === "filter" ? filteredIds : null)}
                  >
                    <FileText className="w-4 h-4 mr-2 text-orange-600" /> PDF Tabel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="export-excel-button"
                    disabled={exporting === "excel" || exporting === "sel-excel"}
                    onClick={() => exportPdf("excel", exportScope === "filter" ? filteredIds : null)}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Ekspor Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-amber-700 dark:text-amber-400">
                    Belum di-tagging
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    data-testid="export-untagged-button"
                    disabled={exporting === "untagged"}
                    onClick={() => exportPdf("untagged")}
                  >
                    <AlertCircle className="w-4 h-4 mr-2 text-amber-600" /> Daftar Belum (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="export-untagged-excel-button"
                    disabled={exporting === "untagged-excel"}
                    onClick={() => exportPdf("untagged-excel")}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-amber-600" /> Daftar Belum (Excel)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="hidden sm:block h-6 w-px bg-border mx-1" aria-hidden="true" />

              <Button
                data-testid="map-button"
                onClick={() => setMapOpen(true)}
                variant="outline"
                className="h-10 rounded-xl bg-card hover:bg-muted"
              >
                <MapIcon className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" /> Peta Koordinat
              </Button>
            </div>
          </div>

          {/* Baris kedua: filter Tanggal LSU & atur kolom */}
          <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2" data-testid="tanggal-lsu-filter">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Tanggal LSU
              </span>
              <Input
                type="date"
                data-testid="tanggal-from"
                value={tanggalFrom}
                onChange={(e) => setTanggalFrom(e.target.value)}
                className="h-9 w-[150px]"
              />
              <span className="text-muted-foreground text-sm">s/d</span>
              <Input
                type="date"
                data-testid="tanggal-to"
                value={tanggalTo}
                onChange={(e) => setTanggalTo(e.target.value)}
                className="h-9 w-[150px]"
              />
              {(tanggalFrom || tanggalTo || kategoriFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="reset-extra-filters"
                  onClick={() => {
                    setTanggalFrom("");
                    setTanggalTo("");
                    setKategoriFilter("all");
                    setOnlyNew(false);
                  }}
                  className="h-9 text-muted-foreground"
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="relative sm:ml-auto">
              <Button
                variant="outline"
                data-testid="column-toggle-button"
                onClick={() => setColMenuOpen((o) => !o)}
                className="h-9 border-[#1B4D3E]/30 dark:border-emerald-400/30 text-[#1B4D3E] dark:text-emerald-300 hover:bg-[#1B4D3E]/5 dark:hover:bg-emerald-400/10"
              >
                <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Atur Kolom ({visibleCols.size}/{DATA_COLUMNS.length})
              </Button>
              {colMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColMenuOpen(false)} />
                  <div
                    data-testid="column-toggle-menu"
                    className="absolute right-0 mt-2 z-50 w-72 max-h-96 overflow-y-auto rounded-xl border bg-card shadow-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1B4D3E] dark:text-emerald-300">Tampilkan Kolom</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-testid="column-show-all"
                          onClick={() => setVisibleCols(new Set(DATA_COLUMNS.map((c) => c[0])))}
                          className="text-[11px] text-[#1B4D3E] dark:text-emerald-300 hover:underline"
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          data-testid="column-hide-all"
                          onClick={() => setVisibleCols(new Set())}
                          className="text-[11px] text-muted-foreground hover:underline"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {DATA_COLUMNS.map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-muted"
                        >
                          <Checkbox
                            data-testid={`column-toggle-${key}`}
                            checked={visibleCols.has(key)}
                            onCheckedChange={() =>
                              setVisibleCols((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              })
                            }
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chip filter aktif — bisa dihapus satu per satu */}
          {filterChips.length > 0 && (
            <div
              className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2"
              data-testid="active-filter-chips"
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter aktif
              </span>
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  data-testid={`filter-chip-${chip.key}`}
                  title="Klik untuk menghapus filter ini"
                  className="group inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  {chip.label}
                  <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
              <button
                type="button"
                onClick={resetAllFilters}
                data-testid="clear-all-filters"
                className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Hapus semua
              </button>
            </div>
          )}
        </div>
        {selected.size > 0 && (
          <div
            className="bg-[#0F291E] text-white rounded-2xl px-4 sm:px-5 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between fade-in"
            data-testid="selection-bar"
          >
            <span className="text-sm font-medium">
              <span className="font-mono font-bold text-[#84CC16]">{selected.size}</span> lokasi dipilih
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="print-selected-labels-button"
                onClick={() => openPreview([...selected], "selected")}
                size="sm"
                className="bg-[#84CC16] hover:bg-[#65a30d] text-[#0F291E] font-semibold"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Pratinjau Label Terpilih
              </Button>
              <Button
                data-testid="print-selected-table-button"
                onClick={() => exportPdf("table", [...selected])}
                disabled={exporting === "sel-table"}
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <FileText className="w-4 h-4 mr-1.5" /> Cetak Tabel Terpilih
              </Button>
              <Button
                data-testid="export-selected-excel-button"
                onClick={() => exportPdf("excel", [...selected])}
                disabled={exporting === "sel-excel"}
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Download className="w-4 h-4 mr-1.5" /> Ekspor Excel Terpilih
              </Button>
              {isAdmin && (
                <Button
                  data-testid="delete-selected-button"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkDeleting}
                  size="sm"
                  variant="outline"
                  className="border-red-300/60 text-red-100 bg-red-500/20 hover:bg-red-500/30 hover:text-white"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Hapus Terpilih
                </Button>
              )}
              <Button
                data-testid="clear-selection-button"
                onClick={() => setSelected(new Set())}
                size="sm"
                variant="ghost"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4 mr-1.5" /> Batal Pilih
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="records-table">
              <thead>
                <tr className="bg-[#0F291E] text-white text-left">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      data-testid="select-all-checkbox"
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      className="border-white/50 data-[state=checked]:bg-[#84CC16] data-[state=checked]:border-[#84CC16] data-[state=checked]:text-[#0F291E]"
                    />
                  </th>
                  {["QR", "ID Actual", ...visibleColumns.map((c) => c[1]), "Status Tagging", "Aksi"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="text-center py-16 text-muted-foreground">
                      Memuat data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="text-center py-16 text-muted-foreground" data-testid="empty-state">
                      Belum ada data. Tambah manual atau impor dari Excel.
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => (
                    <tr
                      key={r._id}
                      data-testid={`table-row-${r._id}`}
                      className={`border-t transition-colors row-in ${
                        selected.has(r._id)
                          ? "bg-lime-50"
                          : isNew(r, newWindowMs)
                          ? "bg-sky-50/60 hover:bg-sky-50"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="px-4 py-2">
                        <Checkbox
                          data-testid={`select-row-${r._id}`}
                          checked={selected.has(r._id)}
                          onCheckedChange={() => toggleOne(r._id)}
                          className="data-[state=checked]:bg-[#1B4D3E] data-[state=checked]:border-[#1B4D3E]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="bg-white p-1 rounded border w-fit">
                          <QRCodeCanvas
                            id={`qr-canvas-${r._id}`}
                            value={payloadOf(r)}
                            size={44}
                            fgColor="#0F291E"
                            level="M"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold text-[#1B4D3E] dark:text-emerald-300 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{r.id_actual}</span>
                          {isNew(r, newWindowMs) && (
                            <span
                              data-testid={`badge-new-${r._id}`}
                              title="Baru ditambahkan / di-upload"
                              className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            >
                              <Sparkles className="w-3 h-3" /> Baru
                            </span>
                          )}
                        </div>
                      </td>
                      {visibleColumns.map(([key, , kind]) => (
                        <td
                          key={key}
                          className={`px-4 py-2 whitespace-nowrap ${
                            kind === "mono" || kind === "coord" ? "font-mono" : ""
                          } ${kind === "coord" ? "text-muted-foreground" : ""} ${
                            key === "kebun" ? "font-medium" : ""
                          }`}
                        >
                          {cellValue(r, key, kind)}
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        {isTagged(r) ? (
                          <span
                            data-testid={`status-tagged-${r._id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sudah di-tagging
                          </span>
                        ) : (
                          <span
                            data-testid={`status-untagged-${r._id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Belum di-tagging
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#1B4D3E] dark:text-emerald-300 hover:bg-[#1B4D3E]/10 dark:hover:bg-emerald-400/10"
                            data-testid={`download-qr-${r._id}`}
                            onClick={() => downloadSingleQR(r)}
                            title="Unduh QR"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#b45309] hover:bg-amber-50"
                              data-testid={`edit-record-${r._id}`}
                              onClick={() => openEdit(r)}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              data-testid={`delete-record-${r._id}`}
                              onClick={() => setDeleteTarget(r)}
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && (
            <div
              className="px-4 py-3 border-t flex flex-col sm:flex-row items-center gap-3 justify-between"
              data-testid="pagination-bar"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="records-count">
                <span>Baris per halaman</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[72px]" data-testid="page-size-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="ml-2">
                  {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} dari{" "}
                  {filtered.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="prev-page-button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium" data-testid="page-indicator">
                  Halaman {currentPage} / {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="next-page-button"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <RecordDialog open={recordOpen} onOpenChange={setRecordOpen} record={editing} onSaved={load} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />

      {/* Pratinjau & Cetak Label */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col" data-testid="preview-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Tags className="w-5 h-5 text-[#4d7c0f]" /> Pratinjau Label QR
            </DialogTitle>
            <DialogDescription>
              {previewSource === "selected"
                ? `${previewDocs.length} lokasi terpilih (dari centang)`
                : previewSource === "filter"
                ? `${previewDocs.length} lokasi sesuai filter`
                : `Semua data (${previewDocs.length} lokasi)`}{" "}
              · Ukuran {LABEL_SIZES[labelSize].name} ({LABEL_SIZES[labelSize].perPage} label / halaman A4)
            </DialogDescription>
          </DialogHeader>

          {previewSource === "filter" && activeCriteria.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 -mt-1" data-testid="preview-criteria">
              <span className="text-xs text-muted-foreground">Kriteria:</span>
              {activeCriteria.map((c, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#84CC16]/15 text-[#4d7c0f] border border-[#84CC16]/30"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-y py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ukuran label:</span>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger className="h-9 w-44" data-testid="label-size-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_SIZES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.name} — {v.perPage} / halaman
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                data-testid="print-labels-button"
                onClick={() => {
                  if (
                    previewDocs.length > 200 &&
                    !window.confirm(
                      `Anda akan mencetak ${previewDocs.length} label. Cetak langsung dibatasi 200 label pertama agar browser tidak berat.\n\nUntuk mencetak semua ${previewDocs.length} label, gunakan tombol "Unduh PDF".\n\nLanjutkan cetak 200 label pertama?`
                    )
                  )
                    return;
                  window.print();
                }}
                disabled={previewDocs.length === 0}
                variant="outline"
                className="h-9 border-[#84CC16]/50 text-[#4d7c0f] hover:bg-lime-50"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Cetak
              </Button>
              <Button
                data-testid="download-labels-pdf-button"
                onClick={() => exportPdf("labels", previewIds, labelSize)}
                disabled={exporting === "labels" || exporting === "sel-labels" || previewDocs.length === 0}
                className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white h-9"
              >
                <Download className="w-4 h-4 mr-1.5" /> Unduh PDF
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            {previewDocs.length > 200 && (
              <div
                data-testid="print-warning"
                className="mb-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs px-3 py-2 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Data banyak (<b>{previewDocs.length}</b> label). <b>Cetak langsung</b> dibatasi 200 label pertama
                  agar browser tetap ringan — untuk mencetak semuanya gunakan <b>Unduh PDF</b>.
                </span>
              </div>
            )}
            {previewDocs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Tidak ada data untuk dicetak.</p>
            ) : (
              <>
                <div
                  className="grid gap-3 py-2"
                  style={{ gridTemplateColumns: `repeat(${LABEL_SIZES[labelSize].cols}, minmax(0, 1fr))` }}
                  data-testid="preview-grid"
                >
                  {previewDocs.slice(0, 60).map((r) => (
                    <LabelPreview key={r._id} r={r} size={labelSize} />
                  ))}
                </div>
                {previewDocs.length > 60 && (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    Menampilkan 60 dari {previewDocs.length} label. Semua {previewDocs.length} label akan disertakan di PDF.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Area khusus cetak (batasi agar browser tidak berat) */}
      {previewOpen && (
        <div id="print-root" className="print-root">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${LABEL_SIZES[labelSize].cols}, minmax(0, 1fr))`,
              gap: "8px",
            }}
          >
            {previewDocs.slice(0, 200).map((r) => (
              <LabelPreview key={`print-${r._id}`} r={r} size={labelSize} />
            ))}
          </div>
          {previewDocs.length > 200 && (
            <p style={{ marginTop: "8px", fontSize: "11px", textAlign: "center" }}>
              Menampilkan 200 label pertama untuk cetak langsung. Untuk mencetak seluruh {previewDocs.length} label,
              gunakan tombol &quot;Unduh PDF&quot;.
            </p>
          )}
        </div>
      )}

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-3xl" data-testid="map-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#10B981]" /> Peta Sebaran Koordinat
            </DialogTitle>
            <DialogDescription>
              Peta OpenStreetMap menampilkan {filtered.length} lokasi
              {kebunFilter !== "all" ? ` pada ${kebunFilter}` : ""}. Klik marker untuk melihat detail lokasi.
            </DialogDescription>
          </DialogHeader>
          <CoordinateMap records={filtered} height={480} testId="coordinate-chart" newWindowMs={newWindowMs} newLabel={`Baru (${NEW_RANGE_OPTIONS.find((o) => o.value === newRange)?.label || "24 jam"})`} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data {deleteTarget?.kebun} / Blok {deleteTarget?.blok} / {deleteTarget?.code_lsu} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-button">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              data-testid="delete-confirm-button"
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !bulkDeleting && setBulkDeleteOpen(o)}>
        <AlertDialogContent data-testid="bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selected.size} data terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected.size} lokasi beserta QR-nya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="bulk-delete-cancel-button" disabled={bulkDeleting}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doBulkDelete();
              }}
              data-testid="bulk-delete-confirm-button"
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {bulkDeleting ? "Menghapus..." : `Hapus ${selected.size} Data`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
