# Specification: page.tsx (Root Landing Page)

## Overview
The root landing page serves as the entry point for the DMS application, focusing on security branding and directing users to authentication flows (Login/Registration).

## Functionality
*   **User Interface:**
    *   Hero section with system status indicator and value proposition.
    *   Call-to-Action (CTA) buttons: "Initialize_Access" (Login) and "Register_Node" (Registration).
    *   Bento-style feature grid showcasing core technologies (Ory Stack: Kratos, Keto, Oathkeeper).
    *   Technical footer with version information.
*   **Navigation:**
    *   Links to `/auth/login` and `/auth/registration`.

## Behavior
*   Uses `framer-motion` for entry animations.
*   Includes a visual representation of system architecture components.

## Logic & Data Handling
*   **State Management:**
    *   Stateless.
*   **Dependencies:**
    *   `components/shared/VaultPrimitives`.
    *   `framer-motion`.
    *   `lucide-react`.
    *   `next/link`.

## Potential Issues
*   Static page; needs to ensure that links are valid in the production deployment environment (base paths, etc).
*   The "System Status" is hardcoded as "Operational" and doesn't reflect real-time infrastructure state.
