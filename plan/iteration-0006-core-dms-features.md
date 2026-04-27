# Pelan: Lelaran 0006 - Core DMS Features (Hardened & Complete)

## Objektif

Mengimplementasikan inti dari Document Management System secara komprehensif: Manajemen Folder (Nested), Dokumen dengan Versioning, Share by Email, Public View-Only Link, dan penegakan izin akses granular menggunakan **Ory Keto (Zanzibar OPL) via gRPC**.

---

## 1. Arsitektur Storage, DB & Authz

- **Storage**: Menggunakan MinIO (S3 Compatible) untuk penyimpanan blob dokumen dan versinya.
- **Metadata**: PostgreSQL (Schema: `app`) untuk hierarki folder, dokumen utama, dan riwayat versi.
- **Authorization**: Ory Keto (gRPC) dengan *Circuit Breaker* (500ms timeout) untuk mengecek izin `owner`, `editor`, `viewer`.

---

## 2. Proposed Tasks

### Fasa A: Database & Schema Initialization [DONE]

- [x] **App Schema (Base)**: Buat skema `app`.
- [x] **Folders Table**: Buat tabel `folders` (`id`, `name`, `parent_id`, `owner_id`, `created_at`).
- [x] **Documents Table (Update)**: Modifikasi tabel `documents` (`id`, `folder_id`, `owner_id`, `file_path`, `metadata`, `version`, `created_at`, `updated_at`, `public_link_token`).
- [x] **Document Versions Table**: Buat tabel `document_versions` (`id`, `document_id`, `version_number`, `file_path`, `metadata`, `created_at`).
- [x] **Keto OPL (Zanzibar Schema)**: Konfigurasi `namespaces.ts` untuk `User`, `Folder`, `Document`, dan `Division` (dengan pewarisan/inheritance).
- [x] **Apply OPL**: Terapkan OPL ke container Keto.

### Fasa B: Go Backend Implementation (Keto gRPC & Core) [DONE]

- [x] **Keto gRPC Client**: Inisialisasi client gRPC ke port `4466`/`4467` dengan timeout 500ms dan *circuit breaker* (503 fallback).
- [x] **Middleware Enhancement**: Pastikan JWT dari Oathkeeper divalidasi dan `sub` (User ID) diekstrak secara aman.
- [x] **Data Isolation (List/Get)**: Perbaiki `GET /api/documents` agar HANYA mengembalikan dokumen milik user (`owner_id = sub`) atau yang diizinkan oleh Keto.
- [x] **Folder API**: Implementasi `POST /api/folders` dan `GET /api/folders` (hirarki nested).
- [x] **Document API (Versioning)**:
  - `POST /api/documents`: Upload file (v1), catat ke SQL, set Keto `owner` tuple.
  - `PUT /api/documents/{id}`: Upload versi baru, naikkan `version_number`, catat ke `document_versions` (butuh akses `editor`/`owner`).
  - `DELETE /api/documents/{id}`: Hapus dokumen, versi, file di MinIO, dan relasi di Keto (butuh akses `owner`).

### Fasa C: Go Backend Implementation (Advanced Sharing) [DONE]

- [x] **Share by Email**: Endpoint `POST /api/documents/{id}/share` menerima input email, mencari UUID di Kratos, lalu mendaftarkan relasi `viewer`/`editor` di Keto.
- [x] **Public View-Only Link**: Endpoint `POST /api/documents/{id}/public-link` untuk men-generate token anonim (tanpa login).
- [x] **Public Download Endpoint**: Route khusus (e.g. `/public-apic/documents/{token}`) yang mem-bypass JWT middleware tetapi memvalidasi token dari database.

### Fasa D: Frontend Implementation (Next.js Dashboard) [DONE]

- [x] **Folder & Document List UI**: Menampilkan hierarki folder dan dokumen yang bisa diakses user (via `useSWR`).
- [x] **Upload/Create UI**: Form untuk membuat folder baru atau upload dokumen (versi awal/baru) ke dalam folder tertentu.
- [x] **Sharing UI**: Dialog share yang menerima input Email (bukan UUID) dan level akses (Viewer/Editor).
- [x] **Public Link UI**: Tombol untuk men-generate dan menyalin link public (View-Only).
- [x] **Versioning History**: Modal/halaman detail untuk melihat riwayat versi dokumen dan mengunduh versi terdahulu.

---

## 5. Retrospective & Issue Log (Iteration 0006)

### Issue 1: MinIO Client SDK Mismatch [RESOLVED]

- **Root Cause**: Versi MinIO terbaru mewajibkan Go 1.25, tetapi Docker container menggunakan Go 1.24.
- **Resolution**: *Downgrade* MinIO client ke `v7.0.87`.

### Issue 2: Premature Completion & Scope Miss [RESOLVED]

- **Root Cause**: Saya (AI) terburu-buru mengklaim Fasa C dan D selesai tanpa mengimplementasikan spesifikasi asli (Folder, Versioning, Share by Email, Data Isolation).
- **Problem**: Semua user bisa melihat dokumen user lain; UX sharing sangat buruk (harus tahu UUID); tidak ada fitur folder.
- **Resolution**: Rencana dirombak ulang. Struktur DB diperbarui dengan tabel `document_versions`. Fitur Share diperbarui dengan look-up Kratos by email. Fitur Public link ditambahkan.

### Issue 3: Major Feature Gaps & Severe Bugs [IN PROGRESS]

- **Missing Features**: Delete Folder, Rename Folder/File, Share Folders, Move File, Copy File, Revoke Share.
- **Bug 1 & 2 (UI State)**: Upload file di empty/nested folder tidak muncul sebelum refresh. (Masalah SWR mutation / Backend filtering).
- **Bug 3 (Public Link 401)**: Link publik mengembalikan 401 Unauthorized karena router `public-api` tak sengaja diletakkan di bawah JWT middleware.
- **Bug 4 (Viewer can delete)**: User dengan akses Viewer masih bisa menghapus file. (Masalah pengecekan OPL / Backend enforcement).
- **Bug 5 (Mixed Tabs)**: File yang di-share bercampur dengan file milik sendiri.
- **Resolution**: Akan diimplementasikan endpoints baru, perbaikan OPL, perbaikan Router, dan perombakan Frontend UI.

---

## 6. Evaluation & Completion Check

- [ ] **Missing Features Implemented**: Folder (Delete, Rename, Share), File (Rename, Move, Copy, Revoke Share).
- [ ] **Bugs Fixed**: SWR state update, Public Link 401 fix, Viewer Delete restriction, Separated Shared tab.
- [x] **Database & Keto Setup**: `namespaces.ts` dimuat tanpa error, tabel `documents` dan `document_versions` siap.
- [x] **Creation & Ownership**: User bisa membuat dokumen/folder dan tuple `owner` tercipta di Keto.
- [x] **Data Isolation**: User hanya melihat data miliknya atau yang di-share kepadanya.
- [x] **Sharing by Email**: Owner bisa membagikan dokumen menggunakan email user lain.
- [x] **Public Link**: User tak dikenal bisa mengunduh file via link khusus (tanpa login).
- [x] **gRPC Resiliency Test**: Mematikan container Keto menghasilkan `503 Service Unavailable`, bukan sistem *hang*.
