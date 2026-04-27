# Specification: lib/api.ts

## Overview
Core API client configuration using Axios and SWR fetcher wrapper for the DMS application.

## Functionality
*   **Axios Config:**
    *   Configures a shared `api` client with `withCredentials: true` (crucial for CORS/session cookies).
    *   Sets `baseURL` from `NEXT_PUBLIC_API_URL`.
*   **Interceptors:**
    *   Response interceptor handles 401 Unauthorized errors by showing a toast and redirecting to `/auth/login`.
*   **Utilities:**
    *   `fetcher`: SWR standard fetcher for GET requests.
    *   `useAuth`: Custom hook providing authentication status and user info.

## Behavior
*   Automatically redirects to login on session expiry (401).

## Logic & Data Handling
*   **Authentication:**
    *   `useAuth` hook uses `/api/me` for authentication status check.

## Dependencies
*   `axios`.
*   `swr`.
*   `sonner`.

## Potential Issues
*   Global interceptor redirection might interfere with certain protected routes or edge cases where 401s are intentional (e.g., polling).
*   Hard dependency on `window.location.href` for redirecting; if navigating within Next.js, `router.push` is preferred but full page reload might be intended for session reset.
*   `API_BASE_URL` fallback `https://api.ory-vault.test` is fine for local, but ensure production environment variables override it correctly.
