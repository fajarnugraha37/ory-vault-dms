# Specification: components/auth/AuthLayout.tsx

## Overview
Layout wrapper for authentication pages (login, registration, etc.).

## Functionality
*   **User Interface:**
    *   Centrally aligned auth card.
    *   Decorative brand header ("Ory_Vault_Infrastructure").
    *   Footer with encryption notice.
*   **Accessibility:**
    *   Standard layout wrapping children with consistent styling.

## Behavior
*   Provides consistent aesthetic across auth-related pages.

## Logic & Data Handling
*   **State Management:**
    *   N/A (Presentational component).

## Dependencies
*   `framer-motion`: Page entry animations.
*   `lucide-react`: Icons.
*   `components/shared/VaultPrimitives`: `VaultCard`.

## Potential Issues
*   Highly static, minimal risk.
