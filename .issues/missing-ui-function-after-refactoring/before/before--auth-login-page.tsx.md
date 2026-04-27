# Specification: auth/login/page.tsx

## Overview
Handle the user authentication (login) process using Ory Kratos.

## Functionality
*   **User Interface:**
    *   Displays auth form using `AuthForm` component.
    *   Shows error messages if authentication fails.
    *   Includes navigation links to "Forgot Password" and "Register".
*   **Navigation:**
    *   Redirects to dashboard or a `return_to` parameter upon successful login.
    *   Supports OAuth2 login challenge for cross-app authorization (Hyra integration).
*   **Accessibility:**
    *   Standard accessibility via `AuthForm`.

## Behavior
*   If `flow` is not in URL, triggers `ory.createBrowserLoginFlow` to start a new authentication session.
*   If `flow` is present, fetches existing flow status via `ory.getLoginFlow`.
*   Submission updates the login flow via `ory.updateLoginFlow` with credentials from `AuthForm`.
*   After successful submission, checks for `login_challenge` to handle OAuth2 acceptance via internal API `/api/oauth2/login/accept`.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Current Ory Login Flow object.
    *   `values`: Object mapping form input names to values.
    *   `error`: Authentication error message.
    *   `loading`: Submission processing state.
*   **Form Structure:**
    *   Uses dynamic `nodes` provided by Ory `LoginFlow.ui.nodes` to render inputs, allowing Ory to control form schema.
*   **Submission:**
    *   `onSubmit` triggers password method login.
*   **API Calls:**
    *   **Ory API**: `createBrowserLoginFlow`, `getLoginFlow`, `updateLoginFlow`.
    *   **Internal API**: `POST /api/oauth2/login/accept` (only if challenge exists).
*   **Storage/Session:**
    *   Uses browser-based session management managed by Kratos (session cookie).

## Dependencies
*   `@ory/client`: Login flow management.
*   `lib/ory`, `lib/api`: SDK and custom API clients.
*   `components/auth/AuthForm`, `AuthLayout`: UI structure.

## Potential Issues
*   Infrastructure error or misconfigured Ory backend leads to "Infrastructure connection failed" error.
*   OAuth2 challenge handling requires accurate `login_challenge` passing.
*   Hardcoded redirect to `/dashboard/documents` might be inconsistent with project requirements.
