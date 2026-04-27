# Specification: page.tsx (root)

## Overview
Application landing page (Hero section + Feature showcase).

## Functionality
*   **User Interface:**
    *   Hero section with "Initialize_Access" and "Register_Node" links.
    *   Bento-style feature grid (Identity Assurance, Zero Trust, Zanzibar AuthZ, Enterprise API).
    *   System status/version info in footer.
*   **Navigation:**
    *   Links to `/auth/login` and `/auth/registration`.

## Behavior
*   Provides landing page for unauthenticated users.

## Dependencies
*   `components/shared/VaultPrimitives`: Layout components.
*   `lucide-react`: Icons.
*   `framer-motion`: Page animations.

## Potential Issues
*   Static page, minimal potential for failure.
