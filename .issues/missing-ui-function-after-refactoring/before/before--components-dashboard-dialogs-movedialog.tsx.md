# Specification: components/dashboard/dialogs/MoveDialog.tsx

## Overview
Dialog for moving/relocating nodes within the vault.

## Functionality
*   **User Interface:**
    *   Input for Target Parent ID.
    *   "ROOT" button (for moving to root).
    *   "Execute Relocation" (submit) button.
*   **Behavior:**
    *   Submits PUT `/api/nodes/{id}/move` with parent ID.
    *   Supports moving to root (by passing `null`).
    *   Refreshes node list via `mutateNodes` on success.

## Logic & Data Handling
*   **State Management:**
    *   `targetParentId`: ID of the destination parent.
    *   `loading`: Submission status.
*   **API Calls:**
    *   `PUT /api/nodes/{id}/move`: Update node's parent.
*   **Context:**
    *   Uses `VaultContext` (`mutateNodes`).

## Dependencies
*   `components/ui/dialog`: Dialog primitive.
*   `components/shared/VaultPrimitives`: UI components.
*   `context/VaultContext`: Vault access.
*   `lib/api`: API client.

## Potential Issues
*   Requires valid UUID format for `parent_id`.
*   Moving node to itself or circular references might cause backend errors (assumed to be handled by backend).
