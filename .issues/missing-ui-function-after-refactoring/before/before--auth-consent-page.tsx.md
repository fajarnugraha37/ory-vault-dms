# Specification: auth/consent/page.tsx

## Overview
Handle OAuth2 consent flow where users authorize third-party applications to access their resources.

## Functionality
*   **User Interface:**
    *   Displays consent challenge details (application name).
    *   Lists requested scopes/permissions.
    *   Provides "Allow Access" and "Deny" buttons.
    *   Displays loading indicators during API calls.
    *   Displays error card if fetching consent fails.
*   **Navigation:**
    *   Redirects to the URL provided by the Ory Hydra backend upon decision.
*   **Accessibility:**
    *   Uses semantic UI components. Keyboard-accessible buttons.

## Behavior
*   The page extracts `consent_challenge` from the URL search parameters.
*   It immediately fetches the consent request details from the Ory Hydra API (`/api/oauth2/consent`).
*   The user is shown the scopes requested and the client name.
*   Submitting the decision ("Allow" or "Deny") sends a POST request to `/api/oauth2/consent/accept` or rejection logic.
*   The backend returns a `redirect_to` URL, which the frontend uses to redirect the user to finish the OAuth2 flow.

## Logic & Data Handling
*   **State Management:**
    *   `consentRequest`: Stores OAuth2 challenge data.
    *   `loading`: Boolean for loading states.
    *   `error`: String for error messaging.
*   **API Calls:**
    *   **GET `/api/oauth2/consent?consent_challenge={challenge}`**
        *   Used to retrieve the consent request payload.
    *   **POST `/api/oauth2/consent/accept`**
        *   Sends `challenge` and `grant_scope` to accept/deny.
*   **Storage Handling:**
    *   Relies on secure session cookies (`withCredentials: true`) handled by the backend/browser to authorize requests to the API.

## Dependencies
*   `axios`: HTTP requests.
*   `next/navigation`: URL query params parsing.
*   `components/ui/*`: UI components (Card, Button, Badge, etc.).
*   `lucide-react`: Icons.

## Potential Issues
*   The `API_BASE_URL` is hardcoded with a fallback value; ensure it matches the actual runtime environment.
*   Missing `Suspense` boundary in parent for `useSearchParams` can cause hydration errors (handled by component wrapping).
*   Redirection logic assumes `redirect_to` is always present in response.
