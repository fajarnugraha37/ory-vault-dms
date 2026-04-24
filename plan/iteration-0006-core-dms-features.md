# Plan: Iteration 0006 - Core DMS Features (Phase 2)

## Objective

Implement the core Document Management System (DMS) features including document metadata CRUD operations in the Go backend, Zanzibar-based fine-grained permission control using Ory Keto (via gRPC), and the corresponding frontend UI in Next.js.

## Proposed Tasks

### 1. Database & Schema Initialization

- **App Schema**:
  - Create the `folders` table (`id`, `name`, `parent_id`, `owner_id`, `created_at`).
  - Create the `documents` table (`id`, `folder_id`, `owner_id`, `file_path`, `metadata`, `version`, `created_at`, `updated_at`).
  - Create the `document_versions` table (`id`, `document_id`, `version_number`, `file_path`, `metadata`, `created_at`).
- **Keto OPL (Zanzibar Schema)**: Create the `namespaces.ts` (OPL) for Ory Keto defining the namespaces and relations:
  - `User`: The identity subject.
  - `Folder`: Relations for `owners`, `viewers`, `editors`, and inheritance from `parent_id`.
  - `Document`: Relations for `owners`, `viewers`, `editors`, and inheritance from its parent `Folder`.
  - `Division`: Relations for `members`, `managers` (with inheritance logic to access member documents/folders).
- **Apply OPL**: Configure and apply the OPL to the Keto container.

### 2. Go Backend Implementation (DMS Core & Keto gRPC)

- **Keto gRPC Client**: Initialize a singleton gRPC client in the Go backend (`internal/authz`) to communicate with Keto on port `4466` (read) and `4467` (write). Implement a max 500ms timeout per check and a 503 fallback circuit breaker.
- **Middleware Enhancement**: Ensure the authentication middleware extracts `X-User-Id` securely from Oathkeeper.
- **Document & Folder Endpoints (Full CRUD & Versioning)**:
  - `POST /api/folders` & `GET /api/folders`: Create and list folders (requires Keto `owner` relation).
  - `POST /api/documents`: Create a new document metadata entry (v1) and automatically insert a write relation tuple in Keto making the `X-User-Id` the `owner`.
  - `GET /api/documents`: Fetch documents where the user has read access.
  - `PUT /api/documents/{id}`: Update document metadata and bump its `version` (requires `editor` or `owner` access in Keto).
  - `DELETE /api/documents/{id}`: Delete a document and its Keto relations (requires `owner` access).
  - `POST /api/documents/{id}/share`: Allow an `owner` to add a `viewer` or `editor` relation tuple in Keto for another user.

### 3. Frontend Implementation (Next.js Dashboard)

- **Folder & Document List UI**: Create a dashboard component using `useSWR` to fetch and display the user's accessible folders and documents.
- **Upload/Create UI**: Create a form to submit new document metadata (or a new version) to the backend.
- **Sharing UI**: Implement a modal/form on a document/folder to share it with another user's email/ID, selecting the access level (Viewer/Editor).
- **Versioning History**: Display a history log of a document's versions on its detail page.

## Validation Strategy

1. **Database & Keto Setup**: Ensure `namespaces.ts` is loaded by Keto without syntax errors and the `app.documents` table is accessible.
2. **Creation & Ownership**: A logged-in user can create a document. Verify via Keto gRPC (or REST debug endpoint) that the tuple `Document:123#owner@user-uuid` is created.
3. **Sharing**: The owner can grant `viewer` access to a second user.
4. **Unauthorized Access**: If a third user attempts to access the document (via curl to `/api/documents/{id}`), the backend must return `403 Forbidden` after checking with Keto.
5. **gRPC Resiliency Test**: Temporarily stop the Keto container and verify the backend returns a `503 Service Unavailable` instead of hanging indefinitely.
