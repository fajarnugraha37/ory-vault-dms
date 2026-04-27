# Specification: dashboard/layout.tsx

## Overview
Layout wrapper for dashboard pages that provides global state via `VaultProvider`.

## Functionality
*   **Behavior:**
    *   Wraps children with `VaultProvider` to ensure all dashboard pages have access to document storage context, navigation state, and folder history.

## Logic & Data Handling
*   **Context:** Provides `VaultProvider` (context/VaultContext.tsx).

## Dependencies
*   `context/VaultContext`: Vault provider implementation.
