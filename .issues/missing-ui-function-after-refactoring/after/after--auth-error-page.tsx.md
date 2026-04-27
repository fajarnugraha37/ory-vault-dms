# Specification: auth/error/page.tsx

## Overview
The auth error page displays diagnostic information for errors encountered during Ory Kratos identity flows.

## Functionality
*   **User Interface:**
    *   Displays a structured card containing error code, status, and message.
    *   Includes a "Return to Login" primary action button.
    *   Includes a "Dashboard Home" secondary navigation link.
    *   Shows a loading state during the fetching of error details.
*   **Navigation:**
    *   Allows users to easily return to login or home.
*   **Accessibility:**
    *   Clear, high-contrast error display with distinct sections.

## Behavior
*   Uses `useSearchParams` to retrieve the error `id` from the URL.
*   Uses the `@ory/client` via `lib/ory.ts` to fetch detailed error data from the API upon mounting.
*   Gracefully handles missing or un-fetchable error details.

## Logic & Data Handling
*   **State Management:**
    *   `error`: Stores the fetched `FlowError` object.
*   **API Calls:**
    *   `ory.getFlowError({ id: errorId })`
        *   Success: Populates `error` state.
        *   Failure: Logs to console.
*   **UI Components:**
    *   Uses custom `Label` component for metadata display.
    *   Integrates `lucide-react` icons (AlertCircle, ArrowLeft).

## Dependencies
*   `@ory/client` for Kratos SDK.
*   `lib/ory.ts` for Ory configuration.
*   `components/ui/card`, `components/ui/button`.

## Potential Issues
*   The `FlowError` object cast to `any` in `(error.error as any)` suggests potential type safety fragility if the Ory SDK structure changes or if the returned object doesn't match expected fields.
*   Hard dependency on Ory's `getFlowError` which might be blocked if the backend is misconfigured.
*   If `id` is invalid, the user gets stuck on a "LOADING_ERROR_DETAILS..." loop or an empty screen.
