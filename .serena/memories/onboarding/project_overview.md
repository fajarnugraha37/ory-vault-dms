# ORY-VAULT DMS Onboarding Information

## Project Purpose
Secure document management with 3rd party delegation using the Ory Stack.

## Tech Stack
- **Core**: Ory Kratos (Identity), Keto (Permissions), Hydra (OAuth2), Oathkeeper (Proxy)
- **Infra**: Docker Compose, Nginx (Ingress), Postgres 16 (Multi-schema)
- **Apps**: Go 1.22 (Backend), Next.js (Frontend)

## Architecture
- **Layer Model**: Ingress (Nginx) -> Proxy (Oathkeeper) -> Identity (Kratos) / Permissions (Keto) / Backend (Go).
- **Security**: Oathkeeper verifies sessions and injects `X-User-Id` header. Go backend trusts this header.
- **Data Isolation**: Single Postgres DB with schemas: `kratos`, `keto`, `hydra`, `app`.

## Domains
- `auth.ory-vault.test`
- `api.ory-vault.test`
- `ory-vault.test`

## Non-Negotiable Invariants
1. Backend MUST communicate with Keto via gRPC (Port 4466/4467).
2. Oathkeeper is the ONLY entry point to dms-backend.
3. Database `search_path` must be set in DSN (never use `public`).
