# MASTER SPEC: ORY-VAULT DMS

## project identity

- goal: secure document management with 3rd party delegation.
- stack: Go (Backend), Next.js SSG (Frontend), Ory (Kratos, Hydra, Keto, Oathkeeper).
- database: Postgres (Multi-schema: kratos, keto, hydra, app).
- local domains: auth.ory-vault.test, api.ory-vault.test, ory-vault.test.

## technical stack

- core: Ory Kratos (Identity), Keto (Permissions), Hydra (OAuth2), Oathkeeper (Proxy)
- infra: Docker Compose, Nginx (Ingress), Postgres 16 (Multi-schema)
- apps: Go 1.22 (Backend), Next.js SSG (Frontend)

## project phases

- phase 0: bootstrap the stack (infrastructure & core).
- phase 1: identity & access control (ORY).
- phase 2: core DMS features (CRUD, versioning, metadata, sharing).
- phase 3: delegation & 3rd party integration.
- phase 4: UI, frontend, and production hardening.

## network & domain logic

- domain palsu: auth.ory-vault.test, api.ory-vault.test, ory-vault.test
- internal: semua container di `ory-network`
- keto communication: MUST use gRPC (4466 read, 4467 write)

## database isolation

- DB Name: `ory_vault`
- Schemas: `kratos`, `keto`, `hydra`, `app` (DMS metadata)

## technical invariants (non-negotiable)

1. communication: Go to Keto MUST use gRPC (Port 4466/4467).
2. proxy: Oathkeeper is the ONLY entry point to dms-backend.
3. authentication: Based on shared cookies for `.ory-vault.test`.
4. authorization: Zanzibar model (OPL) via Ory Keto.
5. code style: Go 1.22 allowed to use the library and avoid DIY

## infrastructure invariants

- database: postgres:16-alpine.
- networks: all services on `ory-network` (bridge).
- ingress: nginx:alpine (port 80).
- iam components: kratos v1.1, keto v0.11, hydra v2.2, oathkeeper v0.40.

## database routing (isolation)

- database name: `ory_vault`.
- kratos: schema `kratos` (search_path=kratos).
- keto: schema `keto` (search_path=keto).
- backend app: schema `app` (search_path=app).

## domain & routing

- auth.ory-vault.test -> kratos:4433 (public) / 4434 (admin).
- api.ory-vault.test -> oathkeeper:4455 (proxy).
- ory-vault.test -> dms-ui:8080 (nextjs).

## communication protocols

- frontend to proxy: http/1.1 with shared cookies.
- backend to keto: gRPC (4466 read / 4467 write).
- proxy to backend: http/1.1 with `X-User-Id` header injection.

## infrastructure mapping

- Nginx (Port 80) -> Gateway.
- Oathkeeper (Port 4455) -> Auth Proxy.
- Kratos (Port 4433) -> Identity.
- Keto (Port 4466/4467) -> Permissions.
- Hydra (Port 4444/4445) -> OAuth2.
- DMS Backend: Go (API) -> Keto (gRPC) -> Postgres (Schema: app).
- Frontend: Next.js -> Nginx -> Oathkeeper -> Backend.
