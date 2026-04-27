# Specification: components/dashboard/dialogs/ShareDialog.tsx

## Overview
Dialog for managing user permissions (sharing) and generating public access links.

## Functionality
*   **User Interface:**
    *   Tabs for: "Grant" (share with user), "Collaborators" (list permissions), "Public_Signal" (generate public link).
    *   Input for sharing by email.
    *   Role selector (Viewer/Editor).
    *   Public link generation/copy/revocation.
*   **Behavior:**
    *   Lists collaborators via `/api/nodes/{id}/access`.
    *   Shares access via `/api/nodes/{id}/share`.
    *   Revokes access via `/api/nodes/{id}/share/{userId}`.
    *   Generates/revokes public links via `/api/documents/{id}/public-link`.

## Logic & Data Handling
*   **State Management:**
    *   `shareEmail`, `shareRelation`: Inputs for sharing.
    *   `accessList`: SWR-managed collaborator list.
*   **API Calls:**
    *   `POST /api/nodes/{id}/share`
    *   `DELETE /api/nodes/{id}/share/{userId}`
    *   `POST /api/documents/{id}/public-link`
    *   `DELETE /api/documents/{id}/public-link`
*   **Context:**
    *   Uses `VaultContext` (`handleAction`, `mutateNodes`).

## Dependencies
*   `components/ui/dialog`, `components/ui/tabs`: UI.
*   `components/shared/VaultPrimitives`: UI components.
*   `lib/api`: API client.

## Potential Issues
*   Collaboration logic involves complex Keto relations (backend role handling).
*   Public link availability is restricted to files only.
