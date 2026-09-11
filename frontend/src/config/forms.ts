// Shared config for the 4 Quality Control forms. Drives the dynamic form UI.
export const JALUR_OPTIONS = [3, 13, 23, 33, 43, 53, 63, 73, 83, 93, 103, 113, 123, 133, 143];

export type HeaderFieldType = "text" | "number" | "date";
export type HeaderField = { key: string; label: string; type: HeaderFieldType };

export type Item = {
  key: string;
  label: string;
  options: string[];
  hasDate?: boolean; // show a "Tanggal Aplikasi" date field under the choice
  hasNote?: boolean; // show a "Keterangan" text field under the choice
};

export type FormDef = {
  key: string;
  title: string;
  short: string;
  headerFields: HeaderField[];
  titikOptions: number[];
  items: Item[];
};

const STD = ["Standar", "Tidak Standart"];
const SUDAH = ["Sudah", "Belum"];
const ADA = ["Ada", "Tidak"];
const HEALTH = ["Tidak Sehat", "Kurang Sehat", "Sehat/Normal"];

const baseHeader = (withChipping: boolean): HeaderField[] => [
  { key: "kebun", label: "Kebun", type: "text" },
  { key: "afdeling", label: "Afdeling", type: "text" },
  { key: "estate", label: "Estate", type: "text" },
  { key: "blok", label: "Blok", type: "text" },
  { key: "luas", label: "Luas (Ha)", type: "number" },
  ...(withChipping ? [{ key: "tanggal_chipping", label: "Tanggal Chipping", type: "date" as HeaderFieldType }] : []),
  { key: "tanggal_pemeriksaan", label: "Tanggal Pemeriksaan", type: "date" },
  { key: "pemeriksa", label: "Pemeriksa", type: "text" },
];

export const FORMS: FormDef[] = [
  {
    key: "land_clearing",
    title: "QUALITY CONTROL LAND CLEARING",
    short: "LAND CLEARING",
    headerFields: baseHeader(true),
    titikOptions: [1, 2, 3, 4, 5],
    items: [
      { key: "ketebalan_chippingan", label: "Ketebalan Chippingan", options: STD },
      { key: "lebar_path", label: "Lebar Path Hamparan Chipping", options: STD },
      { key: "tebal_hamparan", label: "Tebal Hamparan", options: STD },
      { key: "aplikasi_hexaconazole", label: "Aplikasi Hexaconazole", options: SUDAH },
    ],
  },
  {
    key: "land_preparation",
    title: "QUALITY CONTROL LAND PREPARATION",
    short: "LAND PREPARATION",
    headerFields: baseHeader(true),
    titikOptions: [1, 2, 3, 4, 5],
    items: [
      { key: "tinggi_chambering", label: "Tinggi Chambering", options: STD },
      { key: "lebar_chambering", label: "Lebar Chambering", options: STD },
      { key: "bentuk_chambering", label: "Bentuk Chambering", options: STD },
      { key: "aplikasi_hexaconazole", label: "Aplikasi Hexaconazole", options: SUDAH },
      { key: "compacting_chamber", label: "Compacting Chamber", options: SUDAH },
      { key: "kedalaman_field_drain", label: "Kedalaman Field Drain", options: STD },
      { key: "lebar_field_drain", label: "Lebar Field Drain", options: STD },
      { key: "tmat", label: "Tinggi Muka Air Tanah (TMAT)", options: STD },
      { key: "aplikasi_metharizium", label: "Aplikasi Metharizium", options: SUDAH, hasDate: true },
      { key: "aplikasi_kaptan", label: "Aplikasi Kaptan", options: SUDAH, hasDate: true },
    ],
  },
  {
    key: "tanam",
    title: "QUALITY CONTROL TANAM",
    short: "TANAM",
    headerFields: baseHeader(false),
    titikOptions: [5, 10, 15, 20, 25],
    items: [
      { key: "jarak_antar_baris", label: "Jarak Antar Baris", options: STD },
      { key: "jarak_antar_pokok", label: "Jarak Antar Pokok Dalam Baris", options: STD },
      { key: "lubang_tanam", label: "Lubang Tanam", options: STD },
      { key: "bekas_polybag", label: "Bekas Polybag Bibit", options: ADA },
      { key: "bekas_plastik_pupuk", label: "Bekas Plastik Pupuk", options: ADA },
      { key: "racun_tikus", label: "Racun Tikus", options: ADA },
      {
        key: "penanaman",
        label: "Penanaman",
        options: ["Standar", "Terlalu dalam", "Terlalu dangkal", "Tergenang", "Miring/Doyong"],
      },
      { key: "tinggi_bibit", label: "Tinggi Bibit", options: STD },
      { key: "warna_daun_bibit", label: "Warna Daun Bibit", options: HEALTH },
      { key: "tanaman_kacangan", label: "Tanaman Kacangan", options: SUDAH },
    ],
  },
  {
    key: "kesehatan",
    title: "QUALITY KESEHATAN TANAMAN BARU",
    short: "KESEHATAN TANAMAN",
    headerFields: baseHeader(false),
    titikOptions: [5, 10, 15, 20, 25],
    items: [
      { key: "warna_daun_1", label: "Warna Daun 1", options: HEALTH },
      { key: "warna_daun_9", label: "Warna Daun 9", options: HEALTH },
      { key: "warna_daun_17", label: "Warna Daun 17", options: HEALTH },
      { key: "kondisi_piringan", label: "Kondisi Piringan", options: ["Normal", "Semak", "Tergenang"] },
      { key: "kondisi_pokok", label: "Kondisi Pokok", options: ["Normal", "Doyong"] },
      {
        key: "hama",
        label: "Hama",
        options: ["Tidak Ada", "Oryctes", "Ulat Api", "Rayap", "Tikus"],
        hasNote: true,
      },
      { key: "penyakit", label: "Penyakit", options: ["Tidak Ada", "Ganoderma", "Busuk Pangkal"] },
    ],
  },
];

export function getForm(key: string): FormDef | undefined {
  return FORMS.find((f) => f.key === key);
}
