# Specification: auth/recovery/page.tsx

## Overview
Handle the user account recovery process (password reset) using Ory Kratos.

## Functionality
*   **User Interface:**
    *   Auth layout with title "Identity Recovery" or "Verify Code".
    *   Dynamic form using `AuthForm` based on Ory flow state (Email input -> Code input).
    *   Success message screen after recovery verification.
    *   "Abort Recovery" link.
*   **Navigation:**
    *   Redirects to `/auth/settings` after successful recovery code verification.
    *   Provides link to return to login.
*   **Accessibility:**
    *   Standard UI components via `AuthForm`.

## Behavior
*   Starts recovery flow via `ory.createBrowserRecoveryFlow`.
*   Submission sends recovery request (method: "code") to Kratos.
*   Upon receipt of verification message ID, updates UI to verify the code.
*   Shows specific success screen after code verification.

## Logic & Data Handling
*   **State Management:**
    *   `flow`: Recovery flow object from Ory.
    *   `values`: Form input state.
    *   `success`: Boolean for post-verification success state.
*   **API Calls:**
    *   **Ory API**: `createBrowserRecoveryFlow`, `updateRecoveryFlow`.
*   **Form Structure:**
    *   Dynamic form inputs provided by Ory Kratos `RecoveryFlow.ui.nodes`.
*   **Submission:**
    *   `onSubmit` triggers code-based recovery updates.

## Dependencies
*   `@ory/client`: Recovery flow objects.
*   `lib/ory`: Ory SDK.
*   `components/auth/*`: UI components.
*   `sonner`: Toast notifications for failures.

## Potential Issues
*   Ory messages might be hard to parse or state might not update cleanly.
*   The transition from email request to code verification requires the user to interact with email before the form changes.
