import { useEffect, useMemo, useState } from "react";
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
  Hash,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const exportPdf = async (mode) => {
    setExporting(mode);
    try {
      const res = await api.get(`/records/export/${mode}`, { responseType: "blob" });
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
              <span className="font-heading font-extrabold text-base leading-none block">Kebun LSU</span>
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
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="records-table">
              <thead>
                <tr className="bg-[#0F291E] text-white text-left">
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
                    <td colSpan={9} className="text-center py-16 text-muted-foreground">
                      Memuat data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-muted-foreground" data-testid="empty-state">
                      Belum ada data. Tambah manual atau impor dari Excel.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r._id}
                      data-testid={`table-row-${r._id}`}
                      className="border-t hover:bg-muted/40 transition-colors row-in"
                    >
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
            <div className="px-4 py-3 border-t text-xs text-muted-foreground" data-testid="records-count">
              Menampilkan {filtered.length} dari {records.length} data
            </div>
          )}
        </div>
      </main>

      <RecordDialog open={recordOpen} onOpenChange={setRecordOpen} record={editing} onSaved={load} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />

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
