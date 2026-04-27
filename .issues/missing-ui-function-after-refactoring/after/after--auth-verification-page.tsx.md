# Specification: auth/verification/page.tsx

## Overview
The verification page handles the email verification flow within Ory Kratos, confirming user identity via a link or code sent to their email.

## Functionality
*   **User Interface:**
    *   Displays `AuthForm` populated with verification Kratos UI nodes.
    *   Loading state during verification submission.
    *   Toast notification on success.
*   **Navigation:**
    *   Link to return to login.
*   **Accessibility:**
    *   Consistent, standard form layout.

## Behavior
*   Initializes the browser verification flow via Ory Kratos.
*   Submits the verification (e.g., code entry) back to Kratos.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Stores current `VerificationFlow`.
    *   `values`: Form input state.
    *   `loading`: Boolean for submission state.
*   **API Calls:**
    *   **GET** `/self-service/verification/flows` (via SDK `createBrowserVerificationFlow` or `getVerificationFlow`).
    *   **POST** `/self-service/verification` (via SDK `updateVerificationFlow`).

## Dependencies
*   `@ory/client` for Kratos SDK.
*   `lib/ory.ts`.
*   `components/auth/AuthLayout`, `components/auth/AuthForm`.
*   `sonner` for toast notifications.

## Potential Issues
*   The page does not explicitly handle cases where verification is successful but the user is not automatically signed in (common in Kratos).
*   Minimal feedback on error handling beyond re-rendering the flow nodes.
*   The `Suspense` fallback is basic.
