package handler

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/storage"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

type DocumentHandler struct {
	Store   *store.Store
	Storage *storage.Storage
	Keto    *keto.Client
	Kratos  *kratos.Client
}

func NewDocumentHandler(s *store.Store, st *storage.Storage, kc *keto.Client, k *kratos.Client) *DocumentHandler {
	return &DocumentHandler{Store: s, Storage: st, Keto: kc, Kratos: k}
}

func (h *DocumentHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func (h *DocumentHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

// UploadDocument handles multipart file upload, saves to MinIO, and records metadata in Postgres.
func (h *DocumentHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "File too large")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Missing file")
		return
	}
	defer file.Close()

	folderIDParam := r.FormValue("folder_id")
	var folderID *string
	if folderIDParam != "" {
		folderID = &folderIDParam
	}

	docID := r.FormValue("document_id") // For updating an existing document
	isUpdate := docID != ""

	if isUpdate {
		// Verify edit access via Keto
		allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
		if err != nil || !allowed {
			h.respondWithError(w, http.StatusForbidden, "No permission to edit this document")
			return
		}
	} else {
		docID = uuid.New().String()
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	var versionNumber int = 1
	var oldDoc *store.Document
	if isUpdate {
		oldDoc, err = h.Store.GetDocument(r.Context(), docID)
		if err != nil {
			h.respondWithError(w, http.StatusNotFound, "Document not found")
			return
		}
		versionNumber = oldDoc.Version + 1
	}

	storagePath := "documents/" + userID + "/" + docID + "/v" + strconv.Itoa(versionNumber) + "_" + header.Filename

	// 1. Upload to MinIO
	_, err = h.Storage.UploadObject(r.Context(), storagePath, file, header.Size, mimeType)
	if err != nil {
		log.Printf("STORAGE_ERROR: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to upload file")
		return
	}

	// 2. Save metadata to Postgres
	if isUpdate {
		// Backup old version info
		dv := &store.DocumentVersion{
			ID:            uuid.New().String(),
			DocumentID:    docID,
			VersionNumber: oldDoc.Version,
			StoragePath:   oldDoc.StoragePath,
			SizeBytes:     oldDoc.SizeBytes,
		}
		h.Store.CreateDocumentVersion(r.Context(), dv)

		// Update main document
		if err := h.Store.UpdateDocumentVersion(r.Context(), docID, header.Size, storagePath, versionNumber); err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to update document metadata")
			return
		}
	} else {
		doc := &store.Document{
			ID:          docID,
			Name:        header.Filename,
			FolderID:    folderID,
			OwnerID:     userID,
			MimeType:    mimeType,
			SizeBytes:   header.Size,
			StoragePath: storagePath,
			Version:     1,
		}

		if err := h.Store.CreateDocument(r.Context(), doc); err != nil {
			log.Printf("DB_ERROR: %v", err)
			h.Storage.DeleteObject(context.Background(), storagePath)
			h.respondWithError(w, http.StatusInternalServerError, "Failed to save metadata")
			return
		}

		// 3. Establish Ownership in Keto
		if err := h.Keto.CreateRelationship(r.Context(), "Document", docID, "owner", userID); err != nil {
			log.Printf("KETO_WARN: Failed to set ownership: %v", err)
		}

		if folderID != nil {
			h.Keto.CreateRelationship(r.Context(), "Document", docID, "parent", *folderID)
		}
	}

	h.respondWithJSON(w, http.StatusCreated, map[string]interface{}{"id": docID, "version": versionNumber})
}

