# Specification: components/dashboard/dialogs/UploadDialog.tsx

## Overview
A dialog component for uploading files to the document management system.

## Functionality
*   **User Interface:**
    *   File input selector.
    *   Upload progress bar (shown during transmission).
    *   "EXECUTE_UPLOAD" action button.
*   **Behavior:**
    *   Supports single file uploads via multipart/form-data.
    *   Handles file uploads to either a new location or as a new version of an existing file (if `nodeId` provided).
    *   Updates progress UI using `onUploadProgress` axios interceptor.
    *   Trigger `mutateNodes` on success.

## Logic & Data Handling
*   **State Management:**
    *   `file`: Selected File object.
    *   `uploadProgress`: Numeric percentage.
    *   `isUploading`: Boolean loading indicator.
*   **API Calls:**
    *   **POST** `/api/documents` (upload file).
*   **Context usage:**
    *   `useVault` for `currentFolder` (target location), `folderHistory`, and `mutateNodes`.

## Dependencies
*   `components/ui/dialog`, `components/ui/progress`, `components/ui/input`.
*   `components/shared/VaultPrimitives`.
*   `context/VaultContext`.
*   `lib/api.ts`.
*   `sonner`.

## Potential Issues
*   Large file uploads might hit infrastructure limits (gateway/reverse proxy timeout or size limits); backend needs appropriate configuration.
*   The `onUploadProgress` calculation assumes `total` property exists or uses `file.size` fallback; browser behavior varies slightly.
*   Input file type isn't restricted (e.g., `accept` attribute is missing); users can try to upload anything.
