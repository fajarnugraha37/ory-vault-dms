# Specification: dashboard/apps/page.tsx

## Overview
Manage OAuth2 clients/applications (Module Registry) for third-party service integration.

## Functionality
*   **User Interface:**
    *   `RegisterAppCard`: UI for creating new OAuth2 clients.
    *   `AppCard` list: Displays active registered applications/identifiers.
    *   Empty state when no clients are registered.
*   **Navigation:**
    *   None (embedded in dashboard layout).

## Behavior
*   Fetches current OAuth2 clients from `/api/oauth2/clients`.
*   Supports deleting (deregistering) OAuth2 clients via `api.delete`.
*   Updates list after successful creation (triggered by callback) or deletion.

## Logic & Data Handling
*   **State Management:**
    *   `clients`: Managed via `useSWR` for real-time synchronization.
*   **API Calls:**
    *   `GET /api/oauth2/clients`: Retrieve client list.
    *   `DELETE /api/oauth2/clients/{id}`: Deregister/remove client.
*   **Form Structure:**
    *   Registration form contained within `RegisterAppCard` child component.

## Dependencies
*   `swr`: Data fetching/caching.
*   `lib/api`: API client.
*   `components/dashboard/apps/RegisterAppCard`: Creation UI.
*   `components/dashboard/apps/AppCard`: List item UI.

## Potential Issues
*   Relies on the backend to provide OAuth2 client CRUD.
*   No pagination logic observed; could become slow with many clients.
