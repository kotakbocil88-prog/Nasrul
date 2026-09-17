// Helper bersama untuk data record di mobile.

// Semua kolom yang diterima RecordInput backend (PUT mengganti seluruh dokumen,
// jadi kita harus mengirim semua kolom agar tidak ter-reset ke 0/"").
export const RECORD_INPUT_KEYS = [
  "kebun", "afdeling", "blok", "code_lsu", "luas_ha", "jumlah_pokok",
  "titik_sample", "koord_x", "koord_y", "kategori", "keterangan",
  "jumlah_pelepah", "panjang_pelepah", "lebar_petiol", "tebal_petiol",
  "panjang_helai_1", "panjang_helai_2", "lebar_helai_1", "lebar_helai_2",
  "jumlah_anak_daun", "tanggal_lsu", "la", "lai",
];

// Field pengukuran daun yang diisi di lapangan (untuk form mobile).
export const MEASUREMENT_FIELDS = [
  { key: "jumlah_pelepah", label: "Jumlah Pelepah", unit: "", int: true },
  { key: "panjang_pelepah", label: "Panjang Pelepah", unit: "cm" },
  { key: "lebar_petiol", label: "Lebar Petiol", unit: "cm" },
  { key: "tebal_petiol", label: "Tebal Petiol", unit: "cm" },
  { key: "panjang_helai_1", label: "Panjang Helai Daun 1", unit: "cm" },
  { key: "panjang_helai_2", label: "Panjang Helai Daun 2", unit: "cm" },
  { key: "lebar_helai_1", label: "Lebar Helai Daun 1", unit: "cm" },
  { key: "lebar_helai_2", label: "Lebar Helai Daun 2", unit: "cm" },
  { key: "jumlah_anak_daun", label: "Jumlah Anak Daun (helai)", unit: "", int: true },
];

export function buildPayload(record, overrides = {}) {
  const src = { ...record, ...overrides };
  const out = {};
  RECORD_INPUT_KEYS.forEach((k) => {
    let v = src[k];
    if (v === undefined || v === null) v = 0;
    out[k] = v;
  });
  // pastikan field teks berupa string
  ["kebun", "afdeling", "blok", "code_lsu", "titik_sample", "kategori", "keterangan", "tanggal_lsu"].forEach((k) => {
    out[k] = src[k] == null ? "" : String(src[k]);
  });
  // field numerik
  ["luas_ha", "jumlah_pokok", "koord_x", "koord_y", "jumlah_pelepah", "panjang_pelepah",
   "lebar_petiol", "tebal_petiol", "panjang_helai_1", "panjang_helai_2", "lebar_helai_1",
   "lebar_helai_2", "jumlah_anak_daun", "la", "lai"].forEach((k) => {
    const n = Number(out[k]);
    out[k] = Number.isFinite(n) ? n : 0;
  });
  return out;
}

export function coordFilled(v) {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0;
}

export function isTagged(r) {
  return coordFilled(r?.koord_x) && coordFilled(r?.koord_y);
}

// Format angka gaya Indonesia (koma desimal), maksimal 6 desimal.
export function fmtNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  let s = n.toFixed(6);
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}

export function recordTitle(r) {
  return [r?.kebun, r?.afdeling, r?.blok, r?.code_lsu].filter(Boolean).join(" ") || "(tanpa nama)";
}

// Jarak haversine (meter) antara dua titik lat/lng.
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function fmtDistance(m) {
  if (m == null || !Number.isFinite(m)) return "-";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}
