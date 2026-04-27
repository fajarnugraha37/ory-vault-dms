# Specification: dashboard/documents/page.tsx

## Overview
Main entry point for "Digital_Vault". Displays files and directories, handles navigation, search, and document management.

## Functionality
*   **User Interface:**
    *   Breadcrumb navigation.
    *   Search input for filtering documents.
    *   Sort controls (by name/date).
    *   Main `NodeTable` component.
    *   Action dialogs (Upload, Create Folder, Move, Share, Rename).
*   **Navigation:**
    *   Handles breadcrumb navigation (folder history).
*   **Accessibility:**
    *   Standard UI.

## Behavior
*   Retrieves nodes and navigation state via `VaultContext`.
*   Filters display based on `searchQuery`.
*   Trigger dialogs via `activeDialog` state.
*   Sorting handled by `VaultContext` (`sortBy`, `sortOrder`, `toggleSort`).

## Logic & Data Handling
*   **State Management:**
    *   `activeDialog`, `selectedNodeId`, `searchQuery`: Local UI states.
    *   `nodes`, `folderHistory`, `isLoading`: Managed via `VaultContext` (backed by SWR).
*   **API Calls:**
    *   Indirectly handled by `VaultContext` operations.
*   **Sorting/Filtering:**
    *   Client-side filtering of `nodes`.

## Dependencies
*   `context/VaultContext`: Orchestrates document state, navigation, sorting.
*   `components/dashboard/NodeTable`: Renders the file list.
*   `components/dashboard/dialogs/*`: Action dialogs.
*   `components/shared/VaultPrimitives`: Layout components.

## Potential Issues
*   Breadcrumb navigation and `folderHistory` state management complexity.
*   Performance of filtering when handling large directory contents.
*   Dependency on `VaultContext` for *all* core logic makes it hard to debug navigation issues in isolation.
