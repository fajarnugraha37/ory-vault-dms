# Style and Conventions

## Go Backend
- Use `chi` for routing.
- Use `github.com/ory/keto-client-go` for gRPC client.
- Structured logging (JSON format).
- Defensive programming: always check `X-User-Id` header injected by Oathkeeper.
- Schema isolation: Always set `search_path=app` in Go DSN.

## Frontend
- Next.js with Tailwind CSS.
- `axios` with `withCredentials: true`.
- SSG preferred where possible.

## Infrastructure
- Docker Compose 3.8 format.
- `ory-network` for all containers.
- Postgres 16 Alpine.
