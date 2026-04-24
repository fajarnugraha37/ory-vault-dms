# sprint 02: oathkeeper & backend integration

## goal

backend go dapat menerima identitas user dari oathkeeper secara aman.

## tasks

1. **TASK-201**: konfigurasi `oathkeeper.yaml` mutators (header injection).
2. **TASK-202**: buat rule di `oathkeeper.rules.yaml` untuk proteksi rute `/api/documents`.
3. **TASK-203**: implementasi middleware go untuk parsing header `X-User-Id`.
4. **TASK-204**: buat endpoint `GET /api/documents` yang mengembalikan identity ID user.

## definition of done (dod)

- [ ] request ke `api.ory-vault.test/api/documents` tanpa login -> 401.
- [ ] request dengan login -> 200 + response mengandung UUID user.
- [ ] tidak ada logic "session check" di dalam kode go (hanya baca header).
