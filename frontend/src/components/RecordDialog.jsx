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

const empty = {
  kebun: "", afdeling: "", code_lsu: "", blok: "", titik_sample: "",
  luas_ha: "", jumlah_pokok: "", koord_x: "", koord_y: "",
  kategori: "", keterangan: "",
  jumlah_pelepah: "", panjang_pelepah: "", lebar_petiol: "", tebal_petiol: "",
  panjang_helai_1: "", panjang_helai_2: "", lebar_helai_1: "", lebar_helai_2: "",
  jumlah_anak_daun: "", tanggal_lsu: "", la: "", lai: "",
};

const NUM_KEYS = [
  "luas_ha", "jumlah_pokok", "koord_x", "koord_y", "jumlah_pelepah", "panjang_pelepah",
  "lebar_petiol", "tebal_petiol", "panjang_helai_1", "panjang_helai_2",
  "lebar_helai_1", "lebar_helai_2", "jumlah_anak_daun", "la", "lai",
];

const REQUIRED_KEYS = [
  "kebun", "afdeling", "code_lsu", "blok", "titik_sample",
  "luas_ha", "jumlah_pokok", "koord_x", "koord_y",
];

const GROUPS = [
  {
    title: "Identitas Lokasi",
    cols: 2,
    fields: [
      ["kebun", "Kebun", "text"],
      ["afdeling", "Afdeling", "text"],
      ["code_lsu", "Kode LSU", "text"],
      ["blok", "Block", "text"],
      ["titik_sample", "Titik Sample", "text"],
    ],
  },
  {
    title: "Luas, Pokok & Koordinat",
    cols: 2,
    fields: [
      ["luas_ha", "Luas (Ha)", "number"],
      ["jumlah_pokok", "Jumlah Pokok", "number"],
      ["koord_x", "Koordinat (X)", "number"],
      ["koord_y", "Koordinat (Y)", "number"],
    ],
  },
  {
    title: "Klasifikasi",
    cols: 1,
    fields: [
      ["kategori", "Kategori", "text"],
      ["keterangan", "Keterangan", "text"],
    ],
  },
  {
    title: "Pengukuran Daun",
    cols: 2,
    fields: [
      ["jumlah_pelepah", "Jumlah pelepah", "number"],
      ["panjang_pelepah", "Panjang pelepah (cm)", "number"],
      ["lebar_petiol", "Lebar petiol (cm)", "number"],
      ["tebal_petiol", "Tebal petiol (cm)", "number"],
      ["panjang_helai_1", "Panjang helai anak daun 1 (cm)", "number"],
      ["panjang_helai_2", "Panjang helai anak daun 2 (cm)", "number"],
      ["lebar_helai_1", "Lebar helai anak daun 1 (cm)", "number"],
      ["lebar_helai_2", "Lebar helai anak daun 2 (cm)", "number"],
      ["jumlah_anak_daun", "Jumlah anak daun (helai)", "number"],
    ],
  },
  {
    title: "LSU",
    cols: 2,
    fields: [
      ["tanggal_lsu", "Tanggal LSU", "date"],
    ],
  },
];

