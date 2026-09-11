# PRD — Sistem Informasi & Label QR Perkebunan (Kebun LSU)

## Original Problem Statement
Kelola data: Kebun (teks), Afdeling (teks), Blok (teks), Code LSU (teks), Koord_X (angka), Koord_Y (angka), Id Actual (angka). QR (gambar) berisi nilai kebun, afdeling, blok, code lsu, Koord_X, Koord_Y. Bisa diimpor dari Excel dan diekspor ke PDF.

## User Choices
- QR: semua field, format teks tergabung ("Kebun: .. | Afdeling: .. | Blok: .. | LSU: .. | X: .. | Y: ..")
- Input data: import Excel (.xlsx) massal + form manual
- Export PDF: dua mode — kartu/label QR per lokasi & tabel data lengkap + QR per baris dengan keterangan 2 baris
- Autentikasi: login sederhana (JWT)
- Id Actual: otomatis (auto-increment)

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT httpOnly cookie auth. qrcode + reportlab for PDF, openpyxl for Excel.
- Frontend: React + Tailwind + shadcn/ui, qrcode.react for QR preview. Green AgTech theme.

## Personas
- Admin/petugas kebun yang mengelola data blok & mencetak label QR untuk lapangan.

## Implemented (2026-06)
- JWT login (admin@kebun.id/admin123 seeded), protected routes
- Records CRUD with auto Id Actual (counters collection)
- Dashboard: stats cards, search, kebun filter, responsive data table with mini QR preview
- Manual add/edit form with live QR preview
- Excel template download + bulk import
- Single QR PNG download per row
- PDF export: label cards (3x5 grid) & full table report (QR + 2-line caption)
- Verified: testing agent 100% backend (14/14) & frontend

## Backlog (P1/P2)

## Updates (2025-07)
- Rebrand: nama aplikasi "Kebun LSU" -> "DATA EPCS TAGGING" (Dashboard header + Login desktop/mobile)
- Id Actual bukan lagi auto-increment. Sekarang = gabungan Kebun + Blok + Code LSU + Koord_X + Koord_Y (tanpa Afdeling, tanpa pemisah). Koordinat pakai koma desimal. Contoh: KSL+OA11+TS01+110,400113+0,654521 = "KSLOA11TS01110,4001130,654521". Dihitung dinamis di backend serialize()/_fetch_docs(); RecordDialog menampilkan preview Id Actual live. Backend tested 9/9 pass.
- DECIDED (2025-07 v2): Afdeling IKUT dalam Id Actual (setelah Kebun) -> Kebun+Afdeling+Blok+CodeLSU+X+Y. QR content = Id Actual persis. Ekspor Excel (.xlsx) ditambah (kolom Id Actual + semua kolom), all/selected. Pagination tabel sudah ada. Backend tested 11/11 pass.
- Rebrand (2025-07 v3): "DATA EPCS TAGGING" -> "DATA EQMS TAGGING" (Login desktop/mobile + Dashboard header).
- Label PDF (build_labels_pdf) diubah agar sesuai contoh baru: kotak berbingkai solid + garis pembatas, baris1 tebal = "{Kebun} {Blok} {Code_LSU}" (spasi), baris2 tebal = "{Koord_X} {Koord_Y}" koma desimal. Tanpa Afdeling/ID di label. Verified via standalone gen (valid %PDF).
- DONE (2025-07 v6): Peta OpenStreetMap (Leaflet) — komponen CoordinateMap (CircleMarker + popup, fitBounds, preferCanvas untuk ribuan titik). Mini map di dashboard + dialog peta besar. Konvensi X=lng, Y=lat. Cetak langsung (window.print) via #print-root (cap 200 label) + @media print. Latar Login diganti foto pohon sawit (Unsplash 1618344322843). Frontend compiled clean; screenshot tool tak simpan sesi login sehingga verifikasi dashboard terautentikasi lewat testing agent.
- DONE (2025-07 v4): Ekspor label PDF punya pilihan ukuran (small=24/hal, medium=15/hal, large=6/hal) via param size; dialog Pratinjau Cetak (LabelPreview) render QR client-side sebelum unduh; Peta Koordinat (ScatterChart) sudah ada sebelumnya. Backend tested 8/8 pass.
- DONE (2025-07 v5): Redesign bagian atas Dashboard elegan — glass sticky nav, hero banner (hero-bg gradient + grid pattern) dengan sapaan waktu, kartu statistik overlap (stat-elegant: accent bar, glow, hover lift). CSS utilities di index.css. Frontend compiled successfully.
- P1: Coordinate map visualizer (Koord X vs Y grid)
- P2: Brute-force lockout, Mongo aggregation for stats, lifespan handlers
- P2: Bulk delete, import validation preview table

- DONE (2025-07 v7): Peta satelit (LayersControl OSM + Esri World Imagery), login slideshow 3 foto sawit cross-fade + dots, multiple delete (POST /api/records/delete-bulk + tombol Hapus Terpilih + konfirmasi). Ringkasan dashboard per Kebun & Afdeling (agregasi client-side, KebunBreakdownCard, reaktif filter). Label PDF baris1 kini sertakan Afdeling: "Kebun Afdeling Blok Code_LSU" (contoh "KSL 1 PB36 TS09"), baris2 koordinat koma desimal. delete-bulk 8/8 & label regresi 6/6 pass; frontend semua verified pass.

- DONE (2025-07 v8): Kolom "Keterangan" (status tagging) di tabel Dashboard. Badge hijau "Sudah di-tagging" jika Koord X & Koord Y terisi, badge kuning "Belum di-tagging" jika kosong. Helper isTagged/hasCoord (frontend-only, computed). colSpan tabel 10->11. Verified via screenshot login admin.

- DONE (2025-07 v9): 4 enhancement status tagging. (1) Filter cepat Semua/Sudah/Belum (statusFilter) di kontrol; (2) Kartu ringkasan "Status Tagging" (jumlah Sudah vs Belum + progress bar %, klik untuk filter); (3) Peta: marker hijau=sudah, kuning=belum + legenda; (4) PDF tabel tambah baris "Keterangan: Sudah/Belum di-tagging". ATURAN: koordinat bernilai 0 (atau kosong) dianggap BELUM di-tagging — diterapkan konsisten di isTagged(front), coordFilled(map), _coord_filled(back). Verified: PDF via pdfminer (0,0->Belum, valid->Sudah), frontend via screenshot (kartu 50%, badge, legenda peta).

- DONE (2025-07 v10): (1) Ekspor Excel tambah kolom "Keterangan" (Sudah/Belum di-tagging) selaras PDF; (2) Lencana header "N Belum di-tagging" (globalUntagged dari semua records) - klik -> setStatusFilter untagged + scroll ke tabel; (3) Endpoint GET /api/records/export/untagged + build_untagged_pdf() = checklist PDF lokasi belum di-tagging (kolom No/Kebun/Afdeling/Blok/Code LSU + Koord X/Y kosong utk diisi lapangan), tombol "Daftar Belum" di kontrol; (4) Ringkasan Tagging per Kebun & Afdeling: KebunBreakdownCard kini tampil sudah/belum + bar hijau/kuning tingkat kebun & per afdeling (X/total), breakdown pakai baseFiltered. Verified: Excel headers+nilai via openpyxl, untagged PDF via pdfminer (hanya UT01 belum, TG01 tagged excluded), frontend via screenshot (lencana '3 Belum', kartu '1 sudah/1 belum 50%', Afd 9 '1/2').
