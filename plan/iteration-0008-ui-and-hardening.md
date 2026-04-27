# Iteration 0008: UI Hardening & Production Readiness

## Status: COMPLETED ✅
**Date:** 2026-04-27

## Goal
Standardize the UI codebase using a modular Neo-Brutalist design language, implement Trash Management, and harden the system for production use.

## Completed Tasks
- [x] **Design Primitives**: Created `VaultPrimitives.tsx` (`VaultCard`, `VaultButton`, `VaultBadge`) in `src/components/shared/`.
- [x] **Global Layout**: Implemented a contextual `Navbar.tsx` and centralized `VaultProvider` (React Context).
- [x] **Modular Refactor**:
    - [x] **Documents**: Extracted Dialogs (Upload, Move, Share, Rename) and Table logic. Restored recursive breadcrumb navigation.
    - [x] **Apps**: Modularized registration and client listing. Preserved Credentials Reveal logic.
    - [x] **Admin**: Implemented multi-tab interface (Identities, Audit, Roles, Infra Ops).
    - [x] **Auth & Public**: Refactored all entry points to follow the project design standard.
- [x] **Trash Management**:
    - [x] **Backend**: Added `RestoreNode` API and `show_deleted` filter support.
    - [x] **UI**: Created a dedicated `/dashboard/trash` portal with restore functionality.
- [x] **Production Hardening**:
    - [x] **Session**: Implemented `useAuth` hook and Axios 401 interceptor.
    - [x] **Logging**: Full migration of Go backend to `slog` (Structured JSON Logging).
    - [x] **Security**: Locked all Docker images to specific versions. Hardened Nginx security headers.
    - [x] **RBAC**: Implemented strict `AdminOnly` middleware and UI-side access control.

## Post-Implementation Retrospective

### Issue 1: Admin Security Bypass & Lockout
- **Root Cause**: Middleware had a dangerous email suffix fallback for testing, while the `/api/me` endpoint didn't return roles, causing UI redirects for authorized admins.
- **Resolution**: Removed hardcoded fallbacks in middleware. Updated `/api/me` to return real DB roles and a secure bootstrap check for the primary domain.
- **Fix**: Added `AdminOnly` to the correct route group and updated frontend guard logic.

### Issue 2: CSRF & Token Mapping (403 Forbidden)
- **Root Cause**: The modular `AuthForm` didn't explicitly sync hidden CSRF tokens from Ory nodes into the form state.
- **Resolution**: Added a `useEffect` to `AuthForm` to automatically capture hidden input values.
- **Lesson Learned**: Identity providers like Kratos rely on stateful hidden tokens; modular forms must proactively scan for them.

### Issue 3: Protobuf Dependency Loop (Backend Build Failure)
- **Root Cause**: Attempted to use mismatched versions of Keto proto (`acl/v1alpha1` vs `relation_tuples/v1alpha2`).
- **Resolution**: Reverted to the stable `relation_tuples/v1alpha2` logic and performed a surgical `log` to `slog` replacement instead of a total rewrite.
- **Lesson Learned**: Never refactor working gRPC/Proto logic purely for logging without strict symbol verification.

### Issue 4: Next.js Prerender Crash
- **Root Cause**: Direct access to `me.roles` during SSG/Build time when the object was still undefined.
- **Resolution**: Added optional chaining and strict loading guards (`!meLoading && me`) before accessing deeply nested properties.

## Verification Results
- **Backend Build**: SUCCESS 
- **Frontend Build**: SUCCESS (Zero errors in 15 routes)
- **Security Check**: Non-admin access to `/admin-api` returns 403.
- **UX Audit**: Breadcrumbs, Move ROOT, and Public Signals are fully functional.
