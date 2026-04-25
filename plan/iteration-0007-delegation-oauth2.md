# Plan: Iteration 0007 - Delegation & 3rd Party Integration (Phase 3)

## Objective

Implement OAuth2 delegation using Ory Hydra to allow third-party applications to access the Document Management System (DMS) securely. This includes setting up the Login and Consent flows, configuring Oathkeeper to validate OAuth2 tokens, and verifying access with specific scopes.

## Proposed Tasks

### 1. Ory Hydra Configuration & Client Setup

- **Hydra Configuration**: Verify `contrib/config/hydra/hydra.yaml` is correctly configured to point to the Next.js UI for the Login and Consent endpoints (`urls.consent` and `urls.login`).
- **OAuth2 Client Registration**: Create a script or CLI command to register a test third-party OAuth2 client in Hydra with the `authorization_code` grant type and scopes `dms.read` and `dms.share`.

### 2. Next.js Consent UI Implementation

- **Consent Screen (`/auth/consent`)**: Implement the UI to handle Hydra's consent flow.
  - Parse the `consent_challenge` from the URL.
  - Fetch the requested scopes from Hydra's Admin API.
  - Display a form asking the user to grant access to the requested scopes (e.g., "App X wants to access your documents").
  - Submit the user's decision (accept/reject) back to Hydra and redirect to the final destination.
- **Login Provider Bridging**: Ensure the Kratos login flow correctly hands off back to Hydra when an `oauth2_login_challenge` is present.

### 3. Oathkeeper Configuration for OAuth2

- **Authenticator Setup**: Enable and configure the `oauth2_introspection` or `jwt` authenticator in `contrib/config/oathkeeper/oathkeeper.yaml` to validate access tokens issued by Hydra.
- **Access Rules Update**: Update `contrib/config/oathkeeper/rules.yaml` to allow backend API routes (e.g., `/api/<**>`) to be authenticated by *either* `cookie_session` (for first-party web UI) or `oauth2_introspection` (for third-party API clients).

### 4. Go Backend Scope Validation (Optional/Enhancement)

- **Scope Checking**: Read the granted scopes from the Oathkeeper forwarded headers (e.g., `X-Granted-Scopes`) to ensure the third-party client actually has the `dms.read` or `dms.share` scope before serving the request, acting as an additional layer of defense alongside Keto.

## Validation Strategy

1. **Consent Flow**: Initiate an OAuth2 Authorization Code flow (e.g., using Postman or a simple script). The browser should redirect to the Next.js login/consent screen and successfully return an authorization code.
2. **Token Issuance**: Exchange the authorization code for an Access Token via Hydra's token endpoint.
3. **API Access via Token**: Make a request to the protected Go Backend (`https://api.ory-vault.test/api/documents`) using the `Authorization: Bearer <token>` header.
4. **Verification**: Oathkeeper must validate the token with Hydra, inject the Signed JWT containing the authorizing user's `sub`, and the Go backend must return `200 OK` (assuming Keto permissions also pass).
