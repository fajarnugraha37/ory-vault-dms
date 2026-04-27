# Specification: auth/registration/page.tsx

## Overview
Handle the user registration process using Ory Kratos.

## Functionality
*   **User Interface:**
    *   Auth layout with title "New Identity".
    *   `AuthForm` for registration fields.
    *   Error message display for validation failures.
    *   Link to "Execute Login Protocol" (login page).
*   **Navigation:**
    *   Redirects to `/auth/login` after successful registration.
*   **Accessibility:**
    *   Standard UI via `AuthForm`.

## Behavior
*   Starts registration flow using `ory.createBrowserRegistrationFlow`.
*   Submission uses `ory.updateRegistrationFlow` (password method).
*   Successful registration shows success toast and redirects to login.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Registration flow object.
    *   `values`: Input field values.
    *   `error`: Registration failure message.
    *   `loading`: Submission processing state.
*   **API Calls:**
    *   **Ory API**: `createBrowserRegistrationFlow`, `updateRegistrationFlow`.
*   **Form Structure:**
    *   Dynamic nodes provided by Kratos.

## Dependencies
*   `@ory/client`: Flow management.
*   `lib/ory`: Ory client.
*   `components/auth/*`: UI components.

## Potential Issues
*   Password requirements might be strict and result in generic "Registration criteria not met" errors.
*   Infrastructure connectivity issues to Kratos.
