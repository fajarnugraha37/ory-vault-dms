package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/handler"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	internal_mw "github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/storage"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

func NewRouter(s *store.Store, k *kratos.Client, st *storage.Storage, kc *keto.Client, kf keyfunc.Keyfunc) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// --- PUBLIC ROUTES (Bypass ALL Middlewares) ---
	r.Get("/api/public/documents/{token}", handler.NewDocumentHandler(s, st, kc, k).DownloadPublicDocument)
	r.Get("/api/public/documents/{token}/metadata", handler.NewDocumentHandler(s, st, kc, k).GetPublicMetadata)

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("DEBUG 404: Route Not Found -> %s %s", r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Route not found in DMS Backend"})
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("OK")) })

	h := handler.NewAdminHandler(s, k)
	docHandler := handler.NewDocumentHandler(s, st, kc, k)
	folderHandler := handler.NewFolderHandler(s, st, kc, k)

	// --- PROTECTED ROUTES ---
	r.Route("/api", func(r chi.Router) {

		r.Use(internal_mw.AuthMiddleware(kf))
		
		r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value(internal_mw.UserIDKey).(string)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"user_id": userID, "message": "Verified"})
		})

		r.Route("/folders", func(r chi.Router) {
			r.Post("/", folderHandler.CreateFolder)
			r.Get("/", folderHandler.ListFolders)
			r.With(internal_mw.RequirePermission(kc, "Folder", "delete")).Delete("/{id}", folderHandler.DeleteFolder)
			r.With(internal_mw.RequirePermission(kc, "Folder", "edit")).Put("/{id}/rename", folderHandler.RenameFolder)
			r.With(internal_mw.RequirePermission(kc, "Folder", "view")).Get("/{id}/access", folderHandler.ListFolderAccess)
			r.With(internal_mw.RequirePermission(kc, "Folder", "owner")).Post("/{id}/share", folderHandler.ShareFolder)
			r.With(internal_mw.RequirePermission(kc, "Folder", "owner")).Delete("/{id}/share/{userId}", folderHandler.RevokeShareFolder)
		})

		r.Route("/documents", func(r chi.Router) {
			r.Post("/", docHandler.UploadDocument)
			r.Get("/", docHandler.ListDocuments)
			r.With(internal_mw.RequirePermission(kc, "Document", "view")).Get("/{id}/download", docHandler.DownloadDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "view")).Get("/{id}/versions", docHandler.GetDocumentVersions)
			r.With(internal_mw.RequirePermission(kc, "Document", "view")).Get("/{id}/access", docHandler.ListDocumentAccess)
			r.With(internal_mw.RequirePermission(kc, "Document", "delete")).Delete("/{id}", docHandler.DeleteDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "edit")).Put("/{id}/rename", docHandler.RenameDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "edit")).Put("/{id}/move", docHandler.MoveDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "view")).Post("/{id}/copy", docHandler.CopyDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "owner")).Post("/{id}/share", docHandler.ShareDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "owner")).Delete("/{id}/share/{userId}", docHandler.RevokeShareDocument)
			r.With(internal_mw.RequirePermission(kc, "Document", "owner")).Post("/{id}/public-link", docHandler.GeneratePublicLink)
			r.With(internal_mw.RequirePermission(kc, "Document", "owner")).Delete("/{id}/public-link", docHandler.RevokePublicLink)
		})
	})
	
	r.Route("/admin-api", func(r chi.Router) {
		r.Use(internal_mw.AuthMiddleware(kf))
		r.Use(internal_mw.AdminOnly(s, k))

		r.Get("/audit", h.GetAuditLogs)
		r.Get("/identities", h.ListIdentities)

		// --- RBAC Global Management ---
		r.Get("/roles", h.ListRoles)
		r.Post("/roles", h.CreateRole)
		r.Delete("/roles/{roleID}", h.DeleteRole)

		// --- Bulk Operations ---
		r.Post("/bulk/cleanup", h.BulkCleanupInactive)
		r.Post("/bulk/import", h.BulkImportIdentities)
		
		// --- Individual Identity Ops ---
		r.Get("/identities/{id}", h.GetIdentity)
		r.Delete("/identities/{id}", h.DeleteIdentity)
		r.Put("/identities/{id}/state", h.PatchState)
		r.Patch("/identities/{id}/traits", h.PatchTraits)
		r.Post("/identities/{id}/recovery", h.PostRecovery)
		r.Post("/identities/{id}/verify", h.PostVerify)
		r.Post("/identities/{id}/impersonate", h.ImpersonateSubject)
		r.Put("/identities/{id}/schema", h.SwitchIdentitySchema)
		
		// --- User Role Assignments ---
		r.Get("/identities/{id}/roles", h.GetUserRoles)
		r.Post("/identities/{id}/roles", h.AssignUserRole)
		r.Delete("/identities/{id}/roles/{roleID}", h.RemoveUserRole)
		
		// --- Session Management ---
		r.Get("/identities/{id}/sessions", h.ListSessions)
		r.Delete("/identities/{id}/sessions", h.RevokeAllSessions)
		r.Delete("/identities/{id}/sessions/{sid}", h.RevokeSession)
	})

	return r
}
