# Specification: dashboard/apps/page.tsx

## Overview
The Apps page (Module Registry) allows users to register and manage third-party OAuth2 clients for cross-infrastructure integration.

## Functionality
*   **User Interface:**
    *   Left column: `RegisterAppCard` for creating new OAuth2 clients.
    *   Right column: List of `AppCard` items for existing registered applications.
    *   Empty state display if no apps exist.
*   **Navigation:**
    *   Part of the dashboard layout accessed via the navbar.

## Behavior
*   Uses `useSWR` to fetch and list registered OAuth2 clients.
*   Supports deleting (deregistering) OAuth2 clients via `handleDelete`.
*   Triggers state revalidation (`mutate`) upon creation or deletion of clients.

## Logic & Data Handling
*   **State Management:**
    *   `clients`: List of registered OAuth2 clients fetched via SWR.
*   **API Calls:**
    *   **GET** `/api/oauth2/clients` (list clients).
    *   **DELETE** `/api/oauth2/clients/:id` (deregister client).
*   **Components:**
    *   `RegisterAppCard`: Handles creation (mutation passed as prop).
    *   `AppCard`: Handles individual client view and deletion.

## Dependencies
*   `swr` for data fetching.
*   `lib/api.ts`.
*   `components/layout/Navbar`.
*   `components/dashboard/apps/RegisterAppCard`, `components/dashboard/apps/AppCard`.
*   `framer-motion` for animations.

## Potential Issues
*   Relying on `/api/oauth2/clients` endpoint to manage Hydra clients directly; depends on the API implementation handling credentials security.
*   List order is not sorted/paginated; could become messy with many apps.
*   Registration and deletion logic are optimistic; if client creation/deletion fails on the backend, state might not properly reflect the actual database state if `mutate` isn't called after failure (though handled in success blocks).
