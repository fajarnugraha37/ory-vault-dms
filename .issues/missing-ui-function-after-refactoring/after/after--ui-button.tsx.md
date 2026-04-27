# Specification: components/ui/button.tsx

## Overview
A standard, highly reusable Button component built using `class-variance-authority` (cva) and Radix UI's `Slot` component.

## Functionality
*   **UI:**
    *   Supports variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
    *   Supports sizes: `default`, `sm`, `lg`, `icon`.
*   **API:**
    *   `asChild`: Allows polymorphic rendering (rendering as a different component like `<a>` via `Slot`).

## Behavior
*   Uses `forwardRef` for ref forwarding.
*   Merges classes via `cn` utility.

## Dependencies
*   `class-variance-authority` (cva).
*   `@radix-ui/react-slot`.
*   `lib/utils.ts`.

## Potential Issues
*   None; this follows standard shadcn/ui patterns.
