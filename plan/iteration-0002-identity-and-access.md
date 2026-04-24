# Plan: Iteration 0002 - Identity & Access Control (Phase 1)

## Objective
Implement the Identity & Access Control layer using Ory Kratos for authentication and Next.js for the UI Login/Registration flows, ensuring Oathkeeper enforces session checks for the backend API.

## Proposed Tasks
1. **Kratos Identity Schema Update**:
   - Update the Kratos Identity Schema (`contrib/config/kratos/identity.schema.json`) to capture `email`, `first_name`, `last_name`, and `division` as required by the PRD.
   - Update Kratos configuration (`contrib/config/kratos/kratos.yaml`) to map UI URLs for login, registration, error, etc., to the Next.js frontend (`http://ory-vault.test/login`, etc.).
2. **Frontend Authentication UI (Next.js)**:
   - Implement the Login Page (`src/app/login/page.tsx`).
   - Implement the Registration Page (`src/app/register/page.tsx`).
   - Implement a generic Auth Callback/Error handler.
   - Integrate `@ory/client` in Next.js to communicate with Kratos Public API (`auth.ory-vault.test`).
3. **Oathkeeper Enforcement & Routing Validation**:
   - Verify that Oathkeeper rules (`contrib/config/oathkeeper/rules.yaml`) properly protect the DMS Backend (`api.ory-vault.test`) by requiring a valid `cookie_session`.
   - Ensure the `X-User-Id` is properly injected via headers mutator.
4. **Backend Identity Verification (Go)**:
   - Implement an endpoint (e.g., `/api/me`) in the Go backend to echo the authenticated user's `X-User-Id` for end-to-end validation.

## Validation Strategy
- **Schema Validation**: Kratos container starts without errors with the new schema.
- **Unauthenticated Test**: Accessing `http://api.ory-vault.test/api/me` without a cookie returns `401 Unauthorized` directly from Oathkeeper.
- **Registration Flow**: A user can register via the Next.js UI, creating an identity in the `kratos` schema.
- **Login Flow**: Logging in on the UI sets a shared session cookie for `.ory-vault.test`.
- **Authenticated Test**: Accessing `http://api.ory-vault.test/api/me` with the session cookie returns HTTP 200 and the correct `X-User-Id`.