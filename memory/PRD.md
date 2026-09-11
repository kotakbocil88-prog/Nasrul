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
- P1: Pagination / row-limit switcher for large datasets
- P1: Coordinate map visualizer (Koord X vs Y grid)
- P2: Brute-force lockout, Mongo aggregation for stats, lifespan handlers
- P2: Bulk delete, import validation preview table
