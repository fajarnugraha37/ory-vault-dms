# Specification: components/ui/input.tsx

## Overview
A baseline Input component built on `@base-ui/react/input`.

## Functionality
*   **UI:**
    *   Standardized input behavior.
    *   Responsive font sizes.
    *   Handles `aria-invalid` and `disabled` states.
*   **API:**
    *   Standard HTML input attributes.

## Behavior
*   Uses Base UI's `Input` primitive.
*   Merges custom classes via `cn`.

## Dependencies
*   `@base-ui/react/input`.
*   `lib/utils.ts`.

## Potential Issues
*   None.
