# Specification: dashboard/error.tsx

## Overview
Global error boundary for the `/dashboard` route, providing feedback when an unexpected runtime error occurs.

## Functionality
*   **User Interface:**
    *   Centered error card with visual indicators (AlertCircle icon).
    *   Displays error digest and error message.
    *   Provides "RE_INITIALIZE_NODE" action button to trigger `reset()`.
*   **Navigation:**
    *   None (error boundary).

## Behavior
*   Logs the error to the console via `useEffect`.
*   Uses Next.js Error Boundary `error` and `reset` props.
*   Renders an elegant fallback UI using `VaultPrimitives`.

## Logic & Data Handling
*   **State Management:**
    *   None (stateless error boundary).
*   **API Calls:**
    *   None.

## Dependencies
*   `components/shared/VaultPrimitives`.
*   `lucide-react`.
*   `framer-motion`.

## Potential Issues
*   The `reset()` function might not work as intended if the error is triggered during the rendering process itself (e.g., in a parent layout).
*   If `error.message` contains sensitive backend data, it's displayed directly to the user; generic messages are usually safer.
