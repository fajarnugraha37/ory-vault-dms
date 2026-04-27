# Specification: components/dashboard/apps/AppCard.tsx

## Overview
A UI card component for displaying individual OAuth2 client details in the dashboard, providing management actions like viewing/copying secrets and deleting the client.

## Functionality
*   **User Interface:**
    *   Displays application name and type badge.
    *   Shows `Client_Identifier` with copy-to-clipboard functionality.
    *   Shows `Secret_Key` with toggleable visibility (show/hide).
    *   Delete (deregister) action button.
    *   Security scope indicators.
*   **Navigation:**
    *   External links (placeholder).

## Behavior
*   Uses `useState` to manage `client_secret` visibility.
*   Uses `navigator.clipboard` for copy operations.
*   Triggers `onDelete` callback when the trash icon is clicked.

## Logic & Data Handling
*   **State Management:**
    *   `showSecret`: Boolean toggle for masking/unmasking client secret.
*   **Props:**
    *   `client`: Object containing `client_id`, `client_name`, `client_secret`, etc.
    *   `onDelete`: Callback to perform client removal.

## Dependencies
*   `components/shared/VaultPrimitives` (`VaultCard`, `VaultButton`, `VaultBadge`).
*   `lucide-react` (icons).
*   `sonner` for toast notifications.

## Potential Issues
*   Sensitive data (client secret) is passed as a prop; standard security practices would advise never displaying secrets if possible or only doing so on-demand via a backend request.
*   If the list of scopes is long, it might overflow the bottom section UI.
