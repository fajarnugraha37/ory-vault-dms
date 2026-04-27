# Specification: components/layout/Navbar.tsx

## Overview
Main navigation component for the dashboard.

## Functionality
*   **User Interface:**
    *   Links to "Vault", "Apps", "Trash", and "Identity" (conditional for admins).
    *   Current session user identifier display.
    *   Logout button.
*   **Behavior:**
    *   Sticky positioning with backdrop blur.
    *   Highlights active link.
    *   Admin role checking via `/api/me`.
    *   Logout flow handles redirect to Kratos logout endpoint.

## Logic & Data Handling
*   **State Management:**
    *   `me`: SWR hook for current user info.
*   **API Calls:**
    *   `GET /api/me`: Get current user info.
    *   `GET /auth/logout/browser`: Get Kratos logout URL.

## Dependencies
*   `framer-motion`: Active link animation.
*   `lucide-react`: Icons.
*   `lib/api`: API client.

## Potential Issues
*   Conditional navigation rendering is tied to `me` fetch; if fetch hangs, nav might look incomplete.
