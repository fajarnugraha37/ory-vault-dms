# Specification: public/[token]/page.tsx

## Overview
Public share page for accessing shared files via a unique token.

## Functionality
*   **User Interface:**
    *   Public view of shared node.
    *   Displays node metadata (name, size, type).
    *   Download button.
    *   Error state if token is invalid or expired.
*   **Behavior:**
    *   Fetches shared node data via public API `/public-api/nodes/{token}`.
    *   Downloads file content as a blob via `/public-api/nodes/{token}/download`.

## Logic & Data Handling
*   **State Management:**
    *   `node`: Shared node metadata.
    *   `error`: Error message.
    *   `loading`: Initial fetch status.
*   **API Calls:**
    *   `GET /public-api/nodes/{token}`: Fetch shared node details.
    *   `GET /public-api/nodes/{token}/download`: Download file content.

## Dependencies
*   `lib/api`: API client.
*   `components/shared/VaultPrimitives`: UI layout.
*   `lib/utils`: File format helpers.

## Potential Issues
*   Token expiration.
*   Invalid tokens.
*   Download failing due to large file size or network error.
