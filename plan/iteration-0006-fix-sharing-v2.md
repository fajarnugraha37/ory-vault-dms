# Pelan: Lelaran 0006 - Unified Architecture & Security Hardening (Final)

## 1. Ringkasan Perubahan
Lelaran ini berevolusi dari sekadar perbaikan bug sharing menjadi refaktor arsitektur besar-besaran untuk skalabilitas dan keamanan (Zero Trust).

## 2. Fitur yang Diimplementasikan

### A. Arsitektur Unified Nodes (Refaktor Besar)
- [x] **Penyatuan Tabel**: Menggabungkan tabel `folders` dan `documents` menjadi satu tabel `app.nodes`.
- [x] **Metadata Extension**: Data spesifik file dipindah ke `app.file_metadata`.
- [x] **Recursive Cleanup**: Penghapusan folder sekarang otomatis menghapus seluruh isi (file/subfolder) di DB dan MinIO secara rekursif.
- [x] **Soft Delete**: Implementasi flag `is_deleted` untuk semua resource.

### B. Security & Zero Trust (Hardening)
- [x] **FAIL-FAST Envs**: Seluruh ENV memiliki default "SALAH" untuk mendeteksi miskonfigurasi sejak startup.
- [x] **Keto Unification**: Menggunakan namespace tunggal `nodes` di Keto untuk permission terpusat.
- [x] **Anti-IDOR**: Seluruh endpoint (Download, Rename, Move, Delete) wajib lolos cek Keto. Akses publik wajib menggunakan token `sig_...` (UUID dilarang).
- [x] **Audit Trail**: Menambahkan field `created_by`, `updated_by`, dan `deleted_by` pada setiap node.

### C. Skalabilitas & UI/UX
- [x] **Server-Side Sorting**: Pengurutan (Nama, Tipe, Tanggal, Ukuran) dilakukan di level Postgres.
- [x] **Strict Pagination**: Implementasi limit (max 100) dan offset untuk mencegah overload memory.
- [x] **UI Improvements**: 
  - Tombol **Copy ID** (Fingerprint icon) untuk memudahkan input UUID.
  - Tombol **ROOT** pada dialog Move.
  - Kolom **Created** dan **Modified** pada tabel utama.

## 3. Evaluasi Kelengkapan
- [x] API Admin (Identity management) dipulihkan setelah refaktor.
- [x] Legacy Aliasing (/api/folders, /api/documents) diaktifkan untuk kompatibilitas.
- [x] Build Backend (Go) & Frontend (Next.js) diverifikasi sukses.
- [x] Migrasi SQL disediakan (`contrib/db/migration_unified_nodes.sql`).

## 4. Status: SELESAI
Sistem sekarang stabil, scalable, dan siap untuk Iterasi 0007 (Delegation & OAuth2).
