# Specification: lib/api.ts

## Overview
Axios API client and authentication helper utilities.

## Functionality
*   **API Client:**
    *   Configured Axios instance with base URL and credentials.
    *   Response interceptor to handle 401 Unauthorized errors (session expiration) by redirecting to login.
*   **Data Fetcher:**
    *   Standard SWR fetcher utility.
*   **useAuth Hook:**
    *   Custom hook for session/user status management using SWR.

## Behavior
*   Standardized error handling globally via interceptors.

## Dependencies
*   `axios`: HTTP client.
*   `swr`: Data fetching.
*   `sonner`: Error messaging.
