# Specification: components/dashboard/dialogs/MoveDialog.tsx

## Overview
A dialog component for moving files or folders (nodes) to a different parent directory.

## Functionality
*   **User Interface:**
    *   Dialog header indicating the node to be moved.
    *   Input field for the target parent UUID (or an option to move to root).
    *   Visual status feedback showing selected target.
    *   Action button to execute move.
*   **Navigation:**
    *   None.

## Behavior
*   Uses `VaultContext` to trigger `mutateNodes` on success.
*   Sends a PUT request to `/api/nodes/:id/move` with the new `parent_id`.

## Logic & Data Handling
*   **State Management:**
    *   `targetParentId`: String input for the parent UUID.
    *   `loading`: Boolean for submission state.
*   **API Calls:**
    *   **PUT** `/api/nodes/:id/move` (perform move).
*   **Context usage:**
    *   `useVault` for data mutation.

## Dependencies
*   `components/ui/dialog`.
*   `components/ui/input`.
*   `components/shared/VaultPrimitives`.
*   `context/VaultContext`.
*   `lib/api.ts`.
*   `sonner`.

## Potential Issues
*   Requires manual UUID input; if the user provides an invalid UUID, the API might fail. There is no picker/browser for selecting destination nodes.
*   "ROOT" button explicitly sets `parent_id` to `null`.
*   Manual `cn` and `Label` functions are defined inside the file instead of using centralized UI components; this might lead to inconsistencies.
