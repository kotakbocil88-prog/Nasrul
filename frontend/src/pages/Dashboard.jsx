import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
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
import { useAuth } from "@/context/AuthContext";
import api, { API } from "@/lib/api";

const HERO_IMG =
  "https://images.unsplash.com/photo-1540843650088-e05e97f1855b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className="stat-elegant rounded-2xl border p-5 fade-in"
      style={{ "--stat-accent": accent }}
      data-testid={`stat-${label}`}
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
      <p className="relative font-heading text-[2.1rem] leading-none font-extrabold mt-4 text-[#0B1D15] tracking-tight">
        {value}
      </p>
      <div className="relative mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: "100%", background: accent, opacity: 0.35 }} />
      </div>
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

function fmtNum(v) {  if (v === "" || v === null || v === undefined) return "";
  const n = parseFloat(String(v).replace(",", "."));
  if (Number.isNaN(n)) return "";
  return String(n).replace(".", ",");
}

function payloadOf(r) {
  // Isi QR = Id Actual (gabungan Kebun+Afdeling+Blok+CodeLSU+Koord_X+Koord_Y, tanpa pemisah)
  return (
    r.id_actual ||
    `${r.kebun ?? ""}${r.afdeling ?? ""}${r.blok ?? ""}${r.code_lsu ?? ""}${fmtNum(r.koord_x)}${fmtNum(r.koord_y)}`
  );
}

const LABEL_SIZES = {
  small: { name: "Kecil", perPage: 24, cols: 4, qr: 68, f1: "text-[11px]", f2: "text-[10px]" },
  medium: { name: "Sedang", perPage: 15, cols: 3, qr: 96, f1: "text-sm", f2: "text-xs" },
  large: { name: "Besar", perPage: 6, cols: 2, qr: 150, f1: "text-lg", f2: "text-base" },
};

