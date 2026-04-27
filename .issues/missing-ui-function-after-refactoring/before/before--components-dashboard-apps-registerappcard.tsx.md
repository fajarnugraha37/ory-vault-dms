# Specification: components/dashboard/apps/RegisterAppCard.tsx

## Overview
Card component for registering new OAuth2 clients.

## Functionality
*   **User Interface:**
    *   Form input for Application Name.
    *   "Initialize Provisioning" button.
    *   Post-registration view displaying generated Client ID and Client Secret.
*   **Behavior:**
    *   Registration triggers POST `/api/oauth2/clients`.
    *   Displays generated credentials only once immediately after creation.
    *   Callback `onCreated` triggers parent refresh.

## Logic & Data Handling
*   **State Management:**
    *   `name`: Application name input state.
    *   `createdClient`: Stores response of created client for one-time display.
    *   `loading`: Submission state.
*   **API Calls:**
    *   `POST /api/oauth2/clients`: Create OAuth2 client.

## Dependencies
*   `components/shared/VaultPrimitives`: UI layouts.
*   `components/ui/*`: `Input`, `Label`.
*   `lib/api`: API client.

## Potential Issues
*   Failure to securely store/copy the generated secret leaves the user in an unrecoverable state for that specific client (might need a way to regenerate).
*   UI only displays secret once; no recovery or viewing mechanism exists after closing.
