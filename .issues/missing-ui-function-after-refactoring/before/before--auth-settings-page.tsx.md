# Specification: auth/settings/page.tsx

## Overview
Handle account settings, including profile trait updates and password changes using Ory Kratos.

## Functionality
*   **User Interface:**
    *   Auth layout with title "Identity Setup".
    *   Includes a `Navbar`.
    *   `AuthForm` for updating user identity attributes.
    *   Toast notifications for success/error.
*   **Navigation:**
    *   Redirects to `/auth/login` if unauthenticated.
    *   Link to return to dashboard.
*   **Accessibility:**
    *   Standard UI.

## Behavior
*   Retrieves settings flow via `ory.createBrowserSettingsFlow`.
*   Populates initial values from existing identity traits.
*   Submission sends updates to Kratos via `ory.updateSettingsFlow`.
*   Supports updating multiple identity traits/methods in one form.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Settings flow object.
    *   `values`: Input field values.
    *   `loading`: Processing state.
*   **API Calls:**
    *   **Ory API**: `createBrowserSettingsFlow`, `updateSettingsFlow`.
*   **Submission:**
    *   Filters input values based on UI nodes before submitting to Kratos to ensure compliance with identity schema.

## Dependencies
*   `@ory/client`: Flow objects.
*   `lib/ory`: Ory client.
*   `components/auth/*`: UI components.
*   `components/layout/Navbar`: Page layout navigation.
*   `sonner`: Notifications.

## Potential Issues
*   Filtering `values` might miss required fields if the logic is too restrictive.
*   Requires a valid user session cookie.
