# Specification: components/dashboard/NodeTable.tsx

## Overview
A dynamic table component for listing files and folders, providing navigation and action menus for each node.

## Functionality
*   **User Interface:**
    *   Table listing nodes with Name, Type, Size, and Modified columns.
    *   Row-level interaction: Click to navigate (if folder), right-click (or kebab menu) for operations.
    *   Empty state display when no nodes are present.
*   **Navigation:**
    *   Handles navigation via `onNavigate` prop when clicking on folder rows.

## Behavior
*   Uses `framer-motion` for row entry/exit animations.
*   Uses `DropdownMenu` for node-specific actions (Rename, Move, Share, Delete, Download).
*   Triggers callbacks for actions via `onAction` prop.

## Logic & Data Handling
*   **State Management:**
    *   Stateless (controlled by parent props).
*   **Sorting/Display:**
    *   Formats size using `formatBytes` utility.
    *   Formats dates using `toLocaleDateString`.
*   **Actions:**
    *   `onNavigate`: Triggered on folder row click.
    *   `onAction`: Triggered from dropdown menu selection.

## Dependencies
*   `components/ui/table`.
*   `components/ui/dropdown-menu`.
*   `components/shared/VaultPrimitives`.
*   `lucide-react` (icons).
*   `framer-motion`.
*   `lib/utils.ts` (formatting, class utility).

## Potential Issues
*   The `Node` interface within the file seems slightly misaligned with real data structures if not managed correctly.
*   Action handlers rely on strings (e.g., "delete"), which lack type safety; could be prone to typos.
*   If `onAction` is passed to the dropdown, the parent component must be robust enough to handle the logic flow for each action type.
