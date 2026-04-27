# Specification: context/VaultContext.tsx

## Overview
Central state management for the document management application, providing folder navigation, sorting, and data fetching (nodes).

## Functionality
*   **State Management:**
    *   `nodes`: Current list of vault items (fetched via SWR).
    *   `currentFolder`: ID of the current active folder (null for Root).
    *   `folderHistory`: Breadcrumb trail state.
    *   `sortBy`, `sortOrder`: Sorting preferences.
    *   `pageSize`, `offset`: Pagination state.
*   **Operations:**
    *   `navigateTo`: Updates current folder and breadcrumb history.
    *   `mutateNodes`: Trigger manual data refresh.
    *   `handleAction`: Wrapper for async API operations with automatic toast notifications and mutation.
    *   `toggleSort`: Cycle through sorting states.

## Behavior
*   Automatically fetches nodes using dynamically constructed URLs based on current folder, page settings, and whether the user is in the "trash" page.
*   Automatically resets `offset` to 0 when folder, tab, or sort settings change.
*   Synchronizes with user state via `/api/me`.

## Logic & Data Handling
*   **API Interactions:**
    *   **GET** `/api/nodes?limit=...&offset=...&sort_by=...&sort_order=...&parent_id=...`
*   **Dependencies:**
    *   `swr`.
    *   `lib/api.ts`.
    *   `sonner`.

## Potential Issues
*   The `pathname` detection in `useEffect` (or rather the root of the Provider) relies on `window.location.pathname` which might not be reactive to Next.js client-side navigation.
*   `VaultContext` holds a lot of state; ensure components consuming this context are memoized correctly to prevent unnecessary re-renders.
*   State reset for `offset` on dependency change is standard but might cause data flashing if not handled carefully by the UI components.
