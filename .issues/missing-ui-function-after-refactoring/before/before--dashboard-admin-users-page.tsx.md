# Specification: dashboard/admin/users/page.tsx

## Overview
Administrative dashboard for managing user identities, roles, and system infrastructure auditing.

## Functionality
*   **User Interface:**
    *   Tabs for: "Subjects" (user management), "Audit_Log" (activity tracking), "Infra_Ops" (bulk cleanup/seeding).
    *   Table view for listing users with status (active/inactive) and roles.
    *   Dialog for "User Detail" management:
        *   Traits view/edit.
        *   RBAC Role assignment/revocation.
        *   Active session management (termination).
        *   Security: Identity recovery link generation.
*   **Navigation:**
    *   Restricts access if user is not an admin.
    *   Pagination for user list.
*   **Accessibility:**
    *   Uses Radix UI components (Dialog, Tabs, Table).

## Behavior
*   Authenticates admin status on load via `/api/me`.
*   Fetches users and audit logs via admin API endpoints.
*   Allows toggling user account status (active/inactive).
*   Allows role-based access control (assign/revoke roles).
*   Supports terminating user sessions.
*   Supports generating secure recovery links.
*   Bulk operations for infrastructure cleanup.

## Logic & Data Handling
*   **State Management:**
    *   `pageToken`, `historyTokens`: Manage pagination state.
    *   `identityData`, `auditLogs`: Fetched via SWR.
    *   `selectedUser`: Manages dialog view state.
*   **API Calls:**
    *   `GET /admin-api/identities`: List users.
    *   `PUT /admin-api/identities/{id}/state`: Update account status.
    *   `POST/DELETE /admin-api/identities/{id}/roles`: Manage roles.
    *   `DELETE /admin-api/identities/{id}/sessions/{sid}`: Terminate sessions.
    *   `POST /admin-api/identities/{id}/recovery`: Generate recovery link.
    *   `POST /admin-api/ops/cleanup`: Bulk cleanup.
*   **Security:**
    *   Client-side role check, but relies on backend for secure administrative authorization (enforced by Ory).

## Dependencies
*   `swr`: Data fetching.
*   `components/ui/*`: UI components.
*   `lucide-react`: Icons.
*   `framer-motion`: Animations.

## Potential Issues
*   Highly sensitive component: must ensure backend endpoints are correctly secured via Keto/Oathkeeper.
*   Manual state management of pagination tokens might be brittle.
*   User detail modal data needs to be kept in sync with user list via manual `mutate` calls.
