# Specification: dashboard/trash/page.tsx

## Overview
The Trash page (Containment Zone) displays soft-deleted nodes, providing a way for users to restore them before they are permanently purged.

## Functionality
*   **User Interface:**
    *   Table listing nodes currently in the containment zone.
    *   Display of node name and user/system who initiated the deletion.
    *   Restore action button for each node.
    *   Warning banner regarding periodic garbage collection.
*   **Navigation:**
    *   Accessed via the dashboard.

## Behavior
*   Uses `useSWR` to fetch deleted nodes (`/api/nodes?show_deleted=true`).
*   Restores individual nodes via `api.put` request.
*   Provides real-time table updates upon successful restoration.

## Logic & Data Handling
*   **State Management:**
    *   `nodes`: Fetched list of deleted items.
*   **API Calls:**
    *   **GET** `/api/nodes?show_deleted=true` (list nodes).
    *   **PUT** `/api/nodes/:id/restore` (restore node).
*   **Components:**
    *   `Navbar`.
    *   `VaultHeader`, `VaultCard`, `VaultButton`, `VaultBadge`.
    *   `lucide-react` icons (Trash2, RotateCcw, ShieldAlert).
    *   `framer-motion` for table row animations.

## Dependencies
*   `swr`.
*   `lib/api.ts`.
*   `components/layout/Navbar`.
*   `components/shared/VaultPrimitives`.
*   `components/ui/table`.
*   `sonner` for toast notifications.

## Potential Issues
*   The "garbage collection" warning is static; if there's no actual automatic cleanup job running in the backend, this message might be misleading.
*   No bulk restore or bulk permanent delete functionality (might be requested later).
*   Table UI doesn't show "Deleted at" timestamps, which might be helpful for users assessing how much time they have left before "purge."
