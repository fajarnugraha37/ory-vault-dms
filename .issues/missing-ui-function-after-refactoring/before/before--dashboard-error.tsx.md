# Specification: dashboard/error.tsx

## Overview
Next.js Error Boundary page for the dashboard area.

## Functionality
*   **User Interface:**
    *   Error display with icon, title "System_Fault", and error message/digest.
    *   "RE_INITIALIZE_NODE" button (triggers `reset` function).
*   **Behavior:**
    *   Catches unexpected errors in dashboard layout/pages.
    *   Logs error details to console.
    *   Allows user to attempt re-initialization of the failed component tree.

## Dependencies
*   `components/shared/VaultPrimitives`: UI layout.
*   `lucide-react`: Icons.
*   `framer-motion`: Animations.

## Potential Issues
*   Generic error messages might not be helpful enough for users.
*   Doesn't distinguish between recoverable vs critical errors.
