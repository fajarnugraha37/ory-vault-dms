# Specification: components/auth/AuthForm.tsx

## Overview
A dynamic, reusable form component designed to render Ory Kratos UI nodes.

## Functionality
*   **UI Rendering:**
    *   Iterates through Ory Kratos `UiNode` items.
    *   Filters out `hidden` type inputs (auto-injected).
    *   Renders labels and inputs based on Kratos metadata (`meta.label.text`).
    *   Displays error/info messages per node.
*   **Form Logic:**
    *   Synchronizes input state via `onChange` prop.
    *   Handles form submission via `onSubmit` prop.
    *   Auto-injects hidden values (e.g., CSRF tokens) upon component mount.

## Behavior
*   Uses `useEffect` for one-time initialization of hidden fields.
*   Props-driven: accepts `nodes`, `values`, `onChange`, `onSubmit`, `submitLabel`, `isLoading`, and `messages`.

## Dependencies
*   `@ory/client` (`UiNode` type).
*   `components/shared/VaultPrimitives` (`VaultButton`).
*   `components/ui/input`, `components/ui/label`.
*   `lib/utils.ts` (`cn`).

## Potential Issues
*   The `useEffect` auto-injection might be bypassed if the nodes list changes dynamically in a way that wasn't expected, potentially missing newer hidden nodes.
*   Hardcoded styling (Tailwind classes) might need updates if the global design system changes.
*   Relying on `attrs.name` for field mapping is robust for Kratos, but requires careful synchronization with parent state management.
