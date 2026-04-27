# Specification: auth/consent/page.tsx

## Overview
The consent page handles OAuth2/OIDC consent flow, allowing users to grant or deny permissions requested by third-party applications.

## Functionality
*   **User Interface:**
    *   Displays a centralized card with the third-party application name.
    *   Lists the requested OAuth2/OIDC scopes.
    *   Provides "Allow Access" and "Deny" buttons.
    *   Displays loading indicators during API calls.
    *   Displays error states if the consent challenge is missing or invalid.
*   **Navigation:**
    *   Redirects to the application's callback URL upon successful approval.
    *   Redirects to an error page or home if access is denied or errors occur.
*   **Accessibility:**
    *   Standard UI card layout, clear action buttons.

## Behavior
*   Uses `useSearchParams` to retrieve `consent_challenge` from the URL.
*   Fetches consent details from `/api/oauth2/consent` on component mount.
*   Submits user decision to `/api/oauth2/consent/accept` upon user action.

## Logic & Data Handling
*   **State Management:**
    *   `request`: Stores OAuth2 consent request details (client name, scopes).
    *   `loading`: Boolean for UI feedback.
    *   `error`: String for error display.
*   **Form/Interaction:**
    *   Button click triggers `handleDecision` (accept/deny).
*   **API Calls:**
    *   **GET** `/api/oauth2/consent?consent_challenge=...`
        *   Success: Updates `request` state.
        *   Failure: Updates `error` state.
    *   **POST** `/api/oauth2/consent/accept`
        *   Body: `{ challenge: string, grant_scope: string[] }`
        *   Success: Redirects via `window.location.href`.
*   **Cookie/Local/Session Storage Handling:**
    *   Uses `withCredentials: true` with `axios` to leverage browser session cookies for Ory Kratos/Hydra session context.

## Dependencies
*   `axios` for API calls.
*   `next/navigation` for URL search params.
*   Local components: `Card`, `Button`, `Badge` (from `components/ui`).

## Potential Issues
*   The API base URL is hardcoded or relies on environment variables which might not be set correctly in the new theme deployment.
*   Missing `consent_challenge` in URL results in an error screen, which is correct but needs consistent handling.
*   Reliance on hard redirects (`window.location.href`) might need review if it conflicts with Next.js router transitions.
