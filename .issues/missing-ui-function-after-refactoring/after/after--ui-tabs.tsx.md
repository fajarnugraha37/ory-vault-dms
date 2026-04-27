# Specification: components/ui/tabs.tsx

## Overview
A compositional Tabs component set built using `@base-ui/react/tabs`.

## Functionality
*   **UI:** 
    *   Composed of `Tabs` (Root), `TabsList`, `TabsTrigger`, and `TabsContent`.
    *   Supports `variant` (`default`, `line`) for styling list/triggers.
    *   Responsive for horizontal or vertical orientation.
*   **API:**
    *   Standard Props from `TabsPrimitive`.

## Behavior
*   Uses Base UI's primitives for state management (active tab).
*   Dynamic styling based on variant and active state using data attributes (`data-active`).

## Dependencies
*   `@base-ui/react/tabs`.
*   `class-variance-authority`.
*   `lib/utils.ts`.

## Potential Issues
*   Styling relies on complex data attributes (`data-active`, `group-data-*`) which require careful integration with global CSS/Tailwind configuration.
