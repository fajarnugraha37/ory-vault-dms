# Specification: components/shared/VaultPrimitives.tsx

## Overview
A shared collection of core UI primitives for the DMS UI, designed for consistency across the application.

## Functionality
*   **VaultCard:**
    *   Standardized container card.
    *   Supports variants (default, glass, accent).
    *   Implements an optional "spotlight" hover effect using CSS radial gradients and mouse movement tracking.
*   **VaultButton:**
    *   Standardized button component.
    *   Supports variants (primary, secondary, ghost, destructive) and sizes (sm, md, lg, icon).
    *   Built-in loading state handling.
    *   Includes a "shine" animation for primary buttons.
*   **VaultHeader:**
    *   Standard page header with animated title and optional subtitle.
*   **VaultBadge:**
    *   Standardized label component for badges.

## Behavior
*   Uses `framer-motion` for animations.
*   `VaultCard` uses React `useRef` and `onMouseMove` to update CSS variables for the spotlight effect.
*   `VaultButton` uses `cn` utility for robust style composition.

## Dependencies
*   `framer-motion`.
*   `lib/utils.ts`.
*   `lucide-react` (if extended by components using these).

## Potential Issues
*   The "spotlight" effect on `VaultCard` adds a mouse event listener to every instance, which might impact performance in lists with many items (like the document table).
*   Styles are hardcoded as Tailwind strings; maintenance requires global style alignment.
*   The "shine" animation requires a global CSS `@keyframes shine` definition to be declared in `globals.css`.
