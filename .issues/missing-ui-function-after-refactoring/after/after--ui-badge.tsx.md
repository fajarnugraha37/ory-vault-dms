# Specification: components/ui/badge.tsx

## Overview
A reusable Badge component built using `class-variance-authority` (cva) and Base UI primitives for standard status/category labeling.

## Functionality
*   **UI:** 
    *   Supports variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
    *   Responsive and flexible for different content types.
*   **API:**
    *   Props include `variant` and standard HTML attributes.

## Logic & Data Handling
*   **Styling:**
    *   Uses `class-variance-authority` to manage variant-specific CSS classes.
    *   Uses `cn` utility for class merging.
    *   Integrated with Base UI for accessibility and rendering.

## Dependencies
*   `class-variance-authority` (cva).
*   `@base-ui/react`.
*   `lib/utils.ts`.

## Potential Issues
*   The use of `@base-ui/react` indicates a modern UI architecture that requires awareness of Base UI patterns if extending.
*   `rounded-4xl` might need a specific tailwind config entry; verify `tailwind.config.ts`.
