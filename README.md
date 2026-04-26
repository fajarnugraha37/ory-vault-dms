# ORY-VAULT DMS

A **Secure Document Management System (DMS)** with 3rd-party delegation built natively on the **Ory Stack**, **Go**, and **Next.js**.

The system implements a **Zero-Trust** edge proxy architecture to completely separate identity, authentication, authorization, and 3rd-party access delegation from the core backend logic. It enforces a highly granular permission model (Google Zanzibar) using Ory Keto.

## Architecture & Core Components

1. **Ingress Layer (Nginx)**: Hardened gateway with HTTPS and dynamic DNS resolution for upstream container churn.
2. **Security Edge Proxy (Ory Oathkeeper)**: Identity-Aware Proxy (IAP) handling JWT transformation (Signed RS256) and session-to-token mutation.
3. **Identity Provider (Ory Kratos)**: Handles all user data, MFA, and lifecycle. Supported by a **Courier worker** for reliable asynchronous email delivery.
4. **Permissions Engine (Ory Keto)**: Enforces access control lists (ACL) using Zanzibar OPL via gRPC.
5. **Delegation (Ory Hydra)**: OAuth2 provider allowing 3rd-party clients to access DMS APIs securely.
6. **Enterprise Backend (Go 1.24)**: Modular Chi-based API with official Ory SDK integration, persistent PostgreSQL audit logging, and Unified Node Architecture.
7. **Frontend UI (Next.js)**: Modern control plane using **Shadcn UI**, SSG, and centralized API utilities.
8. **Database (PostgreSQL 16)**: Multi-schema design (`app`, `kratos`, `keto`, `hydra`, `enterprise`) for total data isolation.

## Tech Stack

- **Backend**: Go 1.24, Chi Router, official Ory Kratos/Hydra/Keto SDKs.
- **Frontend**: Next.js 16, React 19, Tailwind CSS, SWR.
- **Identity & Access**: Ory Kratos (v1.1), Ory Keto, Ory Oathkeeper, Ory Hydra.
- **Infrastructure**: Docker & Docker Compose, Hardened Nginx.
- **Database**: PostgreSQL 16.

## Getting Started

### Prerequisites

- Docker and Docker Compose installed.
- Go 1.24+ and Node.js 24+ (if running outside containers).
- [Bun runtime](https://bun.sh) (for testing toolkit).
- Make utility installed.

### 1. Configure Local DNS

Add the following entries to your OS's host file:

```text
127.0.0.1   auth.ory-vault.test
127.0.0.1   api.ory-vault.test
127.0.0.1   ext-api.ory-vault.test
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
- **OAuth2 Management**: `https://ory-vault.test/dashboard/apps`
- **Internal API (UI)**: `https://api.ory-vault.test`
- **External API (Apps)**: `https://ext-api.ory-vault.test`
- **Auth/SSO Hub**: `https://auth.ory-vault.test`
- **Mailpit (SMTP UI)**: `https://mail.ory-vault.test`

## Testing (OAuth2)

A simulation app for testing 3rd-party integration is available in the repository.

1. Create a client at `https://ory-vault.test/dashboard/apps`.
2. Configure `tools/oauth2-test-app/index.ts` with your credentials.
3. Run: `bun run tools/oauth2-test-app/index.ts`.
4. Open `http://localhost:4000`.

## Repository Structure (Modular Go)

```text
.
├── dms-backend/
│   ├── cmd/server          # Go Entry point
│   └── internal/
│       ├── api/            # Chi Router
│       ├── handler/        # Business Logic (OAuth2, Nodes, Admin)
│       ├── middleware/     # RBAC, JWT, Scope Guards
│       └── store/          # Modular Persistence (Unified Nodes)
├── dms-ui/                 # Next.js Frontend
├── tools/                  # Integration Test Toolkit (Bun.js)
└── contrib/config          # Ory Stack Production Configs
```

## License

This project is licensed under the MIT License.
