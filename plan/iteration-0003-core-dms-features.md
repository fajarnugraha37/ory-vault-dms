# Plan: Iteration 0003 - Core DMS Features (Phase 2)

## Objective
Implement the core Document Management System (DMS) features including document metadata CRUD operations in the Go backend, Zanzibar-based fine-grained permission control using Ory Keto (via gRPC), and the corresponding frontend UI in Next.js.

## Proposed Tasks

### 1. Database & Schema Initialization
- **App Schema**: Create the `documents` table in the `app` PostgreSQL schema (columns: `id`, `owner_id`, `file_path`, `metadata`, `created_at`).
- **Keto OPL (Zanzibar Schema)**: Create the `namespaces.ts` (OPL) for Ory Keto defining the namespaces and relations:
  - `User`: The identity subject.
  - `Document`: Relations for `owners`, `viewers`, `editors`.
  - `Division`: Relations for `members`, `managers` (with inheritance logic to access member documents).
- **Apply OPL**: Configure and apply the OPL to the Keto container.

### 2. Go Backend Implementation (DMS Core & Keto gRPC)
- **Keto gRPC Client**: Initialize a singleton gRPC client in the Go backend (`internal/authz`) to communicate with Keto on port `4466` (read) and `4467` (write). Implement a max 500ms timeout per check and a 503 fallback circuit breaker.
- **Middleware Enhancement**: Ensure the authentication middleware extracts `X-User-Id` securely from Oathkeeper.
- **Document Endpoints**:
  - `POST /api/documents`: Create a new document metadata entry in the DB and automatically insert a write relation tuple in Keto making the `X-User-Id` the `owner`.
  - `GET /api/documents`: Fetch documents where the user has read access (requires Keto expand/list API or DB filtering combined with Keto checks).
  - `POST /api/documents/{id}/share`: Allow an `owner` to add a `viewer` relation tuple in Keto for another user.
- **Authorization Enforcement**: Wrap document access logic with Keto `CheckPermission` calls. If unauthorized, return `403 Forbidden`.

### 3. Frontend Implementation (Next.js Dashboard)
- **Document List UI**: Create a dashboard component using `useSWR` to fetch and display the user's accessible documents from `/api/documents`.
- **Upload/Create UI**: Create a form to submit new document metadata to the backend.
- **Sharing UI**: Implement a modal/form on a document to share it with another user's email/ID.

## Validation Strategy
1. **Database & Keto Setup**: Ensure `namespaces.ts` is loaded by Keto without syntax errors and the `app.documents` table is accessible.
2. **Creation & Ownership**: A logged-in user can create a document. Verify via Keto gRPC (or REST debug endpoint) that the tuple `Document:123#owner@user-uuid` is created.
3. **Sharing**: The owner can grant `viewer` access to a second user.
4. **Unauthorized Access**: If a third user attempts to access the document (via curl to `/api/documents/{id}`), the backend must return `403 Forbidden` after checking with Keto.
5. **gRPC Resiliency Test**: Temporarily stop the Keto container and verify the backend returns a `503 Service Unavailable` instead of hanging indefinitely.
