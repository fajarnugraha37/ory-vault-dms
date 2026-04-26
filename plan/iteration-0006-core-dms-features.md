# Pelan: Lelaran 0006 - Core DMS Features (Hardened)

## Objektif
Mengimplementasikan inti dari Document Management System: Unggah/Unduh file, manajemen metadata dokumen di PostgreSQL, dan penegakan izin akses granular (Read/Write/Owner) menggunakan **Ory Keto (Zanzibar OPL)**.

---

## 1. Arsitektur Storage & Authz
- **Storage**: Menggunakan MinIO (S3 Compatible) untuk penyimpanan blob.
- **Metadata**: PostgreSQL (Schema: `app`) untuk menyimpan informasi file (name, size, type, path).
- **Authorization**: Ory Keto (gRPC) untuk mengecek izin akses subjek terhadap objek dokumen.

---

## 2. Proposed Tasks

### Fasa A: Infrastructure Setup [DONE]
- [x] **MinIO Integration**: Tambahkan service MinIO ke `docker-compose.yaml`.
- [x] **Keto OPL**: Definisikan schema OPL (Ory Permission Language) untuk dokumen (owner, editor, viewer).
- [x] **Database Migration**: Buat tabel `app.documents` dan `app.folders`.

### Fasa B: Backend Core - Storage Layer [DONE]
- [x] **MinIO Client**: Implementasi wrapper menggunakan **official minio-go SDK** (NO DIY).
- [x] **Context Handling**: Pastikan seluruh stream upload/download mendukung cancellation.

### Fasa C: Backend Core - Document API [DONE]
- [x] **Upload Endpoint**: `POST /api/documents` (Multipart upload, save to MinIO, record to SQL).
- [x] **List/Get Endpoint**: `GET /api/documents` (Pagination ready).
- [x] **Download Endpoint**: `GET /api/documents/{id}/download`.
- [x] **Delete Endpoint**: `DELETE /api/documents/{id}` (Added to plan, deletes from MinIO & SQL).

### Fasa D: Integration - Ory Keto Guard [DONE]
- [x] **Keto Client**: Implementasi wrapper menggunakan **official keto-client-go SDK** (gRPC port 4466).
- [x] **Permission Middleware**: Interceptor untuk memvalidasi izin akses sebelum operasi dokumen dilakukan.
- [x] **Relationship Manager**: Otomatis buat relasi `owner` di Keto saat dokumen diunggah.

### Fasa E: Frontend UI - DMS Pro [DONE]
- [x] **Document Explorer**: UI tabel Shadcn untuk melihat daftar file.
- [x] **Upload Center**: Modal upload dengan progress bar.
- [x] **Sharing Manager**: Dialog untuk memberikan akses dokumen ke user lain (update Keto relation).

---

## 5. Retrospective & Issue Log (Iteration 0006)

### Issue 1: MinIO Client SDK Mismatch
- **Root Cause**: Versi MinIO terbaru mewajibkan Go 1.25, tetapi Docker container menggunakan Go 1.24.
- **Resolution**: *Downgrade* MinIO client ke `v7.0.87` (versi terahir untuk 1.24) agar bisa dikompilasi oleh container Go 1.24.
- **Lesson Learned**: Harus teliti mengecek kompatibilitas SDK pihak ketiga dengan *builder image* Docker sebelum melakukan *upgrade* masal.

### Issue 2: Keto Relationship API Syntax
- **Root Cause**: Perbedaan sintaks antara Keto client v0.5.2 dan v0.11 dalam pemanggilan `CreateRelationship`.
- **Resolution**: Menggunakan `CreateRelationshipBody` alih-alih `Relationship` model, dan `PermissionApi` bukan `PermissionAPI`.
- **Lesson Learned**: Dokumentasi Keto seringkali tertinggal dari perubahan SDK Go. Cek kode sumber SDK secara langsung lebih dapat diandalkan.

---

## 6. Evaluation & Completion Check
- [x] **Zero DIY Storage**: Menggunakan SDK MinIO resmi.
- [x] **Cryptographic Integrity**: Validasi izin akses murni via Keto, bukan SQL query manual.
- [x] **Persistence**: Metadata dan file tetap ada setelah restart.
- [x] **Performance**: Upload file menggunakan multipart upload dengan stream ke MinIO, dengan UI yang memiliki progres.
