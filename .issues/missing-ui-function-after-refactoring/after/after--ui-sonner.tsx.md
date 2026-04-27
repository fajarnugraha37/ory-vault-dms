# Specification: components/ui/sonner.tsx

## Overview
A toast notification wrapper component using `sonner`.

## Functionality
*   **UI:**
    *   Integrates `sonner` Toaster.
    *   Includes custom icons for different toast types (success, info, warning, error, loading).
*   **Behavior:**
    *   Responsive to theme changes via `next-themes`.
    *   Uses CSS variables for consistent theming with the rest of the application.

## Dependencies
*   `sonner`.
*   `next-themes`.
*   `lucide-react`.

## Potential Issues
*   Requires `next-themes` to be set up globally in the application for `useTheme()` to function correctly.
*   The `--normal-*` CSS variable approach assumes these are defined in the global CSS (likely `globals.css`).