// ListDocuments returns a list of documents.
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	folderIDParam := r.URL.Query().Get("folder_id")
	var folderID *string
	if folderIDParam != "" {
		folderID = &folderIDParam
	}

	// 1. Fetch all direct relationships for this user in Keto
	relations, err := h.Keto.ListRelationships(r.Context(), "Document", "", userID)
	if err != nil {
		log.Printf("KETO_ERROR: Failed to list relationships: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to check access")
		return
	}

	accessibleDocs := make(map[string]bool)
	for _, rel := range relations {
		accessibleDocs[rel.Object] = true
	}

	var permittedIDs []string
	for id := range accessibleDocs {
		permittedIDs = append(permittedIDs, id)
	}

	// 2. Fetch owned documents from DB
	ownedDocs, err := h.Store.ListDocuments(r.Context(), userID, folderID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to list documents")
		return
	}

	// 3. Fetch shared documents from DB
	sharedDocs, err := h.Store.ListDocumentsFiltered(r.Context(), permittedIDs, 100, 0)
	if err != nil {
		log.Printf("DB_WARN: Failed to fetch shared docs: %v", err)
	}

	docSet := make(map[string]store.Document)
	for _, d := range ownedDocs {
		docSet[d.ID] = d
	}
	for _, d := range sharedDocs {
		// Logic: If user is at ROOT, show shared files that are either in ROOT
		// or shared directly to the user (even if they live in a folder the user doesn't see).
		if folderID != nil {
			if d.FolderID == nil || *d.FolderID != *folderID {
				continue
			}
		} else {
			// At Root: include if doc is in root OR if it's NOT owned by the user
			// (shared files appear at root if the folder structure is inaccessible).
			if d.FolderID != nil && d.OwnerID == userID {
				continue
			}
		}
		docSet[d.ID] = d
	}

	var finalDocs []store.Document
	for _, d := range docSet {
		finalDocs = append(finalDocs, d)
	}

	h.respondWithJSON(w, http.StatusOK, finalDocs)
}

// DownloadDocument streams the document from MinIO to the client.
func (h *DocumentHandler) DownloadDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")

	doc, err := h.Store.GetDocument(r.Context(), docID)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	// In Phase D, Keto check goes here!

	object, err := h.Storage.DownloadObject(r.Context(), doc.StoragePath)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to access storage")
		return
	}
	defer object.Close()

	stat, err := object.Stat()
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to read file info")
		return
	}

	w.Header().Set("Content-Disposition", "attachment; filename=\""+doc.Name+"\"")
	w.Header().Set("Content-Type", doc.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(stat.Size, 10))

	// Stream to client
	if _, err := io.Copy(w, object); err != nil {
		log.Printf("STREAM_ERROR: Client disconnected or stream failed: %v", err)
	}
}

// GetDocumentVersions returns all versions of a document.
func (h *DocumentHandler) GetDocumentVersions(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")

	versions, err := h.Store.GetDocumentVersions(r.Context(), docID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to fetch document versions")
		return
	}

	h.respondWithJSON(w, http.StatusOK, versions)
}

