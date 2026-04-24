# Plan: Iteration 0010 - Observability, Metrics & Disaster Recovery (Phase 6)

## Objective

Establish a robust "Day 2" operational foundation for the ORY-VAULT DMS. This includes enabling and collecting telemetry (metrics) from all Ory services and the Go backend, visualizing them in Grafana, and implementing a secure database backup strategy for disaster recovery.

## Proposed Tasks

### 1. Telemetry & Metrics Exposure

- **Ory Services Configuration**: Update the configuration files (`kratos.yaml`, `keto.yaml`, `hydra.yaml`, `oathkeeper.yaml`) to explicitly enable Prometheus metrics scraping.
  - Ensure the `/metrics/prometheus` endpoints are accessible on the respective admin or telemetry ports (typically `4434`, `4467`, `4445`, and `4456` or `9000`).
- **Go Backend Instrumentation**: Integrate Prometheus middleware in the Go backend to expose standard HTTP metrics (request duration, status codes, panic recovery counts) and gRPC client metrics for Keto calls.

### 2. Prometheus & Grafana Integration

- **Docker Compose Update**: Add `prometheus` and `grafana` services to `docker-compose.yaml`.
- **Prometheus Scraping Config**: Create a `prometheus.yml` configuration file to scrape:
  - `vault-kratos:4434`
  - `vault-keto:4467`
  - `vault-hydra:4445`
  - `vault-oathkeeper:9000` (or configured prometheus port)
  - `vault-backend:8080` (at `/metrics`)
- **Grafana Dashboards**: Pre-provision standard Grafana dashboards (using JSON dashboard provisioning) specifically tailored for the Ory ecosystem (available in Ory's open-source repositories) to visualize authentication success rates, latency, and permission check volumes.

### 3. Disaster Recovery (Database Backups)

- **Backup Script**: Create a shell script (`scripts/backup_db.sh`) using `pg_dump` to perform a logical backup of the entire `ory_vault` database, capturing all multi-schema data (`kratos`, `keto`, `hydra`, `app`).
- **Automated Backup Simulation**: Configure a lightweight `cron` container (or utilize the host's cron) to execute the backup script daily and store the dumps in a designated volume (e.g., `./backups`).
- **Restore Documentation**: Write a brief markdown guide on how to safely restore the database from a dump file to a fresh PostgreSQL container without corrupting active sessions or relation tuples.

## Validation Strategy

1. **Metrics Verification**: Use `curl` to hit the `/metrics/prometheus` endpoint of at least one Ory service (e.g., Kratos) and the Go backend to confirm Prometheus-formatted plaintext data is returned.
2. **Dashboard Rendering**: Access the local Grafana instance (`http://localhost:3001`), ensure it connects to Prometheus successfully, and verify that the dashboards reflect real-time traffic after performing a login and accessing documents.
3. **Backup/Restore Test**:
   - Run the backup script manually to generate an `.sql` dump.
   - Stop the `vault-db` container and delete its volume.
   - Start a fresh `vault-db` container.
   - Apply the dump file.
   - Verify that the previous user accounts (Kratos) and permissions (Keto) are perfectly restored and the system functions normally.
