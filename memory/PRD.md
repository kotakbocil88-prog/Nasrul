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

- DONE (2025-07 v11): (1) Progres Harian Tagging: field tagged_at ditrack di create/update/import (update set/unset saat status berubah); endpoint GET /api/records/tagging-progress (agregasi harian kumulatif, fallback created_at bila tagged_at kosong); chart recharts AreaChart di dashboard (progressData). (2) Ekspor Daftar Excel: GET /api/records/export/untagged-excel + build_untagged_excel (kolom No/Kebun/Afdeling/Blok/Code_LSU/Koord kosong/Keterangan), tombol "Daftar Belum (Excel)". (3) Filter Afdeling: Select "Semua Afdeling" (opsi bergantung kebunFilter), afdelingFilter di baseFiltered, auto-reset bila kebun berubah. Verified: progress endpoint (tagged 3269/untagged 2), untagged-excel headers OK, frontend screenshot (chart 1 titik 3.269, filter afdeling & tombol Excel tampil, ringkasan per-afd X/total). Catatan: semua data existing tagged_at=created_at (impor 1 hari) sehingga chart 1 titik; akan bertambah seiring tagging baru.

- DONE (2025-07 v12): Ganti kredensial admin: admin@kebun.id/admin123 -> admin@eqms.id/EQMS1234. Update backend/.env (ADMIN_EMAIL/ADMIN_PASSWORD), hapus user admin lama di DB agar startup seed ulang. Login page (fillDemo, placeholder, teks demo) diperbarui. Verified: login baru 200, login lama 401.

- DONE (2025-07 v10): Role-based access. Akun VIEWER read-only terpisah dari admin — ras2026@eqms.id / RAS1234 (role=viewer), di-seed saat startup via env VIEWER_EMAIL/VIEWER_PASSWORD. Backend: dependency require_admin() melindungi semua endpoint tulis (create/update/delete/delete_all/delete-bulk/import preview+confirm) -> 403 untuk viewer. Endpoint baca & cetak/export (records GET, export labels/table/excel/untagged) tetap terbuka utk viewer. Frontend: tombol Tambah, Impor Excel, Hapus Terpilih, Edit & Hapus per-baris disembunyikan untuk non-admin (isAdmin=user.role==='admin'). Login: tombol/tulisan "akun demo" dihapus; background slideshow foto sawit tetap. Backend RBAC tested 10/10 pass.

- DONE (2025-07 v11): Cetak QR berdasarkan kriteria. Tombol utama "Pratinjau & Cetak Label" -> "Cetak Label (N)" kini MENGIKUTI filter aktif dashboard (Kebun, Afdeling, Kategori, Status tagging, rentang Tanggal LSU, pencarian) via openFilteredPreview(): jika semua data tampil pakai jalur GET all, jika terfilter kirim ids terfilter (POST). Dialog pratinjau menampilkan chip ringkasan kriteria aktif (data-testid=preview-criteria) + label sumber (semua/filter/terpilih via previewSource). Cetak label terpilih (checkbox) tetap ada. Frontend-only, lint clean.

- DONE (2025-07 v12): Tanda "Baru". Badge biru "Baru" (ikon Sparkles) di sebelah Id Actual pada tabel untuk record yang ditambahkan manual ATAU di-upload via Excel dalam 24 jam terakhir (helper isNew() berbasis created_at; backend serialize sudah kirim created_at). Baris baru juga diberi latar biru muda (bg-sky-50). NEW_WINDOW_MS=24 jam (mudah diubah). Frontend-only, lint clean.

- DONE (2025-07 v13): 4 fitur + 1 bugfix (semua verified frontend testing 5/5 PASS).
  * BUGFIX z-index peta: kontrol/legenda Leaflet menembus di atas dialog Pratinjau & Cetak. Fix: `.leaflet-container { isolation: isolate; z-index: 0; }` di index.css -> peta jadi stacking context sendiri, modal (z-50) selalu di atas.
  * Filter "Baru" (data-testid=filter-new-toggle): toggle tampilkan hanya data baru; menampilkan jumlah (newCount).
  * Rentang "Baru" (data-testid=new-range-select): 24 jam / 3 hari / 7 hari; isNew(r, windowMs) & newWindowMs reaktif; badge, highlight baris, filter, & peta ikut berubah.
  * Badge di Peta: titik baru biru (#38BDF8 fill / #0369A1 border, radius+1) + popup "✨ Baru" + item legenda "Baru (...)" (hanya muncul jika ada titik baru).
  * Cetak per-kriteria diperbaiki: openFilteredPreview pakai anyFilterActive (bukan lagi bandingkan count), chip kriteria (preview-criteria) tampil walau semua record 1 kebun; activeCriteria kini termasuk "Baru".

- DONE (2025-07 v13): Toolbar Dashboard ditata ulang agar rapi & menarik. (1) Status filter jadi segmented pill (bg-muted, pill aktif berwarna) rounded-xl; (2) "Baru" + rentang tinggi diseragamkan h-11 rounded-xl; (3) Aksi data (Tambah/Impor Excel) didorong ke kanan (lg:ml-auto); (4) Tombol ekspor/cetak dipindah ke seksi khusus berlabel "Ekspor & Cetak" (border-t), chrome tombol diseragamkan (putih + hover muted, ikon diberi tint warna), dikelompokkan dgn pemisah vertikal: Cetak Label/PDF Tabel/Ekspor Excel | Daftar Belum/Daftar Belum (Excel) | Peta Koordinat. Semua data-testid & fungsi dipertahankan. Lint clean, verified via screenshot login admin.

- DONE (2025-07 v14): 4 peningkatan UX Dashboard. (1) MODE GELAP elegan: variabel .dark ditambah di index.css (palet hijau-charcoal), .dark override utk .stat-elegant & .glass-nav; init tema di index.js (baca localStorage sebelum paint, anti-flash); tombol toggle Sun/Moon di header (persist localStorage 'theme', transisi halus .theme-anim); banyak teks hijau hardcoded (#1B4D3E/#0F291E) diberi varian dark:text-emerald-* agar terbaca. (2) MENU EKSPOR RINGKAS: tombol ekspor digabung ke satu DropdownMenu "Ekspor" (PDF Tabel, Ekspor Excel | Daftar Belum PDF, Daftar Belum Excel); "Pratinjau & Cetak Label" tetap tombol utama, "Peta Koordinat" terpisah — toolbar jauh lebih bersih di layar kecil. (3) CHIP FILTER AKTIF: baris chip di kartu kontrol (filterChips memo) menampilkan tiap filter aktif (Cari/Kebun/Afdeling/Kategori/Status/Baru/Tanggal) dengan tombol X per-chip + "Hapus semua" (resetAllFilters). (4) TOOLBAR MELEKAT: kartu kontrol lg:sticky lg:top-16 z-20 shadow — pin di bawah header saat menggulir tabel panjang (verified: getBoundingClientRect top=64, position=sticky). Semua data-testid lama dipertahankan; export testids dipindah ke DropdownMenuItem. Lint clean, verified via screenshot (dark & light, dropdown terbuka, sticky, chips).
