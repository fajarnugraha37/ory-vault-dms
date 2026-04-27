# Specification: auth/settings/page.tsx

## Overview
The settings page provides a user-facing interface for modifying account settings (e.g., password, profile traits) within the Ory Kratos ecosystem.

## Functionality
*   **User Interface:**
    *   Displays `AuthForm` populated with settings-specific Kratos UI nodes.
    *   Includes a `Navbar` for global navigation.
    *   Loading state indicators.
    *   Toast notifications for success/error events.
*   **Navigation:**
    *   Redirects to `/auth/login` if the user is unauthenticated (401).
    *   Allows navigating back to the dashboard.
*   **Accessibility:**
    *   Consistent UI layout, integrated within the `Navbar` scene.

## Behavior
*   Initializes the browser settings flow on mount.
*   Maps existing user traits (email, name, etc.) from Kratos nodes into form inputs.
*   Synchronizes profile/credential updates back to Kratos.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Stores current `SettingsFlow`.
    *   `values`: Form input state (filtered to match UI nodes).
    *   `loading`: Boolean for submission state.
*   **API Calls:**
    *   **GET** `/self-service/settings/flows` (via Ory SDK `createBrowserSettingsFlow`).
    *   **POST** `/self-service/settings` (via Ory SDK `updateSettingsFlow`).
*   **Cookie/Local/Session Handling:**
    *   Requires active session cookie (implicitly handled by Kratos flow).

## Dependencies
*   `@ory/client` for Kratos SDK.
*   `lib/ory.ts`.
*   `components/auth/AuthLayout`, `components/auth/AuthForm`, `components/layout/Navbar`.
*   `sonner` for toast notifications.

## Potential Issues
*   The `updateSettingsFlow` implementation hardcodes `method: "password"`, which might be incorrect if the settings flow also handles profile traits updates (should usually be `method: "profile"`).
*   Values filtering logic (`flow.ui.nodes.forEach(...)`) may be fragile if Kratos returns complex node structures (e.g., hidden fields).
*   401 error handling assumes the redirect to login works and that the user is not in an infinite loop if login fails.
