# technical requirements (trd)

## 1. database schema requirements

- Schema `kratos`: Tabel internal Ory Kratos.
- Schema `keto`: Tabel relation tuples Zanzibar.
- Schema `hydra`: Tabel token & clients OAuth2.
- Schema `app`: Tabel `documents` (id, owner_id, file_path, metadata).

## 2. keto namespaces (opl)

Wajib mengimplementasikan class berikut dalam `namespaces.opl`:

- `User`: Subjek identitas.
- `Document`: Resource utama. Relasi: `owners`, `viewers`, `editors`.
- `Division`: Kelompok user. Relasi: `members`, `managers`.

## 3. go-backend grpc client

- Library: `github.com/ory/keto-client-go`.
- Timeout: Maksimal 500ms untuk setiap CheckRequest.
- Fallback: Jika Keto gRPC tidak merespon, backend wajib melempar error 503 (Circuit Breaker).

## 4. oauth2 scopes

- `dms.read`: Akses baca dokumen.
- `dms.share`: Izin untuk menambah relasi viewer di Keto.
