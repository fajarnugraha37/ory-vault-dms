# Specification: components/dashboard/apps/RegisterAppCard.tsx

## Overview
A registration form card for creating new OAuth2 clients, allowing users to provision new M2M communication identifiers.

## Functionality
*   **User Interface:**
    *   Form input for "Application_Name".
    *   Action button to "INITIALIZE_PROVISIONING".
    *   Post-registration display of `Client_ID` and `Client_Secret`.
    *   Acknowledgement step to clear the displayed secrets.
*   **Behavior:**
    *   Uses `api.post` to register a client with the provided name.
    *   Handles successful registration by displaying sensitive credentials.
    *   Displays toast notifications for success/failure.

## Logic & Data Handling
*   **State Management:**
    *   `name`: Form input state.
    *   `loading`: Boolean for registration state.
    *   `createdClient`: Stores response data (client_id, client_secret) upon successful registration.
*   **API Calls:**
    *   **POST** `/api/oauth2/clients` (provision client).

## Dependencies
*   `components/shared/VaultPrimitives` (`VaultCard`, `VaultButton`, `VaultBadge`).
*   `components/ui/input`, `components/ui/label`.
*   `lib/api.ts`.
*   `sonner` for toast notifications.

## Potential Issues
*   The component displays `Client_Secret` in plain text; while standard for initial generation, it requires immediate user acknowledgement before moving on.
*   No client validation (e.g., minimum length for name) before submission.
*   No persistent copy mechanism, relies on user manual action (copying the text).
