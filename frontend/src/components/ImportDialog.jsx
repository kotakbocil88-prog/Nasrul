import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import api, { API, formatApiErrorDetail } from "@/lib/api";

const PREVIEW_COLS = [
  ["kebun", "Kebun"],
  ["afdeling", "Afdeling"],
  ["code_lsu", "Kode LSU"],
  ["blok", "Block"],
  ["luas_ha", "Luas (Ha)"],
  ["jumlah_pokok", "Jumlah Pokok"],
  ["titik_sample", "Titik Sample"],
  ["koord_x", "Koord X"],
  ["koord_y", "Koord Y"],
  ["kategori", "Kategori"],
  ["keterangan", "Keterangan"],
  ["jumlah_pelepah", "Jml pelepah"],
  ["panjang_pelepah", "Pjg pelepah"],
  ["lebar_petiol", "Lbr petiol"],
  ["tebal_petiol", "Tbl petiol"],
  ["panjang_helai_1", "Pjg helai 1"],
  ["panjang_helai_2", "Pjg helai 2"],
  ["lebar_helai_1", "Lbr helai 1"],
  ["lebar_helai_2", "Lbr helai 2"],
  ["jumlah_anak_daun", "Jml anak daun"],
  ["tanggal_lsu", "Tanggal LSU"],
  ["la", "LA"],
  ["lai", "LAI"],
];

export function ImportDialog({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState(null);
  const inputRef = useRef();

  const reset = () => {
    setFile(null);
    setRows(null);
  };

  const pick = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      toast.error("Hanya file .xlsx atau .xls yang didukung");
      return;
    }
    setFile(f);
    setRows(null);
  };

  const doPreview = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/records/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data.count) {
        toast.error("Tidak ada baris data yang terbaca dari file");
      }
      setRows(data.rows);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const doConfirm = async () => {
    if (!rows?.length) return;
    setUploading(true);
    try {
      const { data } = await api.post("/records/import/confirm", { rows });
      toast.success(`${data.inserted} data berhasil diimpor`);
      reset();
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/records/template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_kebun.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mengunduh template");
    }
  };

  const handleOpenChange = (o) => {
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Impor Data dari Excel</DialogTitle>
          <DialogDescription>
            Unggah file .xlsx atau .xls sesuai template untuk menambahkan banyak data sekaligus.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          data-testid="import-template-button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-[#1B4D3E] hover:text-[#0F291E] font-medium transition-colors"
        >
          <Download className="w-4 h-4" /> Unduh template Excel (Kebun, Afdeling, Kode LSU, Block, Luas, Jumlah Pokok, Titik Sample, Koordinat, Kategori, Keterangan, pengukuran daun, Tanggal LSU, LA, LAI)
        </button>

        {rows === null ? (
        <div
          data-testid="import-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-[#84CC16] bg-lime-50" : "border-border bg-muted/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            data-testid="import-file-input"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-[#1B4D3E]" />
              <span className="font-medium text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">Klik untuk mengganti file</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="w-10 h-10 text-muted-foreground" />
              <span className="font-medium text-sm">Seret & letakkan file di sini</span>
              <span className="text-xs text-muted-foreground">atau klik untuk memilih (.xlsx / .xls)</span>
            </div>
          )}
        </div>
        ) : (
          <div data-testid="import-preview" className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2 bg-muted flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0F291E]">
                Pratinjau {rows.length} baris
              </span>
              <button
                type="button"
                data-testid="import-back-button"
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-[#1B4D3E] transition-colors"
              >
                Ganti file
              </button>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0F291E] text-white">
                  <tr className="text-left">
                    {PREVIEW_COLS.map(([, label]) => (
                      <th key={label} className="px-3 py-2 font-semibold whitespace-nowrap">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-muted/40">
                      {PREVIEW_COLS.map(([key]) => (
                        <td key={key} className="px-3 py-1.5 whitespace-nowrap">
                          {r[key] === null || r[key] === undefined ? "" : String(r[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} data-testid="import-cancel-button">
            Batal
          </Button>
          {rows === null ? (
            <Button
              onClick={doPreview}
              disabled={!file || uploading}
              data-testid="import-preview-button"
              className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white"
            >
              {uploading ? "Membaca..." : "Pratinjau"}
            </Button>
          ) : (
            <Button
              onClick={doConfirm}
              disabled={!rows.length || uploading}
              data-testid="import-upload-button"
              className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white"
            >
              {uploading ? "Mengimpor..." : `Impor ${rows.length} Data`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
