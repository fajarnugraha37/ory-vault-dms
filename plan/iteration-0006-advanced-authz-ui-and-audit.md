# Plan: Iteration 0006 - Advanced Authorization UI & System Auditability (Phase 5)

## Objective
Implement dynamic frontend features based on real-time permission evaluation from Ory Keto and establish an audit trail for identity and delegation events. This ensures that the UI accurately reflects user capabilities and the system meets compliance standards.

## Proposed Tasks

### 1. Dynamic UI Authorization (Next.js & Keto)
- **Check Permission Endpoint**: Create an endpoint in the Go backend (e.g., `GET /api/documents/{id}/permissions`) that allows the frontend to query the current user's permissions on a specific document (e.g., `can_edit`, `can_share`, `is_owner`).
- **Dynamic Frontend Components**: Update the Next.js document list and detail views to conditionally render UI elements based on Keto responses.
  - Hide the "Share" button if the user only has `viewer` access.
  - Show the "Delete" button only if the user has `owner` access.
- **SWR Permission Hooks**: Create a custom hook `usePermissions(documentId)` in Next.js to fetch and cache these granular permissions efficiently.

### 2. Authorization Audit Trail
- **Audit Logging Middleware**: Enhance the Go backend to log a structured JSON audit event every time an authorization decision is made (both granted and denied). 
  - Log format must include: `timestamp`, `subject_id` (from `X-User-Id`), `action` (e.g., `read`, `share`), `resource_id` (e.g., `document:123`), and `decision` (`allowed` / `denied`).
- **Relation Tuple Tracking**: Log an audit event whenever a document's relation tuple is modified (e.g., when a user shares a document with another user).

### 3. Manager/Division Inheritance Verification
- **Division Membership Setup**: Provide a script or CLI tool to simulate assigning users to a `Division` as `members` and a specific user as a `manager`.
- **Inheritance Testing UI**: Create a specialized view in the Next.js dashboard for Division Managers to see all documents belonging to their division members, proving that Keto's Zanzibar inheritance model works end-to-end.

## Validation Strategy
1. **Dynamic UI Test**: Log in as a user who is only a `viewer` of a document. Verify that the "Share" and "Delete" buttons do not exist in the DOM for that specific document.
2. **Audit Log Verification**: Attempt to access a document without permissions. Check the Go backend logs to ensure a `"decision": "denied"` audit event was emitted with the correct `resource_id` and `subject_id`.
3. **Inheritance Test**: 
   - Assign User A as `member` of Division X.
   - Assign User B as `manager` of Division X.
   - User A uploads Document 1.
   - Log in as User B. User B must be able to view Document 1 without User A explicitly sharing it, purely based on division manager inheritance defined in Keto.