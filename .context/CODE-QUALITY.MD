# code quality invariants

## 1. go (backend)

- **Error Handling**: Dilarang menggunakan `_`. Semua error wajib di-handle atau di-log.
- **Strict Typing**: Gunakan struct untuk request/response body. Dilarang menggunakan `map[string]interface{}`.
- **Middleware**: Autentikasi hanya boleh dilakukan di middleware dengan memvalidasi Signed JWT dari Oathkeeper.

## 2. next.js (frontend)

- **Auth Guard**: Gunakan `useAuth` hook di setiap halaman `/dashboard`.
- **Environment**: Semua URL API wajib menggunakan variabel `.env.local`.
- **SSG Safety**: Pastikan data sensitif hanya dipanggil di sisi Client (`useEffect` atau `useSWR`).

## 3. configurations (yaml/opl)

- **Comments**: Setiap rule di `oathkeeper.rules.yaml` wajib memiliki komentar penjelasan targetnya.
- **Versioning**: Gunakan tag versi spesifik pada image Docker (contoh: `oryd/kratos:v1.1.0`), dilarang menggunakan `:latest`.

## 4. logging

- Gunakan format JSON untuk semua log container agar mudah di-parse di masa depan.
- Log backend wajib menyertakan identitas subjek dari JWT.
