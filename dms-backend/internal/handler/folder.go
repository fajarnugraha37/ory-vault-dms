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

	var folders []store.Folder

	if parentIDParam != "" {
		// 1. Check access to the parent folder
		// Check owner first
		parent, err := h.Store.GetFolder(r.Context(), parentIDParam)
		if err != nil {
			h.respondWithError(w, http.StatusNotFound, "Parent folder not found")
			return
		}

		var role string
		if parent.OwnerID == userID {
			role = "owner"
		} else {
			// Check Keto for inherited or direct permission
			isEditor, _ := h.Keto.CheckPermission(r.Context(), "Folder", parentIDParam, "edit", userID)
			if isEditor {
				role = "editor"
			} else {
				isViewer, _ := h.Keto.CheckPermission(r.Context(), "Folder", parentIDParam, "view", userID)
				if isViewer {
					role = "viewer"
				} else {
					h.respondWithError(w, http.StatusForbidden, "Access denied to folder")
					return
				}
			}
		}

		// 2. Fetch all folders in this parent
		folders, err = h.Store.ListFoldersByParent(r.Context(), parentIDParam)
		if err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to list folders")
			return
		}

		// 3. Enrich with inherited role
		for i := range folders {
			if folders[i].OwnerID == userID {
				folders[i].UserPermission = "owner"
			} else {
				folders[i].UserPermission = role
			}
		}
	} else {
		// ROOT listing
		// 1. Fetch owned folders
		ownedFolders, err := h.Store.ListFolders(r.Context(), userID, nil)
		if err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to list owned folders")
			return
		}
		for i := range ownedFolders {
			ownedFolders[i].UserPermission = "owner"
		}

		// 2. Fetch directly shared folders
		relations, err := h.Keto.ListRelationships(r.Context(), "Folder", "", userID)
		if err != nil {
			log.Printf("KETO_ERROR: %v", err)
		}

		var permittedIDs []string
		idToRelation := make(map[string]string)
		for _, rel := range relations {
			permittedIDs = append(permittedIDs, rel.Object)
			idToRelation[rel.Object] = rel.Relation
		}

		sharedFolders, _ := h.Store.ListFoldersFiltered(r.Context(), permittedIDs, 100, 0)
		for i := range sharedFolders {
			sharedFolders[i].UserPermission = idToRelation[sharedFolders[i].ID]
		}

		// Merge
		folderSet := make(map[string]store.Folder)
		for _, f := range ownedFolders {
			folderSet[f.ID] = f
		}
		for _, f := range sharedFolders {
			// In Root, we only show shared folders that don't have a parent
			// OR if their parent is NOT accessible to the user (orphaned view).
			// For simplicity, we just check if it's already in the set.
			if _, exists := folderSet[f.ID]; !exists {
				folderSet[f.ID] = f
			}
		}

		for _, f := range folderSet {
			// Only show if at root
			if f.ParentID == nil || f.UserPermission != "owner" {
				folders = append(folders, f)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folders)
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
		if !ok {
			continue
		}
		email, _ := traits["email"].(string)
		if email == body.Email {
			targetUserID = ident.Id
			log.Printf("SHARE_DEBUG: Found target user %s for folder email %s", targetUserID, body.Email)
			break
		}
	}

	if targetUserID == "" {
		log.Printf("SHARE_DEBUG: User with email %s NOT FOUND in %d identities", body.Email, len(identities))
		h.respondWithError(w, http.StatusNotFound, "User with that email not found")
		return
	}

	log.Printf("SHARE_DEBUG: Creating Keto relation: Folder:%s # %s @ %s", folderID, body.Relation, targetUserID)
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

func (h *FolderHandler) ListFolderAccess(w http.ResponseWriter, r *http.Request) {
	folderID := chi.URLParam(r, "id")
	relations, err := h.Keto.ListRelationships(r.Context(), "Folder", folderID, "")
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to list access")
		return
	}

	identities, _, _ := h.Kratos.ListIdentities(r.Context(), 1000, "")
	idToEmail := make(map[string]string)
	for _, id := range identities {
		traits, ok := id.Traits.(map[string]interface{})
		if ok {
			email, _ := traits["email"].(string)
			idToEmail[id.Id] = email
		}
	}

	var accessList []map[string]string
	for _, rel := range relations {
		if rel.Subject.GetId() != "" {
			email := idToEmail[rel.Subject.GetId()]
			if email == "" {
				email = rel.Subject.GetId()
			}
			accessList = append(accessList, map[string]string{
				"user_id":  rel.Subject.GetId(),
				"email":    email,
				"relation": rel.Relation,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(accessList)
}
