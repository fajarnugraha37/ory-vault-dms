# Specification: auth/error/page.tsx

## Overview
Handle and display detailed errors occurring during Ory identity flows (registration, login, etc.).

## Functionality
*   **User Interface:**
    *   Displays an error card with icon and title.
    *   Shows error code, status, message, and reason if available.
    *   Provides links to return to "Login" or "Dashboard Home".
    *   Shows a loading state while fetching error details.
*   **Navigation:**
    *   Allows navigating back to login page or root dashboard.
*   **Accessibility:**
    *   Standard UI components with proper structure.

## Behavior
*   The page extracts the `id` of the error from the URL search parameters.
*   Uses `ory.getFlowError({ id: errorId })` to fetch full error details from Ory Kratos.
*   Renders the error details using a structured, terminal-like display inside a card.

## Logic & Data Handling
*   **State Management:**
    *   `error`: Stores the fetched `FlowError` from Ory SDK.
*   **API Calls:**
    *   **Ory SDK `getFlowError`**:
        *   Used to fetch details regarding the failed identity flow using the provided ID.
*   **Storage Handling:**
    *   None specific to this page.

## Dependencies
*   `@ory/client`: Access to `FlowError` type and Ory SDK instance.
*   `lib/ory`: Ory SDK initialization.
*   `next/navigation`: URL query params parsing.
*   `components/ui/*`: UI components.

## Potential Issues
*   Ory error messages might be technical; should ensure they are helpful but safe to expose.
*   Requires `ory` instance initialized correctly in `lib/ory.ts`.
*   Error details might not exist if the ID is invalid (page might remain stuck in loading or empty state).
