# SPRINT 01: THE SKELETON & IDENTITY

## SPRINT BACKLOG

1. **TASK-101 (Infra)**: Docker Compose + Postgres init-db (4 schemas).
2. **TASK-102 (Ingress)**: Nginx virtual host routing for auth/api domains.
3. **TASK-103 (Identity)**: Kratos self-service flow (registration/login).
4. **TASK-104 (Proxy)**: Oathkeeper protection on `/api/documents` (401 return).
5. **TASK-105 (App)**: Go Backend dummy log `X-User-Id`.

## ACCEPTANCE CRITERIA

- Database memiliki schema `kratos` dan `keto`.
- `auth.ory-vault.test` menampilkan response JSON dari Kratos.
- Request ke `api.ory-vault.test/api/documents` tanpa cookie menghasilkan `401 Unauthorized`.
- Request dengan valid cookie menghasilkan `200 OK` dengan ID user muncul di log backend.
