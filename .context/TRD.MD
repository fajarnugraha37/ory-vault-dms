# technical requirements (trd)

## 1. database schema requirements

- Schema `app`: 
    - Tabel `nodes`: Struktur hierarki folder & file (Unified).
    - Tabel `file_metadata`: Spesifik metadata untuk node tipe 'file'.
- Schema `enterprise`: Tabel `audit_logs`, `roles`, `user_roles`.

## 2. keto namespaces (opl)

Wajib mengimplementasikan class berikut dalam `namespaces.ts`:

- `User`: Subjek identitas.
- `nodes`: Resource unified (Folder/File). Relasi: `owner`, `viewer`, `editor`, `parent`.
- `Division`: Kelompok user. Relasi: `members`, `managers`.

## 3. go-backend grpc client

- Library: `github.com/ory/keto-client-go`.
- Timeout: Maksimal 500ms untuk setiap CheckRequest.
- Fallback: Jika Keto gRPC tidak merespon, backend wajib melempar error 503 (Circuit Breaker).

## 4. oauth2 scopes

- `dms.read`: Akses baca dokumen.
- `dms.share`: Izin untuk menambah relasi viewer di Keto.
