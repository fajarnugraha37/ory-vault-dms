# Pelan: Lelaran 0006 - Perbaikan Sharing & Zero Trust Hardening

## 1. Masalah Utama
- **Sharing Visibility**: Item yang di-share tidak muncul di tab "Shared with me".
- **Access List Empty**: Daftar user di tab "USERS" kosong.
- **UI Build Error**: Type error `email` pada `AccessRelation`.
- **Protocol Violation**: Keto Client masih menggunakan REST (sedang dalam proses migrasi ke gRPC).

## 2. Strategi Perbaikan
### A. Frontend (UI)
- Update interface `AccessRelation` untuk menyertakan opsional `email`.
- Pastikan `mutate` dipanggil pada key SWR yang tepat.

### B. Backend (Go)
- **Keto gRPC**: Pastikan koneksi gRPC ke `vault-keto:4466` (Read) dan `vault-keto:4467` (Write) bekerja.
- **Identity Resolution**: Perbaiki mapping `Email` -> `UUID` saat sharing agar tidak salah target.
- **Access List**: Perbaiki query `ListRelationships` gRPC agar memfilter berdasarkan Object ID secara presisi.
- **Shared Tab**: Implementasikan penggabungan item milik sendiri dan item yang di-share dengan filter yang benar.

## 3. Langkah Eksekusi
1. Update `dms-ui/src/app/dashboard/documents/page.tsx` (Fix Type Error).
2. Verifikasi ulang `dms-backend/internal/keto/client.go` (Ensure gRPC).
3. Verifikasi rute API di `router.go`.
4. Rebuild & Deploy.

## 4. Validasi
- Login User A -> Share File ke User B.
- Cek tab USERS di User A (Harus muncul email User B).
- Login User B -> Cek tab SHARED_WITH_ME (Harus muncul file tersebut).
