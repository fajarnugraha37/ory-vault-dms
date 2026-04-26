package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
)

func RequireDocumentPermission(kc *keto.Client, relation string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(UserIDKey).(string)
			if !ok {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			docID := chi.URLParam(r, "id")
			if docID == "" {
				// If no specific document ID is in URL, it's a global action (like list/upload).
				// Handlers are responsible for further authorization logic if needed.
				next.ServeHTTP(w, r)
				return
			}

			allowed, err := kc.CheckPermission(r.Context(), "Document", docID, relation, userID)
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
