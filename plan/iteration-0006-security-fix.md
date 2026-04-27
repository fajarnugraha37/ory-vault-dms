# Pelan: Lelaran 0006 - Security Hardening & FAIL-FAST Compliance

## 1. Analisis Masalah

- **Masalah 1 (FAIL-FAST Violation)**: Env `KETO_READ_URL` & `KETO_WRITE_URL` punya default value "benar", harusnya "SALAH" agar ketahuan jika lupa register di docker-compose. (FIXED)
- **Masalah 2 (Security: Public IDOR)**: Link public menggunakan `docID` bisa diakses walaupun file tidak di-share secara publik. (FIXED)
- **Masalah 3 (Security: Missing Keto Checks)**: Endpoint download direct (`/api/documents/:id/download`) dan mutasi lainnya belum ada pengecekan Keto. (FIXED)
- **Masalah 4 (Oathkeeper Overlap)**: Oathkeeper return 500 karena `/api/public/` dan `/api/` overlap. (FIXED)

## 2. Strategi Perbaikan

### A. Environment & Infrastructure

- Update `dms-backend/cmd/server/main.go`: Semua default env sekarang `REQUIRED_CONFIG_MISSING_...`.
- Update `docker-compose.yaml`: Menambahkan `KETO_READ_URL` dan `KETO_WRITE_URL`.

### B. Security: Public Link (Anti-IDOR)

- **Handler**: `GeneratePublicLink` sekarang menghasilkan token random `sig_<hex>` 32 karakter, bukan UUID file.
- **Database**: `GetDocumentByPublicLink` hanya mencari berdasarkan kolom `public_link_token`.

### C. Security: Global Access Audit

- **Direct Download**: Menambahkan `h.Keto.CheckPermission(..., "view", ...)` di `DownloadDocument`.
- **Rename/Move/Delete**: Menambahkan pengecekan Keto `edit` untuk semua mutasi dokumen dan folder.
- **Folder Access**: Menambahkan pengecekan Keto `view` untuk melihat access list.

## 4. Validasi

- [x] Matikan ENV di docker-compose -> Backend crash saat start.
- [x] Akses `/public/<FILE_ID>` tanpa token -> Return 404 (Token tidak cocok dengan ID).
- [x] Download file orang lain via API -> Return 403.
- [x] Oathkeeper `/public-api/` works without 500.
