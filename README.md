# DATA EQMS TAGGING — Panduan Menjalankan di Localhost

Aplikasi manajemen data & label QR perkebunan (Kebun, Afdeling, Blok, Code LSU, koordinat, Id Actual).
Stack: **FastAPI** (backend) · **React (CRACO)** (frontend) · **MongoDB** (database).

Fitur utama: login admin, CRUD data, import Excel, export PDF label & tabel, peta sebaran koordinat, status tagging (Sudah/Belum), ringkasan tagging per kebun & afdeling, grafik progres harian, ekspor daftar belum di-tagging (PDF/Excel), filter kebun/afdeling/status.

---

## 1. Prasyarat

Pastikan sudah terpasang di komputer Anda:

| Software | Versi disarankan | Cek versi |
|----------|------------------|-----------|
| Python   | 3.11 atau lebih  | `python3 --version` |
| Node.js  | 18 atau lebih    | `node -v` |
| Yarn     | 1.22+            | `yarn -v` |
| MongoDB  | 6.0+ (Community) | `mongod --version` |

> Install Yarn (bila belum ada): `npm install -g yarn`
> Install MongoDB Community Server: https://www.mongodb.com/try/download/community

---

## 2. Struktur Proyek

```
app/
├── backend/          # FastAPI + MongoDB (port 8001)
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/         # React (CRACO) (port 3000)
│   ├── src/
│   ├── package.json
│   └── .env
└── README.md
```

---

## 3. Jalankan MongoDB

Pastikan MongoDB berjalan di `mongodb://localhost:27017`.

- **macOS (Homebrew):** `brew services start mongodb-community`
- **Linux (systemd):** `sudo systemctl start mongod`
- **Manual / Windows:** `mongod --dbpath /path/ke/folder/data`

Cek koneksi: `mongosh` (harus masuk ke shell MongoDB).

---

## 4. Setup & Jalankan Backend (port 8001)

Buka terminal pertama:

```bash
cd backend

# (opsional tapi disarankan) buat virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# install dependency
pip install -r requirements.txt
```

### File `backend/.env`
Pastikan berisi (nilai default sudah cocok untuk localhost):

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="eqms_tagging"
CORS_ORIGINS="*"
JWT_SECRET="ganti-dengan-string-acak-panjang"
ADMIN_EMAIL="admin@eqms.id"
ADMIN_PASSWORD="EQMS1234"
```

> `DB_NAME` bebas Anda tentukan. `JWT_SECRET` wajib diisi (string acak apa saja).
> Akun admin otomatis dibuat saat backend pertama kali dijalankan.

### Menjalankan backend

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend siap di: **http://localhost:8001**
Cek dokumentasi API otomatis: **http://localhost:8001/docs**

> Semua endpoint API memakai prefix `/api`, contoh: `http://localhost:8001/api/records`.

---

## 5. Setup & Jalankan Frontend (port 3000)

Buka terminal kedua:

```bash
cd frontend
yarn install
```

### File `frontend/.env`
Untuk menjalankan di localhost, arahkan ke backend lokal:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
```

> Frontend selalu memanggil backend lewat `REACT_APP_BACKEND_URL` + prefix `/api`.

### Menjalankan frontend

```bash
yarn start
```

Aplikasi terbuka otomatis di: **http://localhost:3000**

---

## 6. Login

Gunakan akun admin default:

- **Email:** `admin@eqms.id`
- **Password:** `EQMS1234`

(Bisa juga klik tombol "Gunakan akun demo" di halaman login.)

---

## 7. Import Data Excel (opsional)

Melalui tombol **Impor Excel** di dashboard. Format kolom yang dikenali:
`Kebun`, `Afdeling`, `Blok`, `Code_LSU`, `Koord_X`, `Koord_Y`.

> Aturan status: jika `Koord_X` & `Koord_Y` terisi dan bukan 0 → **Sudah di-tagging**; jika kosong atau 0 → **Belum di-tagging**.

---

## 8. Ringkasan Perintah Cepat

```bash
# Terminal 1 - MongoDB (jika belum jalan sebagai service)
mongod --dbpath ./data

# Terminal 2 - Backend
cd backend && source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 - Frontend
cd frontend && yarn start
```

Buka **http://localhost:3000** dan login.

---

## 9. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Frontend tidak konek ke API | Pastikan `REACT_APP_BACKEND_URL=http://localhost:8001` lalu restart `yarn start` (env dibaca saat start). |
| `KeyError: 'JWT_SECRET'` di backend | Isi `JWT_SECRET` di `backend/.env`. |
| Gagal konek MongoDB | Pastikan MongoDB berjalan & `MONGO_URL` benar. |
| Login gagal | Cek `ADMIN_EMAIL`/`ADMIN_PASSWORD` di `.env`; email otomatis diubah huruf kecil. |
| Port sudah dipakai | Ganti port uvicorn (`--port 8002`) & sesuaikan `REACT_APP_BACKEND_URL`. |

---

Selamat menggunakan DATA EQMS TAGGING! 🌴
