package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/handler"
	"github.com/nugra/ory-vault/dms-backend/internal/hydra"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	internal_mw "github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/storage"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

func NewRouter(s *store.Store, k *kratos.Client, st *storage.Storage, kc *keto.Client, kf keyfunc.Keyfunc, hy *hydra.Client) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	docHandler := handler.NewDocumentHandler(s, st, kc, k)
	nodeHandler := handler.NewNodeHandler(s, st, kc, k)
	adminHandler := handler.NewAdminHandler(s, k)
	oauth2Handler := handler.NewOAuth2Handler(s, hy)

	// --- PUBLIC ROUTES ---
	r.Get("/api/public/documents/{token}", docHandler.DownloadPublicDocument)
	r.Get("/api/public/documents/{token}/metadata", docHandler.GetPublicMetadata)

	// OAuth2 Public Bridge (No AuthMiddleware)
	r.Get("/api/oauth2/login", oauth2Handler.GetLoginRequest)
	r.Get("/api/oauth2/consent", oauth2Handler.GetConsentRequest)

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("DEBUG 404: Route Not Found -> %s %s", r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Route not found in DMS Backend"})
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("OK")) })

	// --- PROTECTED ROUTES ---
	r.Route("/api", func(r chi.Router) {
		r.Use(internal_mw.AuthMiddleware(kf))
		
		r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value(internal_mw.UserIDKey).(string)
			roles, _ := s.GetUserRoles(r.Context(), userID)
			
			// Bootstrap admin check
			identity, err := k.GetIdentity(r.Context(), userID)
			if err == nil {
				traits, _ := identity.Traits.(map[string]interface{})
				email, _ := traits["email"].(string)
				if strings.HasSuffix(email, "@ory-vault.test") {
					isAdmin := false
					for _, r := range roles { if r == "admin" { isAdmin = true; break } }
					if !isAdmin { roles = append(roles, "admin") }
				}
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"user_id": userID,
				"roles":   roles,
				"message": "Verified",
			})
		})

		// OAuth2 Internal Bridge (Behind AuthMiddleware)
		r.Route("/oauth2", func(r chi.Router) {
			r.Post("/login/accept", oauth2Handler.AcceptLogin)
			r.Post("/consent/accept", oauth2Handler.AcceptConsent)
			r.Post("/clients", oauth2Handler.CreateClient)
			r.Get("/clients", oauth2Handler.ListClients)
			r.Delete("/clients/{clientId}", oauth2Handler.DeleteClient)
		})

		// Unified Nodes API
		r.Route("/nodes", func(r chi.Router) {
			r.Use(internal_mw.RequireScope(s))
			r.Post("/", nodeHandler.CreateFolder)
			r.Get("/", nodeHandler.ListNodes)
			r.With(internal_mw.RequirePermission(kc, "nodes", "view")).Get("/{id}/access", nodeHandler.ListNodeAccess)
			r.With(internal_mw.RequirePermission(kc, "nodes", "edit")).Put("/{id}/rename", nodeHandler.RenameNode)
			r.With(internal_mw.RequirePermission(kc, "nodes", "owner")).Put("/{id}/move", nodeHandler.MoveNode)
			r.With(internal_mw.RequirePermission(kc, "nodes", "owner")).Put("/{id}/restore", nodeHandler.RestoreNode)
			r.With(internal_mw.RequirePermission(kc, "nodes", "delete")).Delete("/{id}", nodeHandler.SoftDeleteNode)
			r.With(internal_mw.RequirePermission(kc, "nodes", "owner")).Post("/{id}/share", nodeHandler.ShareNode)
			r.With(internal_mw.RequirePermission(kc, "nodes", "owner")).Delete("/{id}/share/{userId}", nodeHandler.RevokeShareNode)
		})

		// Legacy Compatibility Aliases
		r.With(internal_mw.RequireScope(s)).Get("/folders", nodeHandler.ListNodes)
		r.With(internal_mw.RequireScope(s)).Post("/folders", nodeHandler.CreateFolder)

		// Document specific API (Upload/Download)
		r.Route("/documents", func(r chi.Router) {
			r.Use(internal_mw.RequireScope(s))
			r.Post("/", docHandler.UploadDocument)
			r.Get("/", nodeHandler.ListNodes) // Legacy list support
			r.With(internal_mw.RequirePermission(kc, "nodes", "view")).Get("/{id}/download", docHandler.DownloadDocument)
			r.With(internal_mw.RequirePermission(kc, "nodes", "view")).Get("/{id}/versions", docHandler.GetDocumentVersions)
			r.With(internal_mw.RequirePermission(kc, "nodes", "owner")).Post("/{id}/public-link", docHandler.GeneratePublicLink)
			r.With(internal_mw.RequirePermission(kc, "nodes", "owner")).Delete("/{id}/public-link", docHandler.RevokePublicLink)
		})
	})
	
	r.Route("/admin-api", func(r chi.Router) {
		r.Use(internal_mw.AuthMiddleware(kf))
		r.Use(internal_mw.AdminOnly(s, k))

		r.Get("/audit", adminHandler.GetAuditLogs)
		r.Get("/identities", adminHandler.ListIdentities)
		r.Post("/bulk/cleanup", adminHandler.BulkCleanupInactive)
		r.Post("/bulk/import", adminHandler.BulkImportIdentities)

		// --- RBAC Global Management ---
		r.Get("/roles", adminHandler.ListRoles)
		r.Post("/roles", adminHandler.CreateRole)
		r.Delete("/roles/{roleID}", adminHandler.DeleteRole)

		// --- Individual Identity Ops ---
		r.Get("/identities/{id}", adminHandler.GetIdentity)
		r.Delete("/identities/{id}", adminHandler.DeleteIdentity)
		r.Put("/identities/{id}/state", adminHandler.PatchState)
		r.Patch("/identities/{id}/traits", adminHandler.PatchTraits)
		r.Post("/identities/{id}/recovery", adminHandler.PostRecovery)
		r.Post("/identities/{id}/verify", adminHandler.PostVerify)
		r.Post("/identities/{id}/impersonate", adminHandler.ImpersonateSubject)
		r.Put("/identities/{id}/schema", adminHandler.SwitchIdentitySchema)
		
		// --- User Role Assignments ---
		r.Get("/identities/{id}/roles", adminHandler.GetUserRoles)
		r.Post("/identities/{id}/roles", adminHandler.AssignUserRole)
		r.Delete("/identities/{id}/roles/{roleID}", adminHandler.RemoveUserRole)
		
		// --- Session Management ---
		r.Get("/identities/{id}/sessions", adminHandler.ListSessions)
		r.Delete("/identities/{id}/sessions", adminHandler.RevokeAllSessions)
		r.Delete("/identities/{id}/sessions/{sid}", adminHandler.RevokeSession)
	})

	return r
}