export function RecordDialog({ open, onOpenChange, record, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      const next = { ...empty };
      Object.keys(empty).forEach((k) => {
        next[k] = record[k] ?? "";
      });
      setForm(next);
    } else setForm(empty);
  }, [record, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const fmtNum = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = parseFloat(String(v).replace(",", "."));
    if (Number.isNaN(n)) return "";
    if (Number.isInteger(n)) return String(n);
    // Maksimal 6 angka di belakang koma (nol berlebih dibuang)
    const s = n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return s.replace(".", ",");
  };
  const idActual = `${form.kebun}${form.afdeling}${form.blok}${form.titik_sample}${fmtNum(form.koord_x)}${fmtNum(form.koord_y)}`;
  // Isi QR = sama persis dengan Id Actual
  const payload = idActual;

  // SPH dihitung otomatis = Jumlah Pokok / Luas (Ha)
  const sph = (() => {
    const luas = parseFloat(String(form.luas_ha).replace(",", "."));
    const pokok = parseFloat(String(form.jumlah_pokok).replace(",", "."));
    if (!luas || Number.isNaN(luas) || Number.isNaN(pokok)) return "";
    return Math.round((pokok / luas) * 100) / 100;
  })();

  // LA (Luas Daun per pokok, m2) & LAI dihitung otomatis (metode Hardon 1969)
  const numOf = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  };
  const la = (() => {
    const lens = [numOf(form.panjang_helai_1), numOf(form.panjang_helai_2)].filter((x) => x > 0);
    const wids = [numOf(form.lebar_helai_1), numOf(form.lebar_helai_2)].filter((x) => x > 0);
    const n = numOf(form.jumlah_anak_daun);
    const fronds = numOf(form.jumlah_pelepah);
    if (!lens.length || !wids.length || n <= 0) return "";
    const ml = lens.reduce((a, b) => a + b, 0) / lens.length;
    const mw = wids.reduce((a, b) => a + b, 0) / wids.length;
    const laFrond = (0.55 * n * ml * mw) / 10000;
    const val = fronds > 0 ? laFrond * fronds : laFrond;
    return Math.round(val * 10000) / 10000;
  })();
  const lai = (() => {
    if (la === "" || sph === "" || !sph) return "";
    return Math.round(((la * sph) / 10000) * 10000) / 10000;
  })();

  const save = async () => {
    const missing = REQUIRED_KEYS.filter((k) => String(form[k] ?? "").trim() === "");
    if (missing.length) {
      toast.error("Lengkapi field wajib bertanda *");
      return;
    }
    setSaving(true);
    try {
      const body = {};
      Object.keys(empty).forEach((k) => {
        if (NUM_KEYS.includes(k)) {
          body[k] = parseFloat(String(form[k]).replace(",", ".")) || 0;
        } else {
          body[k] = form[k] ?? "";
        }
      });
      // LA & LAI otomatis (server akan menghitung ulang juga)
      body.la = la === "" ? 0 : la;
      body.lai = lai === "" ? 0 : lai;
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

  const isReq = (k) => REQUIRED_KEYS.includes(k);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto" data-testid="record-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {record ? "Edit Data LSU" : "Tambah Data LSU"}
          </DialogTitle>
          <DialogDescription>
            Isi data lokasi & pengukuran LSU. SPH, ID Actual, dan QR dihitung otomatis. Field bertanda <span className="text-red-500">*</span> wajib diisi.
          </DialogDescription>
        </DialogHeader>

        {/* Pratinjau QR + ID Actual */}
        <div className="flex items-center gap-4 rounded-xl bg-muted p-4">
          <div className="bg-white p-2.5 rounded-lg border shrink-0">
            <QRCodeCanvas value={payload || " "} size={96} fgColor="#0F291E" level="M" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Id Actual / Isi QR (otomatis dari data)
            </span>
            <p className="text-[12px] font-mono font-semibold text-[#1B4D3E] break-all mt-1" data-testid="record-id-actual-preview">
              {idActual || "-"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SPH (otomatis)</span>
              <span className="text-sm font-bold text-[#0F291E]" data-testid="record-sph-preview">
                {sph === "" ? "-" : sph}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B4D3E] mb-2.5">
                {group.title}
              </h4>
              <div className={`grid gap-3 ${group.cols === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                {group.fields.map(([k, label, type]) => (
                  <div key={k} className={group.cols === 1 ? "" : ""}>
                    <Label className="text-xs font-semibold text-muted-foreground">
                      {label}
                      {isReq(k) && <span className="text-red-500"> *</span>}
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
                {group.title === "Luas, Pokok & Koordinat" && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">
                      SPH (otomatis)
                    </Label>
                    <Input
                      data-testid="record-input-sph"
                      value={sph === "" ? "" : sph}
                      readOnly
                      disabled
                      className="mt-1.5 bg-muted/60"
                    />
                  </div>
                )}
                {group.title === "LSU" && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">
                        LA — Luas Daun (m², otomatis)
                      </Label>
                      <Input
                        data-testid="record-input-la"
                        value={la === "" ? "" : la}
                        readOnly
                        disabled
                        className="mt-1.5 bg-muted/60"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">
                        LAI (otomatis)
                      </Label>
                      <Input
                        data-testid="record-input-lai"
                        value={lai === "" ? "" : lai}
                        readOnly
                        disabled
                        className="mt-1.5 bg-muted/60"
                      />
                    </div>
                    <p className="col-span-2 sm:col-span-3 text-[11px] text-muted-foreground leading-relaxed">
                      LA & LAI dihitung otomatis dari pengukuran daun (metode Hardon 1969):
                      LA = 0,55 × jumlah anak daun × rata-rata panjang helai × rata-rata lebar helai × jumlah pelepah ÷ 10.000 (m²/pokok);
                      LAI = LA × SPH ÷ 10.000.
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
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
