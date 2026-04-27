# Specification: auth/recovery/page.tsx

## Overview
The recovery page handles the self-service account recovery process using Ory Kratos, allowing users to initiate a recovery flow and verify their identity via a code.

## Functionality
*   **User Interface:**
    *   Displays `AuthForm` dynamically generated from Ory Kratos UI nodes.
    *   Dynamic title/subtitle depending on whether a recovery code has been sent (verification step).
    *   Loading state during API interactions.
    *   Success state UI upon successful code submission.
*   **Navigation:**
    *   Allows abortion of the protocol by navigating back to `/auth/login`.
    *   Redirects to `/auth/settings` after successful recovery.
*   **Accessibility:**
    *   Clear step-based UI for recovery code input.

## Behavior
*   Initializes the browser recovery flow via Ory Kratos.
*   Transitions from email input to code verification based on Kratos flow state.
*   Displays success UI after successful code verification.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Stores current `RecoveryFlow`.
    *   `values`: Form input state.
    *   `loading`: Boolean for submission state.
    *   `success`: Boolean indicating if the recovery code was verified.
*   **Form Structure:**
    *   Dynamic fields based on Kratos nodes (email vs code).
*   **API Calls:**
    *   **GET** `/self-service/recovery/flows` (via Ory SDK `createBrowserRecoveryFlow`).
    *   **GET** `/self-service/recovery/flows` (via Ory SDK `getRecoveryFlow`).
    *   **POST** `/self-service/recovery` (via Ory SDK `updateRecoveryFlow`).
*   **Cookie/Local/Session Handling:**
    *   Ory Kratos session handled via cookies.

## Dependencies
*   `@ory/client` for Kratos SDK.
*   `lib/ory.ts`.
*   `components/auth/AuthLayout`, `components/auth/AuthForm`.
*   `components/shared/VaultPrimitives` (for `VaultButton`).
*   `sonner` for toast notifications.

## Potential Issues
*   The check `data.ui.messages?.find(m => m.id === 1060001)` is hardcoded based on a specific Kratos message ID; this might be fragile if Kratos updates its message IDs.
*   `window.location.href = "/auth/settings"` for redirecting after success could cause page reload.
*   State synchronization during the transition from email entry to code entry relies on Ory re-rendering the same component with different nodes.