function LabelPreview({ r, size }) {
  const cfg = LABEL_SIZES[size] || LABEL_SIZES.medium;
  const line1 = [r.kebun, r.blok, r.code_lsu].filter(Boolean).join(" ");
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
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kebunFilter, setKebunFilter] = useState("all");
  const [recordOpen, setRecordOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [mapOpen, setMapOpen] = useState(false);
  const [labelSize, setLabelSize] = useState("medium");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIds, setPreviewIds] = useState(null); // null = semua data, array = terpilih

  const load = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([api.get("/records"), api.get("/records/stats")]);
      setRecords(r.data);
      setStats(s.data);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter((r) => {
      const matchQ =
        !q ||
        [r.kebun, r.afdeling, r.blok, r.code_lsu].some((v) => (v || "").toLowerCase().includes(q));
      const matchK = kebunFilter === "all" || r.kebun === kebunFilter;
      return matchQ && matchK;
    });
  }, [records, search, kebunFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, kebunFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r._id));
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

  const openPreview = (ids = null) => {
    setPreviewIds(ids);
    setPreviewOpen(true);
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
        {/* Stats (overlapping the hero banner) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-16 sm:-mt-20 mb-8 relative z-10">
          <StatCard icon={MapPin} label="Total Data" value={stats.total_records ?? 0} accent="#1B4D3E" />
          <StatCard icon={Leaf} label="Kebun" value={stats.total_kebun ?? 0} accent="#10B981" />
          <StatCard icon={Layers} label="Blok" value={stats.total_blok ?? 0} accent="#84CC16" />
          <StatCard icon={QrCode} label="Code LSU" value={stats.total_lsu ?? 0} accent="#F59E0B" />
        </div>

        {/* Mini map koordinat */}
        <div className="bg-card rounded-2xl border p-4 sm:p-5 mb-6" data-testid="mini-map-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <MapIcon className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0B1D15] leading-none">Sebaran Koordinat</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {filtered.length} titik · X (horizontal) vs Y (vertikal)
                </p>
              </div>
            </div>
            <Button
              data-testid="expand-map-button"
              onClick={() => setMapOpen(true)}
              variant="ghost"
              size="sm"
              className="text-[#0F291E] hover:bg-emerald-50"
            >
              Perbesar
            </Button>
          </div>
          <div className="h-52 w-full" data-testid="mini-coordinate-chart">
            {filtered.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Belum ada titik koordinat untuk ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Koord X"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Koord Y"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    width={44}
                  />
                  <ZAxis range={[40, 40]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0F291E] text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg">
                          <div className="font-semibold text-[#84CC16]">
                            {d.kebun} · Blok {d.blok}
                          </div>
                          <div className="font-mono text-white/70">
                            {d.x} , {d.y}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={filtered.map((r) => ({ ...r, x: r.koord_x, y: r.koord_y }))} fill="#10B981" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-2xl border p-4 sm:p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Kebun, Afdeling, Blok, Code LSU..."
                className="pl-9 h-10"
              />
            </div>
            <Select value={kebunFilter} onValueChange={setKebunFilter}>
              <SelectTrigger className="w-full lg:w-48 h-10" data-testid="kebun-filter">
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
            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="add-record-button"
                onClick={openAdd}
                className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white h-10"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Tambah
              </Button>
              <Button
                data-testid="import-button"
                onClick={() => setImportOpen(true)}
                variant="outline"
                className="h-10 border-[#1B4D3E]/30 text-[#1B4D3E] hover:bg-[#1B4D3E]/5"
              >
                <Upload className="w-4 h-4 mr-1.5" /> Impor Excel
              </Button>
              <Button
                data-testid="export-labels-button"
                onClick={() => openPreview(null)}
                variant="outline"
                className="h-10 border-[#84CC16]/50 text-[#4d7c0f] hover:bg-lime-50"
              >
                <Tags className="w-4 h-4 mr-1.5" /> Pratinjau & Cetak Label
              </Button>
              <Button
                data-testid="export-table-button"
                onClick={() => exportPdf("table")}
                disabled={exporting === "table"}
                variant="outline"
                className="h-10 border-[#F59E0B]/50 text-[#b45309] hover:bg-amber-50"
              >
                <FileText className="w-4 h-4 mr-1.5" /> PDF Tabel
              </Button>
              <Button
                data-testid="export-excel-button"
                onClick={() => exportPdf("excel")}
                disabled={exporting === "excel"}
                variant="outline"
                className="h-10 border-[#059669]/50 text-[#047857] hover:bg-emerald-50"
              >
                <Download className="w-4 h-4 mr-1.5" /> Ekspor Excel
              </Button>
              <Button
                data-testid="map-button"
                onClick={() => setMapOpen(true)}
                variant="outline"
                className="h-10 border-[#10B981]/50 text-[#0F291E] hover:bg-emerald-50"
              >
                <MapIcon className="w-4 h-4 mr-1.5" /> Peta Koordinat
              </Button>
            </div>
          </div>
        </div>

        {/* Selection action bar */}
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
                onClick={() => openPreview([...selected])}
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
                  {["QR", "Id Actual", "Kebun", "Afdeling", "Blok", "Code LSU", "Koord X", "Koord Y", "Aksi"].map(
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
                    <td colSpan={10} className="text-center py-16 text-muted-foreground">
                      Memuat data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-muted-foreground" data-testid="empty-state">
                      Belum ada data. Tambah manual atau impor dari Excel.
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => (
                    <tr
                      key={r._id}
                      data-testid={`table-row-${r._id}`}
                      className={`border-t transition-colors row-in ${
                        selected.has(r._id) ? "bg-lime-50" : "hover:bg-muted/40"
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
                      <td className="px-4 py-2 font-mono font-semibold text-[#1B4D3E]">{r.id_actual}</td>
                      <td className="px-4 py-2 font-medium">{r.kebun}</td>
                      <td className="px-4 py-2">{r.afdeling}</td>
                      <td className="px-4 py-2">{r.blok}</td>
                      <td className="px-4 py-2 font-mono">{r.code_lsu}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{r.koord_x}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{r.koord_y}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#1B4D3E] hover:bg-[#1B4D3E]/10"
                            data-testid={`download-qr-${r._id}`}
                            onClick={() => downloadSingleQR(r)}
                            title="Unduh QR"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
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
              {previewIds ? `${previewDocs.length} lokasi terpilih` : `Semua data (${previewDocs.length} lokasi)`} ·
              Ukuran {LABEL_SIZES[labelSize].name} ({LABEL_SIZES[labelSize].perPage} label / halaman A4)
            </DialogDescription>
          </DialogHeader>

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
                onClick={() => window.print()}
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

      {/* Area khusus cetak (semua label) */}
      {previewOpen && (
        <div id="print-root" className="print-root">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${LABEL_SIZES[labelSize].cols}, minmax(0, 1fr))`,
              gap: "8px",
            }}
          >
            {previewDocs.map((r) => (
              <LabelPreview key={`print-${r._id}`} r={r} size={labelSize} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-3xl" data-testid="map-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#10B981]" /> Peta Sebaran Koordinat
            </DialogTitle>
            <DialogDescription>
              Visualisasi titik Koord X (horizontal) vs Koord Y (vertikal) untuk {filtered.length} lokasi
              {kebunFilter !== "all" ? ` pada ${kebunFilter}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[420px] w-full" data-testid="coordinate-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Koord X"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#4B5563" }}
                  label={{ value: "Koord X", position: "insideBottom", offset: -8, fontSize: 12, fill: "#0F291E" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Koord Y"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#4B5563" }}
                  label={{ value: "Koord Y", angle: -90, position: "insideLeft", fontSize: 12, fill: "#0F291E" }}
                />
                <ZAxis range={[80, 80]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0F291E] text-white rounded-lg px-3 py-2 text-xs shadow-lg">
                        <div className="font-semibold text-[#84CC16]">
                          {d.kebun} / Blok {d.blok}
                        </div>
                        <div className="font-mono mt-0.5">{d.code_lsu}</div>
                        <div className="font-mono text-white/70 mt-0.5">
                          X: {d.x} · Y: {d.y}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={filtered.map((r) => ({ ...r, x: r.koord_x, y: r.koord_y }))} fill="#10B981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground -mt-4">Tidak ada data untuk ditampilkan.</p>
          )}
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
    </div>
  );
}
