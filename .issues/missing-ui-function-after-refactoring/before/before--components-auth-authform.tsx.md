# Specification: components/auth/AuthForm.tsx

## Overview
Reusable form component for Ory Kratos identity flows (login, registration, recovery, verification, settings).

## Functionality
*   **User Interface:**
    *   Dynamic rendering of form inputs based on Ory `UiNode` list.
    *   Supports text/email/password inputs (hidden inputs handled automatically).
    *   Display of error/success messages from Ory.
    *   Submit button with loading state.
*   **Accessibility:**
    *   Labels generated from Ory node meta.
    *   Standard input fields.

## Behavior
*   Uses `useEffect` to auto-populate form values from hidden Ory nodes (like CSRF tokens).
*   Controlled component pattern: `values` and `onChange` managed by parent pages.
*   Maps Ory `UiNode` types to UI inputs.

## Logic & Data Handling
*   **State Management:**
    *   Prop-based state management for values and loading.
*   **Form Structure:**
    *   Dynamic list of inputs generated from Kratos UI nodes.

## Dependencies
*   `@ory/client`: `UiNode` types.
*   `components/shared/VaultPrimitives`: `VaultButton`.
*   `components/ui/*`: `Input`, `Label`.

## Potential Issues
*   Strict reliance on Ory node structure; changes in node attributes might break UI rendering.
*   Hardcoded logic to ignore `hidden` type inputs might exclude other needed metadata.
