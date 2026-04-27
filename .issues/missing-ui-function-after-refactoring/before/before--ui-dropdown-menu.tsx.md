# Specification: ui/dropdown-menu.tsx

## Overview
Dropdown menu components using Radix UI primitives.

## Functionality
*   **User Interface:**
    *   Menu container (`DropdownMenuContent`) and menu items (`DropdownMenuItem`).
*   **Behavior:**
    *   Handles opening/closing triggers via Radix `DropdownMenuPrimitive`.

## Logic & Data Handling
*   **State Management:**
    *   Managed via Radix `Root`.

## Dependencies
*   `@radix-ui/react-dropdown-menu`: Base primitives.
*   `lib/utils`: `cn` utility.
