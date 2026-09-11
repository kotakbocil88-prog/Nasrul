# QC Estate Audit — PRD

## Original Problem Statement
Aplikasi mobile Quality Control perkebunan sawit (Bahasa Indonesia) dengan 4 form:
FORM QC LAND CLEARING, LAND PREPARATION, TANAM, dan KESEHATAN TANAMAN BARU.
Setiap form: field header (Kebun, Afdeling, Estate, Blok, Luas Ha, Tanggal Chipping,
Tanggal Pemeriksaan, Pemeriksa), sampel berulang (Jalur Sampel 3..143, Titik Sampel),
item pemeriksaan dengan pilihan (Standar/Tidak Standart, Sudah/Belum, Ada/Tidak, kondisi
daun/pokok/hama/penyakit), foto per item, tanda tangan (pemeriksa + mengetahui), dan
ekspor ke WhatsApp, Excel, PDF.

## User Choices
- Penyimpanan online (server + Emergent Object Storage untuk foto & tanda tangan)
- Login sederhana email + password (JWT)
- Ekspor: PDF, Excel, Share WhatsApp
- Tanda tangan ganda (pemeriksa + mengetahui)
- Bahasa Indonesia, tema netral profesional (brutalist, hijau perkebunan)

## Architecture
- Backend: FastAPI + MongoDB (motor), JWT auth (bcrypt), Emergent Object Storage.
  Export PDF (reportlab) & Excel (openpyxl). All routes under /api.
- Frontend: Expo Router (stack), react-query, react-native-keyboard-controller,
  expo-image-picker, react-native-signature-canvas, expo-file-system + expo-sharing.
  Fonts: Space Grotesk (display) + JetBrains Mono (body). Theme tokens in src/theme.ts.

## Personas
- Petugas QC lapangan: mengisi form inspeksi di kebun via HP, sering offline-ish/outdoor.
- Asisten/mandor: menandatangani (mengetahui) dan mengekspor laporan.

## Core Requirements (static)
- Email/password auth; data milik user; soft-delete only.
- 4 form types dengan konfigurasi field & item (src/config/forms.ts).
- Sampel berulang, foto per item, 2 tanda tangan.
- Ekspor PDF/Excel + share (WhatsApp) native.

## Implemented (2026-06)
- [x] Auth register/login/me (JWT, bcrypt)
- [x] Dashboard: 4 form cards + riwayat inspeksi + pull-to-refresh + logout
- [x] Alur form 3 langkah: Header -> Sampel -> Tanda Tangan
- [x] Segmented controls, picker Jalur/Titik, date fields, foto per item (kamera+galeri, izin)
- [x] Dua tanda tangan digital (native), disimpan ke Object Storage
- [x] Simpan inspeksi + detail screen read-only dengan foto & tanda tangan
- [x] Ekspor PDF & Excel + Share (WhatsApp) via native share sheet
- [x] Tested: backend 18/18 pytest pass; frontend full flow verified (web)

## Backlog / Next
- P1: Edit / lanjutkan draft inspeksi yang belum selesai
- P1: Filter riwayat per jenis form & pencarian per Blok/Kebun
- P2: Ringkasan skor kualitas (% Standar) per inspeksi & rekap per estate
- P2: Mode offline + sinkronisasi
- P2: Foto tertanam di dalam PDF (saat ini tanda tangan tertanam; foto di detail app)

## Notes
- Tanda tangan & kamera hanya berfungsi di aplikasi mobile (Expo Go / build), bukan web preview.
