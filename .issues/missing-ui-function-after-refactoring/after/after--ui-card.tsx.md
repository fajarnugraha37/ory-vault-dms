# Specification: components/ui/card.tsx

## Overview
A compositional Card component set including `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.

## Functionality
*   **UI:**
    *   Responsive and flexible structure based on internal data slots.
    *   Supports `size` variant (`default`, `sm`).
*   **Composition:**
    *   Allows flexible layout using sub-components.

## Behavior
*   Uses `data-slot` and `data-size` attributes for scoped styling and behavior.
*   Merges classes via `cn` utility.

## Dependencies
*   `lib/utils.ts`.

## Potential Issues
*   Uses specific data attributes (`data-slot`, `group-data`) which rely on a clean Tailwind configuration setup; if styles aren't applying correctly, ensure the `tailwind.config.ts` is correctly picking up these patterns.
