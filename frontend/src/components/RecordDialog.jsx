import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

const empty = { kebun: "", afdeling: "", blok: "", code_lsu: "", koord_x: "", koord_y: "" };

export function RecordDialog({ open, onOpenChange, record, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record)
      setForm({
        kebun: record.kebun || "",
        afdeling: record.afdeling || "",
        blok: record.blok || "",
        code_lsu: record.code_lsu || "",
        koord_x: record.koord_x ?? "",
        koord_y: record.koord_y ?? "",
      });
    else setForm(empty);
  }, [record, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const payload = `Kebun: ${form.kebun} | Afdeling: ${form.afdeling} | Blok: ${form.blok} | LSU: ${form.code_lsu} | X: ${form.koord_x} | Y: ${form.koord_y}`;

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        kebun: form.kebun,
        afdeling: form.afdeling,
        blok: form.blok,
        code_lsu: form.code_lsu,
        koord_x: parseFloat(form.koord_x) || 0,
        koord_y: parseFloat(form.koord_y) || 0,
      };
      if (record) await api.put(`/records/${record._id}`, body);
      else await api.post("/records", body);
      toast.success(record ? "Data diperbarui" : "Data ditambahkan");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["kebun", "Kebun", "text"],
    ["afdeling", "Afdeling", "text"],
    ["blok", "Blok", "text"],
    ["code_lsu", "Code LSU", "text"],
    ["koord_x", "Koordinat X", "number"],
    ["koord_y", "Koordinat Y", "number"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="record-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {record ? "Edit Data Kebun" : "Tambah Data Kebun"}
          </DialogTitle>
          <DialogDescription>
            Isi data lokasi perkebunan. QR code diperbarui otomatis dari nilai yang Anda masukkan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([k, label, type]) => (
              <div key={k} className={k === "code_lsu" ? "col-span-2" : ""}>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </Label>
                <Input
                  data-testid={`record-input-${k}`}
                  type={type}
                  step={type === "number" ? "any" : undefined}
                  value={form[k]}
                  onChange={set(k)}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Pratinjau QR
            </span>
            <div className="bg-white p-3 rounded-lg border">
              <QRCodeCanvas value={payload || " "} size={150} fgColor="#0F291E" level="M" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center break-all font-mono leading-relaxed">
              {payload}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="record-cancel-button">
            Batal
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            data-testid="record-save-button"
            className="bg-[#1B4D3E] hover:bg-[#0F291E] text-white"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
