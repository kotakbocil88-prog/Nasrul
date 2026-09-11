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

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-card rounded-2xl border p-5 fade-in" data-testid={`stat-${label}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + "22" }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
      <p className="font-heading text-3xl font-extrabold mt-3 text-[#0B1D15]">{value}</p>
    </div>
  );
}

function payloadOf(r) {
  return `Kebun: ${r.kebun} | Afdeling: ${r.afdeling} | Blok: ${r.blok} | LSU: ${r.code_lsu} | X: ${r.koord_x} | Y: ${r.koord_y}`;
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

  const exportPdf = async (mode, ids = null) => {
    const key = ids ? `sel-${mode}` : mode;
    setExporting(key);
    try {
      const res = ids
        ? await api.post(`/records/export/${mode}`, { ids }, { responseType: "blob" })
        : await api.get(`/records/export/${mode}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = mode === "labels" ? "label_qr_kebun.pdf" : "laporan_tabel_kebun.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF berhasil dibuat");
    } catch (e) {
      toast.error("Gagal mengekspor PDF");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 leaf-bg text-white border-b border-[#274E3E]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#84CC16] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#0F291E]" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base leading-none block">DATA EPCS TAGGING</span>
              <span className="text-[11px] text-white/60">Manajemen Data & Label QR</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-white/70" data-testid="current-user">
              {user?.name} · {user?.email}
            </span>
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

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={MapPin} label="Total Data" value={stats.total_records ?? 0} accent="#1B4D3E" />
          <StatCard icon={Leaf} label="Kebun" value={stats.total_kebun ?? 0} accent="#10B981" />
          <StatCard icon={Layers} label="Blok" value={stats.total_blok ?? 0} accent="#84CC16" />
          <StatCard icon={QrCode} label="Code LSU" value={stats.total_lsu ?? 0} accent="#F59E0B" />
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
                onClick={() => exportPdf("labels")}
                disabled={exporting === "labels"}
                variant="outline"
                className="h-10 border-[#84CC16]/50 text-[#4d7c0f] hover:bg-lime-50"
              >
                <Tags className="w-4 h-4 mr-1.5" /> PDF Label
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
                onClick={() => exportPdf("labels", [...selected])}
                disabled={exporting === "sel-labels"}
                size="sm"
                className="bg-[#84CC16] hover:bg-[#65a30d] text-[#0F291E] font-semibold"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Cetak Label Terpilih
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
