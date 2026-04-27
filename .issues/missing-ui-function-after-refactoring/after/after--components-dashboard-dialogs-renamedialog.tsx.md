# Specification: components/dashboard/dialogs/RenameDialog.tsx

## Overview
A dialog component for renaming files or folders (nodes).

## Functionality
*   **User Interface:**
    *   Input field pre-filled with the current node name.
    *   Action button to execute rename.
*   **Navigation:**
    *   None.

## Behavior
*   Uses `useEffect` to initialize `name` state when `node` prop changes.
*   Sends a PUT request to `/api/nodes/:id/rename` with the new name.
*   Triggers `mutateNodes` on success.

## Logic & Data Handling
*   **State Management:**
    *   `name`: New name input state.
    *   `loading`: Boolean for submission state.
*   **API Calls:**
    *   **PUT** `/api/nodes/:id/rename` (rename node).
*   **Context usage:**
    *   `useVault` for data mutation.

## Dependencies
*   `components/ui/dialog`.
*   `components/ui/input`, `components/ui/label`.
*   `components/shared/VaultPrimitives`.
*   `context/VaultContext`.
*   `lib/api.ts`.
*   `sonner`.

## Potential Issues
*   Empty name input or whitespace-only name is not explicitly validated/prevented, though the backend likely handles it.
*   Doesn't prevent renaming to an existing name within the same folder (potential collisions).
