# Specification: dashboard/trash/page.tsx

## Overview
Management interface for soft-deleted nodes (Containment Zone).

## Functionality
*   **User Interface:**
    *   Table view of soft-deleted files/folders.
    *   "Restore" button for each item.
    *   Warning banner about garbage collection.
    *   Empty state when no deleted items.
*   **Navigation:**
    *   None specific.

## Behavior
*   Fetches soft-deleted nodes via `/api/nodes?show_deleted=true`.
*   Supports restoring nodes via `PUT /api/nodes/{id}/restore`.
*   Real-time update of the list after restore.

## Logic & Data Handling
*   **State Management:**
    *   `nodes`: Fetched via SWR.
*   **API Calls:**
    *   `GET /api/nodes?show_deleted=true`: Fetch deleted list.
    *   `PUT /api/nodes/{id}/restore`: Restore node.

## Dependencies
*   `swr`: Data fetching.
*   `lib/api`: API client.
*   `components/shared/VaultPrimitives`: UI layout.

## Potential Issues
*   Deletion of nodes might be permanent based on backend garbage collection policy, not just based on UI "trash".
*   Performance of fetching all nodes with `show_deleted=true` if trash grows large.
