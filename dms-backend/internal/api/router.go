package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/MicahParks/keyfunc/v3"
	"github.com/nugra/ory-vault/dms-backend/internal/handler"
	internal_mw "github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
)

func NewRouter(s *store.Store, k *kratos.Client, kf keyfunc.Keyfunc) http.Handler {
	r := chi.NewRouter()

	// Enterprise Standard Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Custom 404 Logging
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("DEBUG 404: Route Not Found -> %s %s", r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Route not found in DMS Backend"})
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("OK")) })

	// User Routes
	r.Route("/api", func(r chi.Router) {
		r.Use(internal_mw.AuthMiddleware(kf))
		r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value(internal_mw.UserIDKey).(string)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"user_id": userID, "message": "Verified"})
		})
	})

	h := handler.NewAdminHandler(s, k)
	
	// Admin API - FLAT ROUTES (Best Practice for explicit auditing)
	r.Route("/admin-api", func(r chi.Router) {
		r.Use(internal_mw.AuthMiddleware(kf))
		r.Use(internal_mw.AdminOnly(s, k))

		r.Get("/audit", h.GetAuditLogs)
		r.Get("/identities", h.ListIdentities)
		
		r.Get("/identities/{id}", h.GetIdentity)
		r.Delete("/identities/{id}", h.DeleteIdentity)
		r.Put("/identities/{id}/state", h.PatchState)
		r.Patch("/identities/{id}/traits", h.PatchTraits)
		r.Post("/identities/{id}/recovery", h.PostRecovery)
		r.Post("/identities/{id}/verify", h.PostVerify)
		
		r.Get("/identities/{id}/sessions", h.ListSessions)
		r.Delete("/identities/{id}/sessions", h.RevokeAllSessions)
		r.Delete("/identities/{id}/sessions/{sid}", h.RevokeSession)
	})

	return r
}
