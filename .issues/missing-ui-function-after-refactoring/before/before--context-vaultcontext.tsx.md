# Specification: context/VaultContext.tsx

## Overview
Global context provider managing vault nodes, navigation, pagination, sorting, and user metadata.

## Functionality
*   **Data Management:**
    *   `nodes`: SWR-managed node data.
    *   `folderHistory`: Breadcrumb state (array of IDs and names).
    *   `currentFolder`: ID of currently active directory.
    *   `sortBy`/`sortOrder`: Current table sorting configuration.
    *   `pageSize`/`offset`: Pagination state.
*   **Actions:**
    *   `navigateTo`: Updates `currentFolder` and `folderHistory`.
    *   `handleAction`: Helper for API execution with automatic toast handling and `mutateNodes`.
    *   `toggleSort`: Sorting state logic.

## Logic & Data Handling
*   **State Management:**
    *   Manages entire document browser state: history, sorting, filtering, and paging.
    *   Integrates with SWR to fetch from `/api/nodes`.
*   **Behavior:**
    *   Syncs node list whenever folder, tab, sort, or pagination states change via `useEffect`.

## Dependencies
*   `swr`: Data fetching.
*   `lib/api`: API client.

## Potential Issues
*   The `useEffect` trigger on `mutateNodes` is essential to keep SWR data fresh across navigation changes; verify `deps` array correctness.
*   If `currentFolder` becomes out-of-sync with `folderHistory`, navigation breaks.
