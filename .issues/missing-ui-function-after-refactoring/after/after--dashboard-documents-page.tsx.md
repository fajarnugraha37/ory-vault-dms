# Specification: dashboard/documents/page.tsx

## Overview
The Documents page (Digital Vault) is the primary workspace for interacting with the document storage system, providing navigation, file operations, and search capabilities.

## Functionality
*   **User Interface:**
    *   Dynamic breadcrumb navigation.
    *   Search input for filtering documents.
    *   Sort controls (alphabetical, temporal).
    *   Operations toolbar: Upload, Create Directory.
    *   Main table (`NodeTable`) for listing files and folders.
    *   Modals for operations: Upload, Create Folder, Move, Share, Rename.
*   **Navigation:**
    *   Supports hierarchical folder navigation.
    *   Uses `VaultContext` to maintain state across the UI.

## Behavior
*   Uses `VaultContext` for managing folder navigation, sorting, and fetching nodes.
*   Interactive UI updates using `framer-motion` for transitions.
*   Dialog-driven operations (Move, Share, Rename) triggered from table items.

## Logic & Data Handling
*   **State Management:**
    *   `activeDialog`: Current open dialog.
    *   `selectedNodeId`: Currently selected item for dialog operations.
    *   `searchQuery`: Local state for filtering.
    *   `VaultContext` provides global state (`nodes`, `folderHistory`, `isLoading`).
*   **Sorting/Filtering:**
    *   `useMemo` hook computes `filteredNodes` based on search input.
    *   Sorting managed by `VaultContext`.
*   **Dialog Lifecycle:**
    *   Dialogs use a shared `activeDialog` state; props like `node` are passed dynamically.

## Dependencies
*   `context/VaultContext`.
*   `components/dashboard/NodeTable`.
*   `components/dashboard/dialogs/*` (Upload, CreateFolder, Move, Share, Rename).
*   `lucide-react` for UI icons.
*   `framer-motion` for UI transitions.

## Potential Issues
*   The `useMemo` for `selectedNode` needs to ensure the `nodes` array itself is stable or correctly dependency-managed to prevent unnecessary re-renders.
*   Large directory contents rely on `NodeTable`'s implementation, which must handle virtualization or efficient rendering if the node count is massive.
*   Dialog-based operation flow needs robust state handling; `activeDialog` state updates must trigger dialog rendering correctly.
