# Specification: dashboard/layout.tsx

## Overview
Dashboard layout component acting as the context provider for the vault-related dashboard pages.

## Functionality
*   **Context Wrapping:**
    *   Wraps all child dashboard routes with `VaultProvider` to ensure consistent access to vault data, navigation, and state.

## Behavior
*   Simple wrapper.

## Dependencies
*   `context/VaultContext` (via `VaultProvider`).

## Potential Issues
*   None.