// DeleteDocument removes the document from MinIO and Postgres.
func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")

	doc, err := h.Store.GetDocument(r.Context(), docID)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	// 1. Delete from MinIO
	if err := h.Storage.DeleteObject(r.Context(), doc.StoragePath); err != nil {
		log.Printf("STORAGE_ERROR: Failed to delete from MinIO: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to delete file from storage")
		return
	}

	// 2. Delete metadata
	if err := h.Store.DeleteDocument(r.Context(), docID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to delete metadata")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ShareDocument adds a viewer or editor relationship in Keto based on email.
func (h *DocumentHandler) ShareDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")

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

	// Find the user by email
	// In a real system, Kratos provides search by traits via API (e.g. `?traits.email=...`).
	// Kratos Go Client `ListIdentities` doesn't easily expose trait filtering in older versions,
	// so we will fetch identities and filter locally (acceptable for this lab).
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
			log.Printf("SHARE_DEBUG: Found target user %s for email %s", targetUserID, body.Email)
			break
		}
	}

	if targetUserID == "" {
		log.Printf("SHARE_DEBUG: User with email %s NOT FOUND in %d identities", body.Email, len(identities))
		h.respondWithError(w, http.StatusNotFound, "User with that email not found")
		return
	}

	log.Printf("SHARE_DEBUG: Creating Keto relation: Document:%s # %s @ %s", docID, body.Relation, targetUserID)
	if err := h.Keto.CreateRelationship(r.Context(), "Document", docID, body.Relation, targetUserID); err != nil {
		log.Printf("KETO_ERROR: Failed to share document: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to share document")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) RevokeShareDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userId")

	var body struct {
		Relation string `json:"relation"` // "viewer" or "editor"
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.Keto.DeleteRelationship(r.Context(), "Document", docID, body.Relation, targetUserID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to revoke share")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) ListDocumentAccess(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	relations, err := h.Keto.ListRelationships(r.Context(), "Document", docID, "")
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
	h.respondWithJSON(w, http.StatusOK, accessList)
}

func (h *DocumentHandler) RenameDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.Store.RenameDocument(r.Context(), docID, body.Name); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to rename document")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) MoveDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	var body struct {
		FolderID *string `json:"folder_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.Store.MoveDocument(r.Context(), docID, body.FolderID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to move document")
		return
	}

	oldDoc, err := h.Store.GetDocument(r.Context(), docID)
	if err == nil && oldDoc.FolderID != nil {
		h.Keto.DeleteRelationship(r.Context(), "Document", docID, "parent", *oldDoc.FolderID)
	}
	if body.FolderID != nil {
		h.Keto.CreateRelationship(r.Context(), "Document", docID, "parent", *body.FolderID)
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) CopyDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	doc, err := h.Store.GetDocument(r.Context(), docID)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	// For simplicity, we just create a new DB entry pointing to the SAME storage path.
	// A robust system would duplicate the object in MinIO to prevent accidental deletion.
	newDocID := uuid.New().String()
	newDoc := &store.Document{
		ID:          newDocID,
		Name:        "Copy of " + doc.Name,
		FolderID:    doc.FolderID,
		OwnerID:     userID,
		MimeType:    doc.MimeType,
		SizeBytes:   doc.SizeBytes,
		StoragePath: doc.StoragePath, // Shared blob
		Version:     1,
	}

	if err := h.Store.CreateDocument(r.Context(), newDoc); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to copy document metadata")
		return
	}

	h.Keto.CreateRelationship(r.Context(), "Document", newDocID, "owner", userID)
	if newDoc.FolderID != nil {
		h.Keto.CreateRelationship(r.Context(), "Document", newDocID, "parent", *newDoc.FolderID)
	}

	h.respondWithJSON(w, http.StatusCreated, newDoc)
}

// GeneratePublicLink creates a unique, anonymous token for view-only access.
func (h *DocumentHandler) GeneratePublicLink(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	token := uuid.New().String()

	if err := h.Store.SetPublicLink(r.Context(), docID, token); err != nil {
		log.Printf("DB_ERROR: Failed to set public link: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to generate link")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"public_link_token": token})
}

// RevokePublicLink removes the anonymous access token.
func (h *DocumentHandler) RevokePublicLink(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")

	if err := h.Store.RevokePublicLink(r.Context(), docID); err != nil {
		log.Printf("DB_ERROR: Failed to revoke public link: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to revoke link")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DownloadPublicDocument streams the document using only the public token (no JWT needed).
func (h *DocumentHandler) DownloadPublicDocument(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	doc, err := h.Store.GetDocumentByPublicLink(r.Context(), token)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Invalid or expired link")
		return
	}

	object, err := h.Storage.DownloadObject(r.Context(), doc.StoragePath)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to access storage")
		return
	}
	defer object.Close()

	stat, err := object.Stat()
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to read file info")
		return
	}

	w.Header().Set("Content-Disposition", "attachment; filename=\""+doc.Name+"\"")
	w.Header().Set("Content-Type", doc.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(stat.Size, 10))

	if _, err := io.Copy(w, object); err != nil {
		log.Printf("STREAM_ERROR: Client disconnected or stream failed: %v", err)
	}
}
