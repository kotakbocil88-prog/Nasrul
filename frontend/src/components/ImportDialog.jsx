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

export function ImportDialog({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const pick = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      toast.error("Hanya file .xlsx atau .xls yang didukung");
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/records/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`${data.inserted} data berhasil diimpor`);
      setFile(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="import-dialog">
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
          <Download className="w-4 h-4" /> Unduh template Excel (Kebun, Afdeling, Blok, Code_LSU, Koord_X, Koord_Y)
        </button>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="import-cancel-button">
            Batal
          </Button>
          <Button
            onClick={upload}
            disabled={!file || uploading}
            data-testid="import-upload-button"
            className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white"
          >
            {uploading ? "Mengimpor..." : "Impor Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
