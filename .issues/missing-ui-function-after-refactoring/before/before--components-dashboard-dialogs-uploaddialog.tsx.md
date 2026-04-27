# Specification: components/dashboard/dialogs/UploadDialog.tsx

## Overview
Dialog for uploading files or new file versions.

## Functionality
*   **User Interface:**
    *   File input.
    *   Upload progress bar (when uploading).
    *   "EXECUTE_UPLOAD" and "Cancel" buttons.
*   **Behavior:**
    *   Supports single file uploads.
    *   Sends multipart/form-data to `/api/documents`.
    *   Includes `parent_id` (current folder) or `node_id` (new version context).
    *   Refreshes node list on success.

## Logic & Data Handling
*   **State Management:**
    *   `file`: Selected file object.
    *   `uploadProgress`: Percentage (0-100).
    *   `isUploading`: Boolean loading state.
*   **API Calls:**
    *   `POST /api/documents` (multipart).
*   **Context:**
    *   Uses `VaultContext` (`currentFolder`, `folderHistory`, `mutateNodes`).

## Dependencies
*   `components/ui/dialog`, `components/ui/progress`: UI.
*   `components/shared/VaultPrimitives`: UI layouts.
*   `context/VaultContext`: Vault access.
*   `lib/api`: API client.

## Potential Issues
*   File size limits enforced by backend (not visible in UI).
*   Browser handling of multipart/form-data (should be standard).
