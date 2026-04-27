# Specification: auth/verification/page.tsx

## Overview
Handle the identity verification process (e.g., email confirmation) using Ory Kratos.

## Functionality
*   **User Interface:**
    *   Auth layout with title "Verification".
    *   `AuthForm` for verification code input.
*   **Navigation:**
    *   Link to return to login.
*   **Accessibility:**
    *   Standard UI.

## Behavior
*   Starts verification flow via `ory.createBrowserVerificationFlow`.
*   Uses `ory.updateVerificationFlow` (method: "code") to submit verification code.
*   Success shows toast notification.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Verification flow object.
    *   `values`: Form input.
    *   `loading`: Processing state.
*   **API Calls:**
    *   **Ory API**: `createBrowserVerificationFlow`, `updateVerificationFlow`.

## Dependencies
*   `@ory/client`: Flow objects.
*   `lib/ory`: Ory client.
*   `components/auth/*`: UI components.

## Potential Issues
*   Flow might rely on parameters passed to create flow which this current simplified implementation might miss.
