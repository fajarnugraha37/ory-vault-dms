# Specification: lib/ory.ts

## Overview
Ory Kratos client configuration.

## Functionality
*   **Initialization:**
    *   Creates an instance of `@ory/client`'s `FrontendApi`.
    *   Configures `basePath` to route through the Nginx gateway.
    *   Enables `withCredentials` for cross-origin cookie support.

## Behavior
*   Standard Kratos SDK initialization.

## Dependencies
*   `@ory/client`.

## Potential Issues
*   `basePath` is hardcoded to `https://auth.ory-vault.test`; must be changed for production or environment-specific deployments via `process.env`.
