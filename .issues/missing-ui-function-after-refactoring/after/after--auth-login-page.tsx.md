# Specification: auth/login/page.tsx

## Overview
The login page manages the authentication flow for the DMS, interacting with Ory Kratos for identity verification and potentially performing an OAuth2 login acceptance flow.

## Functionality
*   **User Interface:**
    *   Displays an `AuthForm` populated with Kratos UI nodes.
    *   Displays error banners for infrastructure or credential issues.
    *   Includes navigation links for identity recovery and new registration.
    *   Displays a "Synchronizing Identity" loading state.
*   **Navigation:**
    *   Redirects to `/dashboard/documents` (default) or `return_to` parameter upon successful login.
    *   Navigates to `/auth/recovery` or `/auth/registration` as needed.
*   **Accessibility:**
    *   Semantic layout using `AuthLayout`.

## Behavior
*   Initializes the browser login flow via Ory Kratos if no `flowId` is present.
*   Populates form values dynamically based on Kratos node attributes.
*   Handles login submission and optional OAuth2 login acceptance.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Stores current `LoginFlow`.
    *   `values`: Form input state (dictionary).
    *   `error`: Authentication or infrastructure errors.
    *   `loading`: Submission indicator.
*   **Form Structure:**
    *   Dynamic form generated from Kratos UI nodes.
*   **API Calls:**
    *   **GET** `/self-service/login/flows` (via Ory SDK `createBrowserLoginFlow`).
    *   **GET** `/self-service/login/flows` (via Ory SDK `getLoginFlow`).
    *   **POST** `/self-service/login` (via Ory SDK `updateLoginFlow`).
    *   **POST** `/api/oauth2/login/accept` (if `login_challenge` is present).
*   **Cookie/Local/Session Handling:**
    *   Ory Kratos handles session cookies via browser redirects/SDK calls.

## Dependencies
*   `@ory/client` for Kratos SDK.
*   `lib/ory.ts` for Ory instance.
*   `lib/api.ts` for internal API calls.
*   `components/auth/AuthLayout`, `components/auth/AuthForm`.

## Potential Issues
*   The `window.location.href = ...` usage can cause a full page reload, potentially breaking Next.js SPA transitions.
*   State synchronization between Kratos UI node values and local `values` state might be brittle.
*   Error handling for `400` status codes (`err.response?.status === 400`) relies on Kratos returning a `LoginFlow` in the response body. If the response structure differs, the logic breaks.
