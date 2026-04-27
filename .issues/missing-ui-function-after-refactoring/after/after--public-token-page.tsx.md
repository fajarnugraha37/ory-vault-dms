# Specification: public/[token]/page.tsx

## Overview
The public page allows users to download shared files using a public link token, bypassing standard dashboard authentication for the specific shared resource.

## Functionality
*   **User Interface:**
    *   Centered card displaying file metadata (name, size, type).
    *   Download action button.
    *   Error state for invalid/expired tokens.
    *   Visual indicators (icons for file, security status).
*   **Navigation:**
    *   None.

## Behavior
*   Uses `useParams` to extract the `token` from the URL.
*   Fetches shared node details from `/public-api/nodes/:token` on mount.
*   Handles file download via `api.get` with `blob` response type.

## Logic & Data Handling
*   **State Management:**
    *   `node`: Shared resource details.
    *   `error`: Error message if token is invalid.
    *   `loading`: Boolean for initial fetch status.
*   **API Calls:**
    *   **GET** `/public-api/nodes/:token` (get node details).
    *   **GET** `/public-api/nodes/:token/download` (get file blob).
*   **Download Flow:**
    *   Creates a `Blob` from the response data, creates an object URL, triggers a hidden anchor download, and cleans up the temporary URL.

## Dependencies
*   `lib/api.ts`.
*   `components/shared/VaultPrimitives`.
*   `lib/utils.ts` (`formatBytes`).
*   `lucide-react`.
*   `framer-motion`.

## Potential Issues
*   The download logic creates a new blob URL in the browser memory for every download; ensure this doesn't cause leaks if users download many items without page refresh.
*   Relies on public-facing API endpoints (`/public-api/`); requires robust rate limiting and security measures on the backend side to prevent abuse.
*   Error handling for the download API might be simplistic.
