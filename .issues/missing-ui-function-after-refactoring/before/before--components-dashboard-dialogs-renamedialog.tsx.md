# Specification: components/dashboard/dialogs/RenameDialog.tsx

## Overview
Dialog for renaming files or folders.

## Functionality
*   **User Interface:**
    *   Input for new label.
    *   "EXECUTE_RENAME" and "Cancel" buttons.
*   **Behavior:**
    *   Pre-populates input with current node name.
    *   Submits PUT `/api/nodes/{id}/rename` with new name.
    *   Refreshes node list via `mutateNodes` on success.

## Logic & Data Handling
*   **State Management:**
    *   `name`: New name input.
    *   `loading`: Submission status.
*   **API Calls:**
    *   `PUT /api/nodes/{id}/rename`: Update node name.
*   **Context:**
    *   Uses `VaultContext` (`mutateNodes`).

## Dependencies
*   `components/ui/dialog`: Dialog primitive.
*   `components/shared/VaultPrimitives`: UI components.
*   `context/VaultContext`: Vault access.
*   `lib/api`: API client.

## Potential Issues
*   Renaming might cause path conflicts (backend assumed to validate).
