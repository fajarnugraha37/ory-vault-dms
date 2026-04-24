# PRODUCT BACKLOG: ORY-VAULT DMS

## EPIC 01: FOUNDATION & IDENTITY ISOLATION (Priority: Critical)

- **STORY-001**: Setup Postgres multi-schema (kratos, keto, hydra, app).
- **STORY-002**: Implement Kratos Identity Schema (Email, Name, Division).
- **STORY-003**: Configure Nginx Ingress for virtual domains (.test).

## EPIC 02: ZERO-TRUST EDGE ENFORCEMENT (Priority: High)

- **STORY-004**: Implement Oathkeeper as Identity-Aware Proxy.
- **STORY-005**: Global Access Rules for public vs protected routes.
- **STORY-006**: Header Injection (X-User-Id) from Proxy to Backend.

## EPIC 03: GRANULAR PERMISSIONS - ZANZIBAR MODEL (Priority: High)

- **STORY-007**: Define OPL (Ory Permission Language) for Document/Folder.
- **STORY-008**: Implement Go Backend gRPC Client for Keto.
- **STORY-009**: Build Sharing Logic (Insert relation tuples in Keto).

## EPIC 04: MARKETPLACE & OAUTH2 DELEGATION (Priority: Medium)

- **STORY-010**: Setup Hydra OAuth2 Issuer.
- **STORY-011**: Implement Login & Consent Provider logic in Go.
- **STORY-012**: 3rd Party Access via Scopes (dms.read).

## EPIC 05: IDENTITY-AWARE FRONTEND (Priority: Medium)

- **STORY-013**: Next.js Dashboard with Kratos Session detection.
- **STORY-014**: Dynamic UI elements based on Keto permissions.
