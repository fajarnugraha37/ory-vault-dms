# Plan: Iteration 0001 - Project Scaffolding (Phase 0)

## Objective
Initialize the full tech stack skeleton for ORY-VAULT DMS, ensuring all infrastructure components are ready for Phase 1.

## Proposed Tasks
1. **Initialize Directory Structure**: Ensure all required folders in `contrib/` and app directories exist.
2. **Setup Infrastructure (Docker Compose)**: Create a `docker-compose.yaml` incorporating Kratos, Keto, Hydra, Oathkeeper, Postgres, and Nginx.
3. **Database Initialization**: Create `contrib/db/init.sql` to setup schemas (`kratos`, `keto`, `hydra`, `app`).
4. **Ory Component Configuration**:
    - `contrib/config/kratos/kratos.yaml`
    - `contrib/config/keto/keto.yaml`
    - `contrib/config/oathkeeper/oathkeeper.yaml` & `rules.yaml`
    - `contrib/config/hydra/hydra.yaml`
5. **Nginx Ingress Configuration**: Setup `contrib/nginx/default.conf` to route traffic for `.test` domains.
6. **Backend Scaffolding**: Initialize Go module in `dms-backend/`.
7. **Frontend Scaffolding**: Initialize Next.js project in `dms-ui/`.

## Validation Strategy
- `make up` should start all containers without errors.
- `make check` (or manual curl) should verify connectivity to all Ory public ports.
- Verify Postgres schemas exist via `psql`.
