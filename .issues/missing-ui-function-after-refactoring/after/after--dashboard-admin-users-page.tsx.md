# Specification: dashboard/admin/users/page.tsx

## Overview
The Admin Control page (Identity Control) is a privileged dashboard area for administrators to manage users (subjects), view audit logs, and perform infrastructure operations.

## Functionality
*   **User Interface:**
    *   Tabs for managing "Subjects", "Audit Log", and "Infra Ops".
    *   **Subjects:** Table showing identity subject, state, and assigned roles, with actions to toggle status or manage details.
    *   **Audit Log:** Table displaying system events (Timestamp, Action, Subject, IP Address).
    *   **Infra Ops:** Tools for bulk cleanup and CSV imports.
    *   **User Detail Dialog:** Provides detailed user management tabs: Traits, RBAC Roles, Active Sessions, and Security (recovery).
*   **Navigation:**
    *   Admin-only access; unauthorized users are redirected to `/dashboard/documents`.
    *   Supports pagination via `page_token`.

## Behavior
*   Uses `useSWR` for real-time data fetching for identities, audit logs, and authentication info.
*   Supports interactive administrative tasks: state toggling, role assignment/revocation, session termination, and recovery link generation.
*   Provides bulk infrastructure management (purge protocol).

## Logic & Data Handling
*   **State Management:**
    *   `me`: Current user object (checks for `admin` role).
    *   `pageToken` / `historyTokens`: Pagination.
    *   `selectedUser`: The user identity currently being managed in the modal.
*   **API Calls:**
    *   **GET** `/api/me`: Auth info check.
    *   **GET** `/admin-api/identities`: List users.
    *   **GET** `/admin-api/audit`: Audit logs.
    *   **PUT** `/admin-api/identities/:id/state`: Update user state.
    *   **POST** `/admin-api/identities/:id/roles`: Assign role.
    *   **DELETE** `/admin-api/identities/:id/roles/:roleId`: Revoke role.
    *   **DELETE** `/admin-api/identities/:id/sessions/:sid`: Terminate session.
    *   **POST** `/admin-api/identities/:id/recovery`: Generate recovery link.
    *   **POST** `/admin-api/ops/cleanup`: Bulk purge.

## Dependencies
*   `swr` for data fetching.
*   `lib/api.ts` (API client).
*   `components/layout/Navbar`.
*   `components/shared/VaultPrimitives`.
*   `components/ui/tabs`, `table`, `dialog`.
*   `lucide-react` for icons.

## Potential Issues
*   Direct interaction with administrative endpoints (`/admin-api/*`) requires secure backend implementation; failure in middleware or backend authorization could expose critical operations.
*   Pagination (`historyTokens`) in React state is not persistent; hard refreshes will reset to page 1.
*   The admin check uses `!me.roles.includes('admin')`, which is client-side only; this must be backed by server-side verification to be secure.
*   Role management (assigning/revoking) is optimistic; if backend fails, UI state might desync.
