# Specification: components/ui/dialog.tsx

## Overview
A standard dialog component set based on Radix UI primitives.

## Functionality
*   **UI:** 
    *   Provides standard modal dialog structure: `Dialog`, `DialogContent`, `Header`, `Footer`, `Title`, `Description`.
    *   Includes a built-in close button.
*   **Navigation:**
    *   Modal interactions.

## Behavior
*   Uses `Radix UI` for accessibility and portal management.
*   Handles overlay, animations, and focus trapping.

## Dependencies
*   `@radix-ui/react-dialog`.
*   `lucide-react` (for the close icon).
*   `lib/utils.ts`.

## Potential Issues
*   None; follows standard implementation patterns.
