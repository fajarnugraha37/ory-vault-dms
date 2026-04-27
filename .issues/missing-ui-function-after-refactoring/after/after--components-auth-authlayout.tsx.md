# Specification: components/auth/AuthLayout.tsx

## Overview
A consistent, high-aesthetic layout wrapper for all authentication-related pages in the DMS UI.

## Functionality
*   **User Interface:**
    *   Decorative brand header (Ory_Vault_Infrastructure).
    *   Centered `VaultCard` containing form content.
    *   Technical footer note ("End_to_End_Encrypted_Link").
*   **Accessibility:**
    *   Centered, balanced layout for focused auth interaction.

## Behavior
*   Uses `framer-motion` for entry animations.
*   Provides a standardized container for title, subtitle, and child content.

## Dependencies
*   `components/shared/VaultPrimitives` (`VaultCard`).
*   `framer-motion`.
*   `lucide-react` (Shield, Lock icons).

## Potential Issues
*   None.
