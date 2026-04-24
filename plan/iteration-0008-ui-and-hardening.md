# Plan: Iteration 0008 - UI, Frontend Polish & Production Hardening (Phase 4)

## Objective

Finalize the user experience by polishing the Next.js frontend, implementing robust session expiry handling, utilizing SWR for efficient data fetching, and hardening the infrastructure and backend for a production-like environment.

## Proposed Tasks

### 1. Frontend Session Management (`useAuth` Hook)

- **Implement `useAuth` Hook**: Create a custom React hook in Next.js to monitor the session state.
- **Session Expiry Handling**: Implement an HTTP interceptor (via Axios or custom fetch wrapper) that catches `401 Unauthorized` responses.
- **User Notification**: When a session expires, immediately notify the user (e.g., via a Toast or Modal) indicating "Your session has expired" before redirecting them to `/auth/login`.

### 2. UI/UX Polish & SWR Integration

- **SWR Data Fetching**: Refactor all dashboard data fetching to use `useSWR`. Ensure proper cache invalidation/mutation after a user uploads a new document or shares a document.
- **Layout & Navigation**: Build a consistent application layout (`app/layout.tsx`) with a responsive sidebar/navbar.
- **Loading & Error States**: Implement Next.js `loading.tsx` and `error.tsx` for smooth transitions and graceful error handling during data fetching.
- **Tailwind CSS Styling**: Polish forms, buttons, tables, and modals to ensure a clean, professional, and accessible user interface.

### 3. Production Hardening (Infrastructure & Backend)

- **Image Versioning Audit**: Audit `docker-compose.yaml` to ensure absolutely no `:latest` tags are used for any image. Pin all images to specific versions.
- **Structured Logging (Go)**: Verify the Go backend implements structured JSON logging (e.g., using `slog` or `logrus`) and consistently injects the `X-User-Id` into log contexts for auditability.
- **Security Headers**: Add strict security headers (e.g., HSTS, Content-Security-Policy, X-Frame-Options) to the Nginx `vault-gateway` configuration.
- **Next.js SSG Safety Check**: Audit all Next.js pages to guarantee that no sensitive API calls are made during Server-Side Generation (SSG); ensure all authenticated requests happen purely on the client side (`useEffect` or `useSWR`).

## Validation Strategy

1. **Session Expiry Simulation**:
   - Log into the application.
   - Manually clear the `ory_vault_session` cookie via browser DevTools.
   - Attempt to navigate to a protected page or perform an action.
   - Verify the UI explicitly warns about session expiration and redirects to the login screen.
2. **SWR Mutation Test**:
   - Upload a new document.
   - Verify the document list updates instantly without requiring a full page reload, leveraging SWR's `mutate`.
3. **Log Audit**:
   - Inspect backend logs (`docker-compose logs vault-backend`) and verify they are formatted as valid JSON and include the `user_id` field on protected routes.
4. **Security Header Check**:
   - Run `curl -I http://ory-vault.test` and verify the presence of headers like `Strict-Transport-Security` and `X-Content-Type-Options`.
