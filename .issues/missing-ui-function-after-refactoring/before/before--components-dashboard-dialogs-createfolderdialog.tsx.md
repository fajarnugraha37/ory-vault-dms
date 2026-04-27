# Specification: components/dashboard/dialogs/CreateFolderDialog.tsx

## Overview
Dialog for creating new directory nodes.

## Functionality
*   **User Interface:**
    *   Input for folder name.
    *   "Initialize Folder" (submit) and "Cancel" buttons.
*   **Behavior:**
    *   Submits POST `/api/nodes/folder` with name and current parent folder ID.
    *   Refreshes node list via `mutateNodes` on success.

## Logic & Data Handling
*   **State Management:**
    *   `name`: Folder name input.
    *   `loading`: Submission state.
*   **API Calls:**
    *   `POST /api/nodes/folder`: Create folder endpoint.
*   **Context:**
    *   Uses `VaultContext` (`currentFolder`, `mutateNodes`).

## Dependencies
*   `components/ui/dialog`: Dialog primitive.
*   `components/shared/VaultPrimitives`: UI layouts.
*   `context/VaultContext`: Vault access.
*   `lib/api`: API client.

## Potential Issues
*   Input validation: only checks for empty string; backend probably requires specific name formatting.
