# Specification: components/dashboard/dialogs/CreateFolderDialog.tsx

## Overview
A dialog component for creating new directories (folders) in the document management vault.

## Functionality
*   **User Interface:**
    *   Input field for the new folder name.
    *   Dialog header with title and icon.
    *   Action buttons ("Cancel", "INITIALIZE_FOLDER").
*   **Navigation:**
    *   None.

## Behavior
*   Uses `VaultContext` to determine the current folder (`currentFolder`) and trigger a refresh (`mutateNodes`) after successful creation.
*   Sends a POST request to `/api/nodes/folder` to create the folder.

## Logic & Data Handling
*   **State Management:**
    *   `name`: Folder name input state.
    *   `loading`: Boolean for submission state.
*   **API Calls:**
    *   **POST** `/api/nodes/folder` (create folder).
*   **Context usage:**
    *   `useVault` for parent folder reference and data mutation.

## Dependencies
*   `components/ui/dialog`.
*   `components/ui/input`, `components/ui/label`.
*   `components/shared/VaultPrimitives`.
*   `context/VaultContext`.
*   `lib/api.ts`.
*   `sonner` for toast notifications.

## Potential Issues
*   Empty folder names are implicitly ignored (`if (!name) return;`); user might expect an error message instead.
*   Validation for invalid folder characters is missing; relies on backend validation.
*   The `currentFolder` context variable must be correctly populated, otherwise folder creation might fail or create at an unexpected location.
