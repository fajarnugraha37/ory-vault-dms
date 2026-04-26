package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

type FolderHandler struct {
	Store  *store.Store
	Keto   *keto.Client
	Kratos *kratos.Client
}

func NewFolderHandler(s *store.Store, kc *keto.Client, k *kratos.Client) *FolderHandler {
	return &FolderHandler{Store: s, Keto: kc, Kratos: k}
}

func (h *FolderHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func (h *FolderHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var body struct {
		Name     string  `json:"name"`
		ParentID *string `json:"parent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if body.ParentID != nil && *body.ParentID != "" {
		allowed, err := h.Keto.CheckPermission(r.Context(), "Folder", *body.ParentID, "edit", userID)
		if err != nil || !allowed {
			h.respondWithError(w, http.StatusForbidden, "Access denied to parent folder")
			return
		}
	} else {
		body.ParentID = nil
	}

	folderID := uuid.New().String()
	folder := &store.Folder{
		ID:       folderID,
		Name:     body.Name,
		ParentID: body.ParentID,
		OwnerID:  userID,
	}

	if err := h.Store.CreateFolder(r.Context(), folder); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to create folder")
		return
	}

	h.Keto.CreateRelationship(r.Context(), "Folder", folderID, "owner", userID)
	if folder.ParentID != nil {
		h.Keto.CreateRelationship(r.Context(), "Folder", folderID, "parent", *folder.ParentID)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(folder)
}

func (h *FolderHandler) ListFolders(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	parentIDParam := r.URL.Query().Get("parent_id")
	var parentID *string
	if parentIDParam != "" {
		parentID = &parentIDParam
	}

	// 1. Fetch owned folders
	ownedFolders, err := h.Store.ListFolders(r.Context(), userID, parentID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to list folders")
		return
	}

	// 2. Fetch shared folders from Keto
	relations, err := h.Keto.ListRelationships(r.Context(), "Folder", "", userID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to check folder access")
		return
	}

	accessibleFolderIDs := make(map[string]bool)
	for _, rel := range relations {
		accessibleFolderIDs[rel.Object] = true
	}

	var permittedIDs []string
	for id := range accessibleFolderIDs {
		permittedIDs = append(permittedIDs, id)
	}

	sharedFolders, err := h.Store.ListFoldersFiltered(r.Context(), permittedIDs, 100, 0)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to list shared folders")
		return
	}

	// Merge unique
	folderSet := make(map[string]store.Folder)
	for _, f := range ownedFolders {
		folderSet[f.ID] = f
	}
	for _, f := range sharedFolders {
		if parentID == nil && f.ParentID != nil { continue }
		if parentID != nil && (f.ParentID == nil || *f.ParentID != *parentID) { continue }
		folderSet[f.ID] = f
	}

	var finalFolders []store.Folder
	for _, f := range folderSet {
		finalFolders = append(finalFolders, f)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(finalFolders)
}

func (h *FolderHandler) DeleteFolder(w http.ResponseWriter, r *http.Request) {
	folderID := chi.URLParam(r, "id")
	if err := h.Store.DeleteFolder(r.Context(), folderID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to delete folder")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *FolderHandler) RenameFolder(w http.ResponseWriter, r *http.Request) {
	folderID := chi.URLParam(r, "id")
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.Store.RenameFolder(r.Context(), folderID, body.Name); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to rename folder")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *FolderHandler) ShareFolder(w http.ResponseWriter, r *http.Request) {
	folderID := chi.URLParam(r, "id")
	var body struct {
		Email    string `json:"email"`
		Relation string `json:"relation"` // "viewer" or "editor"
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if body.Relation != "viewer" && body.Relation != "editor" {
		h.respondWithError(w, http.StatusBadRequest, "Relation must be viewer or editor")
		return
	}

	identities, _, err := h.Kratos.ListIdentities(r.Context(), 1000, "")
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to query identities")
		return
	}

	var targetUserID string
	for _, ident := range identities {
		traits, ok := ident.Traits.(map[string]interface{})
		if ok && traits["email"] == body.Email {
			targetUserID = ident.Id
			break
		}
	}

	if targetUserID == "" {
		h.respondWithError(w, http.StatusNotFound, "User with that email not found")
		return
	}

	if err := h.Keto.CreateRelationship(r.Context(), "Folder", folderID, body.Relation, targetUserID); err != nil {
		log.Printf("KETO_ERROR: Failed to share folder: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to share folder")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *FolderHandler) RevokeShareFolder(w http.ResponseWriter, r *http.Request) {
	folderID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userId")
	
	var body struct {
		Relation string `json:"relation"` // "viewer" or "editor"
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.Keto.DeleteRelationship(r.Context(), "Folder", folderID, body.Relation, targetUserID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to revoke share")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
