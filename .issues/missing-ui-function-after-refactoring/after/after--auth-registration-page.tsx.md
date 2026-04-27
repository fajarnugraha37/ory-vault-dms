# Specification: auth/registration/page.tsx

## Overview
The registration page provides a self-service registration flow for new DMS users using Ory Kratos.

## Functionality
*   **User Interface:**
    *   Displays `AuthForm` populated with registration Kratos UI nodes.
    *   Displays validation or infrastructure errors.
    *   Links to the login page for existing users.
    *   Loading state during registration submission.
*   **Navigation:**
    *   Redirects to `/auth/login` after successful registration.
*   **Accessibility:**
    *   Clear, consistent form UI shared with login components.

## Behavior
*   Initializes the browser registration flow on component mount via Kratos SDK.
*   Dynamically generates the registration form based on Kratos node configuration.
*   Submits form data via password method.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Stores current `RegistrationFlow`.
    *   `values`: Form input state.
    *   `error`: Registration-specific error messages.
    *   `loading`: Submission indicator.
*   **API Calls:**
    *   **GET** `/self-service/registration/flows` (via Ory SDK `createBrowserRegistrationFlow`).
    *   **POST** `/self-service/registration` (via Ory SDK `updateRegistrationFlow`).
*   **Cookie/Local/Session Handling:**
    *   Standard Kratos flow cookie handling.

## Dependencies
*   `@ory/client` for Kratos SDK.
*   `lib/ory.ts`.
*   `components/auth/AuthLayout`, `components/auth/AuthForm`.
*   `sonner` for toast notifications.

## Potential Issues
*   Registration success relies on Kratos flow completion; if Kratos is configured with verification-required, the user might not be logged in automatically after registration.
*   `error` state management might not cover all Kratos validation error types appropriately.
*   Redirect to login after registration might be confusing if email verification is enabled.
