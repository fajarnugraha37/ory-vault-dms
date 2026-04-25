package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

type UserContextKey string

const UserIDKey UserContextKey = "user_id"

func AuthMiddleware(kf keyfunc.Keyfunc) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			token, err := jwt.Parse(strings.TrimPrefix(authHeader, "Bearer "), kf.Keyfunc)
			if err != nil || !token.Valid {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			claims, _ := token.Claims.(jwt.MapClaims)
			sub, _ := claims.GetSubject()
			ctx := context.WithValue(r.Context(), UserIDKey, sub)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminOnly(s *store.Store, k *kratos.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value(UserIDKey).(string)

			// 1. Check persistent RBAC
			isAdmin, err := s.HasRole(userID, "admin")
			if err == nil && isAdmin {
				next.ServeHTTP(w, r)
				return
			}

			// 2. Fallback: Check email suffix from Kratos (Legacy support for transition)
			identity, err := k.GetIdentity(userID)
			if err == nil {
				traits, ok := identity.Traits.(map[string]interface{})
				if ok {
					email, _ := traits["email"].(string)
					if strings.HasSuffix(email, "@ory-vault.test") || strings.HasSuffix(email, "@ory-vault.admin") {
						next.ServeHTTP(w, r)
						return
					}
				}
			}

			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "insufficient permissions"})
		})
	}
}
