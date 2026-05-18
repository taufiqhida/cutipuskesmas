# Sistem Cuti UPTD Puskesmas Bugangan

Aplikasi pengajuan dan pemberian cuti pegawai (3 role: Admin, Kepala, Pegawai) untuk UPTD Puskesmas Bugangan — Dinas Kesehatan Kota Semarang.

## Stack
- **Backend**: FastAPI + MongoDB (motor) + JWT + ReportLab + qrcode
- **Frontend**: React 19 + React Router v7 + Tailwind + shadcn/ui

## Menjalankan dengan Docker (Recommended)

### Prasyarat
- Docker & Docker Compose terinstall

### Langkah
```bash
# 1. Salin environment template
cp .env.example .env

# 2. Edit .env — ganti JWT_SECRET dengan string acak 64 karakter
#    (boleh dihasilkan dengan: openssl rand -hex 32)

# 3. Build & jalankan semua service
docker compose up -d --build

# 4. Cek status
docker compose ps
docker compose logs -f backend
```

Buka:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- MongoDB: localhost:27017

### Akun default (di-seed otomatis saat backend start)
| Role    | Email                                      | Password    |
|---------|--------------------------------------------|-------------|
| Admin   | `admin@puskesmas-bugangan.go.id`           | `admin123`  |
| Kepala  | `kepala@puskesmas-bugangan.go.id`          | `kepala123` |
| Pegawai | `tedy@puskesmas-bugangan.go.id`            | `pegawai123`|

> Ubah password default segera setelah login pertama via menu Admin.

### Menghentikan
```bash
docker compose down              # Stop & hapus container
docker compose down -v           # + Hapus volume MongoDB (data hilang)
```

## Development Lokal (tanpa Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
# Pastikan MongoDB lokal jalan (default mongodb://localhost:27017)
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## Struktur
```
/app
├── backend/             # FastAPI service
│   ├── server.py        # entrypoint
│   ├── requirements.txt
│   ├── .env
│   └── Dockerfile
├── frontend/            # React app
│   ├── src/
│   ├── package.json
│   ├── Dockerfile       # multi-stage (build + nginx)
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## Fitur Utama
- 3 role distinct: Admin (kelola akun & saldo cuti), Kepala (approve/tolak), Pegawai (ajukan cuti & cetak PDF)
- 6 jenis cuti sesuai PP No. 11/2017
- Auto-calc lamanya cuti & auto-deduct saldo saat disetujui
- Upload TTD digital → otomatis tertanam di PDF
- PDF formulir dengan **Kop Surat Pemerintah Kota Semarang / Dinas Kesehatan / UPTD Puskesmas Bugangan**
- QR Code verifikasi keaslian dokumen (halaman publik `/verify/:token`)
- Nomor surat manual atau auto-generate

## Production Tips
- Set `JWT_SECRET` ke nilai random kuat (`openssl rand -hex 32`)
- Set `REACT_APP_BACKEND_URL` dan `FRONTEND_URL` ke domain HTTPS Anda
- Gunakan reverse proxy (Caddy/Nginx/Traefik) untuk TLS di depan kedua service
- Backup volume `mongo-data` secara berkala
