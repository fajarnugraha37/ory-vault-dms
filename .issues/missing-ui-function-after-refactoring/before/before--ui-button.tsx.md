# Specification: ui/button.tsx

## Overview
Generic UI Button component using `class-variance-authority` and Radix `Slot`.

## Functionality
*   **User Interface:** 
    *   Button with variants (default, destructive, outline, secondary, ghost, link).
    *   Sizes (default, sm, lg, icon).
*   **Behavior:**
    *   Supports `asChild` prop to render as a different component (e.g., `<a>` or `<Link>`).

## Logic & Data Handling
*   **State Management:**
    *   Variant-driven styles via `cva`.

## Dependencies
*   `class-variance-authority`: Style variant management.
*   `@radix-ui/react-slot`: Allows composition of button behavior into other components.
*   `lib/utils`: `cn` utility.
