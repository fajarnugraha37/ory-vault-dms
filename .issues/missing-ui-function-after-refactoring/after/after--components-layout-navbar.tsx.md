# Specification: components/layout/Navbar.tsx

## Overview
Global navigation bar for the dashboard application, displaying organizational identity, navigation links, and user session controls.

## Functionality
*   **User Interface:**
    *   Application branding (Logo + Name).
    *   Dynamic navigation items (Vault, Apps, Trash, and conditionally Admin/Identity link).
    *   Current user subject identifier badge.
    *   Global logout action.
*   **Navigation:**
    *   Standard `next/link` navigation for dashboard sections.

## Behavior
*   Uses `usePathname` to determine active route for styling.
*   Uses `useSWR` to fetch `/api/me` to determine user roles and email.
*   Dynamic navigation menu: adds "Identity" link if user has `admin` role.
*   Triggers logout protocol via browser redirect through the Kratos/Hydra logout URL.

## Logic & Data Handling
*   **State Management:**
    *   Implicitly via route path and SWR cache.
*   **API Calls:**
    *   **GET** `/api/me` (user identity/roles).
    *   **GET** `/auth/logout/browser` (initiate logout).
*   **Context usage:**
    *   None (direct SWR usage).

## Dependencies
*   `next/navigation` (`usePathname`, `useRouter`).
*   `lucide-react` (icons).
*   `swr`.
*   `lib/api.ts`.
*   `framer-motion` (for active link indicator).

## Potential Issues
*   Logout assumes browser-based Kratos logout flow (`/auth/logout/browser`), which may need verification if Kratos updates its logout API.
*   Hard dependency on `/api/me` to correctly identify the current user; failure to fetch this will result in the generic "SUBJECT_00" label.
*   The "Identity" nav link depends entirely on client-side role check; while UI logic, server-side auth remains the primary security layer.
