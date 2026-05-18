# Sistem Cuti UPTD Puskesmas Bugangan — PRD

## Problem Statement (verbatim)
Aplikasi pengajuan cuti pegawai untuk UPTD Puskesmas Bugangan (Pemerintah Kota Semarang, Dinas Kesehatan) dengan 3 role: admin, kepala, pegawai. Berdasarkan template formulir resmi "Formulir Permintaan dan Pemberian Cuti" yang dikirim user (Cuti Tedy.docx).

## User Personas
- **Admin**: kelola akun seluruh staf, atur peran, saldo cuti & upload tanda tangan.
- **Kepala UPTD Puskesmas**: setujui / perubahan / tangguhkan / tolak pengajuan cuti pegawai dengan catatan.
- **Pegawai**: ajukan cuti, lihat status dan sisa saldo, cetak formulir cuti yang telah disahkan.

## Core Requirements (static)
- Form mengikuti template resmi (Kop Pemerintah Kota Semarang / Dinas Kesehatan / UPTD Puskesmas Bugangan).
- 6 jenis cuti: Tahunan, Bersama, Sakit, Melahirkan, Karena Alasan Penting, di Luar Tanggungan Negara.
- Saldo cuti per jenis, auto-deduct saat disetujui.
- Auto-calc lamanya cuti dari tanggal mulai & selesai.
- 4 keputusan kepala: Disetujui / Perubahan / Ditangguhkan / Tidak Disetujui + pesan.
- Cetak PDF formulir lengkap dengan TTD pegawai + TTD kepala + QR code verifikasi.
- Halaman publik `/verify/:token` untuk validasi keaslian dokumen via QR.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT Bearer auth, bcrypt password hashing. ReportLab untuk PDF, qrcode untuk QR.
- **Frontend**: React 19 + React Router v7 + shadcn/ui + Tailwind. Sonner toasts. lucide-react icons.
- **Routing**: `/login`, `/admin`, `/admin/pengajuan`, `/kepala`, `/kepala/riwayat`, `/pegawai`, `/pegawai/ajukan`, `/verify/:token`.

## Tasks Done (2026-02)
- [x] JWT auth + admin seeding + demo kepala & pegawai
- [x] User CRUD (admin only) with role, balances, signature upload (base64)
- [x] Leave request creation with balance check
- [x] Kepala decide endpoint with auto-deduct balance on disetujui
- [x] PDF export endpoint (ReportLab + QR code) replicating government form layout
- [x] Public QR verification endpoint
- [x] Login page (split-screen with clinic background, dark green overlay)
- [x] Admin dashboard with user dialog (Data / Saldo / TTD tabs)
- [x] Pegawai dashboard (stats, balances, history) + Ajukan Cuti form
- [x] Kepala approval queue (card grid) + decision modal
- [x] Public Verify page

## Backlog (P1/P2)
- P1: Audit log riwayat aksi admin & kepala
- P1: Export rekap cuti per pegawai per tahun (Excel)
- P1: Notifikasi (email/WA) saat pengajuan diputuskan
- P2: Auto-renewal saldo cuti tahunan setiap awal tahun
- P2: Multi-Puskesmas (skala dinas kesehatan kota)
- P2: Tampilan kalender cuti tim/unit
- P2: Lupa password (forgot/reset) flow
