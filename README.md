# ORY-VAULT DMS

A **Secure Document Management System (DMS)** with 3rd-party delegation built natively on the **Ory Stack**, **Go**, and **Next.js**.

The system implements a **Zero-Trust** edge proxy architecture to completely separate identity, authentication, authorization, and 3rd-party access delegation from the core backend logic. It enforces a highly granular permission model (Google Zanzibar) using Ory Keto.

## Architecture & Core Components

1. **Ingress Layer (Nginx)**: Hardened gateway with HTTPS and dynamic DNS resolution for upstream container churn.
2. **Security Edge Proxy (Ory Oathkeeper)**: Identity-Aware Proxy (IAP) handling JWT transformation (Signed RS256) and session-to-token mutation.
3. **Identity Provider (Ory Kratos)**: Handles all user data, MFA, and lifecycle. Supported by a **Courier worker** for reliable asynchronous email delivery.
4. **Permissions Engine (Ory Keto)**: Enforces access control lists (ACL) using Zanzibar OPL via gRPC.
5. **Delegation (Ory Hydra)**: OAuth2 provider allowing 3rd-party clients to access DMS APIs securely.
6. **Enterprise Backend (Go 1.24)**: Modular Chi-based API with official Ory SDK integration, persistent PostgreSQL audit logging, and RBAC middleware.
7. **Frontend UI (Next.js)**: Modern control plane using **Shadcn UI** (in progress), SSG, and client-side SWR data fetching.
8. **Database (PostgreSQL 16)**: Multi-schema design (`app`, `kratos`, `keto`, `hydra`, `enterprise`) for total data isolation.

## Tech Stack

- **Backend**: Go 1.24, Chi Router, official Ory Kratos SDK, PostgreSQL Persistence.
- **Frontend**: Next.js 15, React 19, Tailwind CSS, SWR, Shadcn UI.
- **Identity & Access**: Ory Kratos (v1.1), Ory Keto, Ory Oathkeeper, Ory Hydra.
- **Infrastructure**: Docker & Docker Compose, Hardened Nginx.
- **Database**: PostgreSQL 16.

## Getting Started

### Prerequisites

- Docker and Docker Compose installed.
- Go 1.24+ and Node.js 24+ (if running outside containers).
- Make utility installed.

### 1. Configure Local DNS

Add the following entries to your OS's host file:

```text
127.0.0.1   auth.ory-vault.test
127.0.0.1   api.ory-vault.test
127.0.0.1   app.ory-vault.test
127.0.0.1   mail.ory-vault.test
127.0.0.1   ory-vault.test
```

### 2. Trust the Internal Root CA (Windows)

```powershell
Import-Certificate -FilePath ".\step-ca-data\certs\root_ca.crt" -CertStoreLocation Cert:\CurrentUser\Root
```

### 3. Build & Start the Environment

```bash
make build
make up
make migrate
```

## Access Points

- **DMS Frontend**: `https://ory-vault.test`
- **Admin Dashboard**: `https://ory-vault.test/dashboard/admin/users`
- **Backend Health**: `https://api.ory-vault.test/health`
- **Mailpit (SMTP UI)**: `https://mail.ory-vault.test`

## Repository Structure (Modular Go)

```text
.
├── cmd/server          # Go Entry point (Init & Listen)
├── internal/api        # Chi Router & Middleware integration
├── internal/handler    # HTTP Business Logic (Admin, Users, Sessions)
├── internal/store      # PostgreSQL Persistence & Audit Logic
├── internal/kratos     # Official Kratos SDK wrapper
├── internal/middleware # RBAC & JWT Security Guards
├── dms-ui/             # Next.js Frontend Control Plane
└── contrib/config      # Ory Stack Production-Hardened Configs
```

## License

This project is licensed under the MIT License.
