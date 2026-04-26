package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

func RequireScope(s *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(ClaimsKey).(jwt.MapClaims)
			if !ok {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// 1. Resolve effective subject (Owner Mapping for Client Credentials)
			// If it's a client_credentials token, Hydra set sub = client_id.
			// If it's a cookie token, Oathkeeper set sub = identity_id.
			sub, _ := claims.GetSubject()
			
			// Check if sub is a client_id in our mapping
			ownerID, err := s.GetOAuth2ClientOwner(r.Context(), sub)
			if err == nil && ownerID != "" {
				// This is a service client (machine-to-machine)
				// Overwrite UserID in context with the owner's ID for Keto checks
				ctx := context.WithValue(r.Context(), UserIDKey, ownerID)
				r = r.WithContext(ctx)
			}

			// 2. Determine required scope based on method
			requiredScope := "nodes.read"
			method := r.Method
			if method == "POST" || method == "PUT" || method == "PATCH" {
				requiredScope = "nodes.write"
			}
			if method == "DELETE" {
				requiredScope = "nodes.write" // Or nodes.delete if we want to be granular
			}
			
			// Special case for sharing
			if strings.Contains(r.URL.Path, "/share") {
				requiredScope = "nodes.share"
			}

			// 3. Validate Scope presence
			// If 'session' claim exists, it's a first-party Kratos session from Oathkeeper.
			// These sessions have full internal access.
			if _, isSession := claims["session"]; isSession {
				next.ServeHTTP(w, r)
				return
			}

			// Otherwise, it's an OAuth2 token, check scopes.
			grantedScopesRaw, ok := claims["scp"]
			if !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]string{"error": "missing_scopes", "details": "OAuth2 token must contain scopes"})
				return
			}

			grantedScopes, ok := grantedScopesRaw.([]interface{})
			if !ok {
				// Handle case where it's a single string instead of list
				if scpStr, ok := grantedScopesRaw.(string); ok {
					if hasScope(scpStr, requiredScope) {
						next.ServeHTTP(w, r)
						return
					}
				}
			} else {
				for _, s := range grantedScopes {
					if scp, ok := s.(string); ok {
						if hasScope(scp, requiredScope) {
							next.ServeHTTP(w, r)
							return
						}
					}
				}
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "insufficient_scope", "required": requiredScope})
		})
	}
}

func hasScope(granted, required string) bool {
	// Simple exact match or wildcard if we implemented it
	return granted == required || granted == "nodes.*" || granted == "*"
}
