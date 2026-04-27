# Specification: components/dashboard/apps/AppCard.tsx

## Overview
Card component displaying OAuth2 client details (ID, Secret, Scopes) in the Apps dashboard.

## Functionality
*   **User Interface:**
    *   Displays application name and badge.
    *   Provides copy-to-clipboard functionality for Client ID.
    *   Toggle for showing/masking Client Secret.
    *   "Delete" button.
*   **Behavior:**
    *   State-managed visibility for secret key.
    *   Clipboard interaction.

## Logic & Data Handling
*   **State Management:**
    *   `showSecret`: Boolean toggle for masking/unmasking secret key.

## Dependencies
*   `components/shared/VaultPrimitives`: `VaultCard`, `VaultButton`, `VaultBadge`.
*   `lucide-react`: Icons.
*   `sonner`: Toast notification.

## Potential Issues
*   Sensitive data (Client Secret) is temporarily in component state; though standard for client-side forms, ensure security posture is adequate.
