# Specification: components/dashboard/dialogs/ShareDialog.tsx

## Overview
A complex dialog component for managing file/folder access permissions and generating public sharing links.

## Functionality
*   **User Interface:**
    *   Tabs for "Grant" (new access), "Collaborators" (list existing access), and "Public Signal" (public sharing link).
    *   Input for user email to share with.
    *   Role selection (Viewer/Editor).
    *   List of current collaborators with revocation actions.
    *   Public link generation, copying, and termination.
*   **Navigation:**
    *   None.

## Behavior
*   Uses `useSWR` to fetch and manage the access control list (ACL).
*   Uses `VaultContext` to perform operations via `handleAction`.
*   Provides granular control over permission protocols (Zanzibar-style relations).

## Logic & Data Handling
*   **State Management:**
    *   `shareEmail`: Input for new collaborator.
    *   `shareRelation`: Selected role (viewer/editor).
*   **API Calls:**
    *   **GET** `/api/nodes/:id/access` (list ACL).
    *   **POST** `/api/nodes/:id/share` (grant access).
    *   **DELETE** `/api/nodes/:id/share/:userId` (revoke access).
    *   **POST** `/api/documents/:id/public-link` (generate link).
    *   **DELETE** `/api/documents/:id/public-link` (revoke link).
*   **Context usage:**
    *   `useVault` for `handleAction` (wrapper for operations) and `mutateNodes`.

## Dependencies
*   `components/ui/dialog`, `tabs`, `scroll-area`, `input`.
*   `components/shared/VaultPrimitives`.
*   `context/VaultContext`.
*   `lib/api.ts`.
*   `sonner`.
*   `lucide-react`.

## Potential Issues
*   Highly state-dependent; depends heavily on `node` object correctly containing current access and public link state.
*   The `window.location.origin` inside the dialog might be sensitive if the site is served via different domains/paths.
*   Relies on Kratos identity lookup by email; depends on the backend `share` endpoint logic.
