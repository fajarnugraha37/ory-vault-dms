# code convention: ory-vault dms

## 1. golang (backend)

- **project structure**: gunakan pola `internal/` untuk kode privat.
- **naming**:
  - Variable: `camelCase`.
  - Exported Function/Struct: `PascalCase`.
  - Interface: Akhiri dengan 'er' (contoh: `PermissionChecker`).
- **error handling**:
  - Selalu bungkus error dengan konteks: `fmt.Errorf("authz: failed to check permission: %w", err)`.
  - Gunakan `errors.Is` atau `errors.As` untuk pengecekan tipe error.
- **grpc client**: Inisialisasi client gRPC sebagai singleton di level package `internal/authz` untuk menghindari kebocoran koneksi.

## 2. next.js & typescript (frontend)

- **components**: Gunakan Functional Components dengan arrow functions.
- **props**: Wajib mendefinisikan `interface Props` untuk setiap komponen.
- **state**: Gunakan `useSWR` untuk data fetching guna menangani caching dan revalidasi otomatis.
- **imports**: Gunakan absolute paths dengan prefix `@/` (contoh: `@/components/Button`).

## 3. environment variables

- **naming**: Gunakan `SCREAMING_SNAKE_CASE` (contoh: `KETO_READ_GRPC_ENDPOINT`).
- **loading**: Semua env wajib divalidasi saat startup. Jika env krusial kosong, aplikasi wajib `panic` atau `exit(1)`.

## 4. configuration (yaml)

- **indentation**: Gunakan 2 spasi secara konsisten.
- **keys**: Gunakan `snake_case` untuk semua key konfigurasi Ory.
