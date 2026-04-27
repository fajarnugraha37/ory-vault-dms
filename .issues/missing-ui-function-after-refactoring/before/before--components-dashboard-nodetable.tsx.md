# Specification: components/dashboard/NodeTable.tsx

## Overview
Main table component for displaying vault nodes (files/folders).

## Functionality
*   **User Interface:**
    *   Table rows display Name (with icon), Type, Size, Modified Date.
    *   Dropdown menu for node actions (Download, Rename, Move, Share, Delete).
    *   Row click interaction (navigation for folders).
    *   Empty state handling.
*   **Behavior:**
    *   Filters and displays provided `nodes`.
    *   Triggers navigation on folder clicks.
    *   Triggers context-specific actions on dropdown selection.

## Logic & Data Handling
*   **State Management:**
    *   Handled via props (`nodes`, `onNavigate`, `onAction`).
*   **API Calls:**
    *   None (managed by parent pages).

## Dependencies
*   `components/ui/table`: Table layout.
*   `components/ui/dropdown-menu`: Actions menu.
*   `components/shared/VaultPrimitives`: `VaultBadge`.
*   `lib/utils`: Formatting (formatBytes, cn).
*   `framer-motion`: Entry animations.

## Potential Issues
*   Row click interaction might interfere with unintended interactions (handled by `e.stopPropagation()` in dropdown trigger).
*   Data types for `node` rely on standard node structure; must be consistent across the app.
