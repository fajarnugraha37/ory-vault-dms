package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
)

func RequirePermission(kc *keto.Client, namespace, relation string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(UserIDKey).(string)
			if !ok {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			objectID := chi.URLParam(r, "id")
			if objectID == "" {
				next.ServeHTTP(w, r)
				return
			}

			allowed, err := kc.CheckPermission(r.Context(), namespace, objectID, relation, userID)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Authorization check failed"})
				return
			}

			if !allowed {
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]string{"error": "Access denied by security policy"})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
