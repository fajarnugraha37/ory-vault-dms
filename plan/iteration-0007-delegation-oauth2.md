# Iteration 0007: OAuth2 Delegation & Unified Node Architecture

## Status: COMPLETED ✅
**Date:** 2026-04-27

## Goal
Implement a secure, scalable OAuth2 delegation system using Ory Hydra and refactor the core storage into a Unified Node Architecture.

## Completed Tasks
- [x] **Unified Node Architecture**: Consolidate files and folders into `app.nodes` table.
- [x] **Server-side Logic**: Implement atomic sorting, pagination (offset-based), and soft delete.
- [x] **Ory Hydra Integration**: Setup login/consent bridge in Go Backend.
- [x] **Domain Separation (Added during impl)**: 
    - `api.ory-vault.test`: First-party UI (Cookie Auth).
    - `ext-api.ory-vault.test`: Third-party Apps (Bearer Token Auth).
- [x] **Self-Service App Portal**: 
    - Register/List/Delete OAuth2 Clients.
    - **Credentials Reveal**: Show client secret only once upon creation.
- [x] **DRY Refactor**: Centralized Axios and fetcher logic in `dms-ui/src/lib/api.ts`.
- [x] **Testing Suite**:
    - Postman Collection for all flows.
    - Bun.js Test App for end-to-end integration testing.

## Post-Implementation Retrospective (Issues & Lessons Learned)

### Issue 1: API Domain Mismatch (404 Not Found)
- **Root Cause**: Frontend used relative paths, causing requests to hit `ory-vault.test` (UI domain) instead of `api.ory-vault.test`.
- **Resolution**: Implemented `NEXT_PUBLIC_API_URL` environment variable and centralized Axios instance.
- **Lesson Learned**: Always use absolute base URLs for API calls in multi-domain architectures to avoid ambiguity.

### Issue 2: Next.js Build-time Environment Variables
- **Root Cause**: `NEXT_PUBLIC_` variables were set in Docker `environment` (runtime) but not passed as `args` during `npm run build` (build-time).
- **Resolution**: Updated `Dockerfile` to accept `ARG` and `docker-compose.yaml` to pass `args`.
- **Lesson Learned**: Next.js bakes `NEXT_PUBLIC_` variables into the JS bundle during build; runtime env is not enough for client-side code.

### Issue 3: Oathkeeper Configuration Errors (Crash/502)
- **Root Cause**: Attempted to use unsupported `token_from` in `oauth2_introspection` and invalid glob syntax `<(a|b)>`.
- **Resolution**: Reverted to standard glob `<**>` and removed invalid schema keys.
- **Lesson Learned**: RTFM (Read The Friendly Manual) for specific Ory versions. Oathkeeper is extremely strict about YAML schema.

### Issue 4: CSRF & Cookie Collision
- **Root Cause**: Missing `domain` and `same_site` config in Hydra caused browser to drop cookies during cross-subdomain redirects.
- **Resolution**: Set `same_site_mode: Lax` and `domain: ory-vault.test` in `hydra.yaml`.
- **Lesson Learned**: Cross-subdomain authentication requires explicit cookie domain scoping (`.domain.test`) and proper SameSite policies.

### Issue 5: Scope Middleware 403 in UI
- **Root Cause**: Backend forced scope check for first-party cookie sessions which don't carry OAuth2 scopes.
- **Resolution**: Updated middleware to detect Kratos `session` claim and bypass scope checks for UI requests.
- **Lesson Learned**: Distinguish between First-party (Identity-based) and Third-party (Scope-based) access early in the middleware logic.

## Verification Results
- **Backend Build**: SUCCESS (`go build ./...`)
- **Frontend Build**: SUCCESS (`npm run build`)
- **Flow 1 (Auth Code)**: SUCCESS (Verified via Bun App)
- **Flow 2 (Client Credentials)**: SUCCESS (Verified via Bun App)
