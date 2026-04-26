package handler

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

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

	var docs []store.Document

	if folderIDParam != "" {
		// 1. Check access to the parent folder
		parent, err := h.Store.GetFolder(r.Context(), folderIDParam)
		if err != nil {
			h.respondWithError(w, http.StatusNotFound, "Folder not found")
			return
		}

		var role string
		if parent.OwnerID == userID {
			role = "owner"
		} else {
			isEditor, _ := h.Keto.CheckPermission(r.Context(), "Folder", folderIDParam, "edit", userID)
			if isEditor {
				role = "editor"
			} else {
				isViewer, _ := h.Keto.CheckPermission(r.Context(), "Folder", folderIDParam, "view", userID)
				if isViewer {
					role = "viewer"
				} else {
					h.respondWithError(w, http.StatusForbidden, "Access denied to folder")
					return
				}
			}
		}

		// 2. Fetch all documents in this folder
		docs, err = h.Store.ListDocumentsByFolder(r.Context(), folderIDParam)
		if err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to list documents")
			return
		}

		// 3. Enrich with inherited role
		for i := range docs {
			if docs[i].OwnerID == userID {
				docs[i].UserPermission = "owner"
			} else {
				docs[i].UserPermission = role
			}
		}
	} else {
		// ROOT listing
		// 1. Fetch owned documents
		ownedDocs, err := h.Store.ListDocuments(r.Context(), userID, nil)
		if err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to list owned documents")
			return
		}
		for i := range ownedDocs {
			ownedDocs[i].UserPermission = "owner"
		}

		// 2. Fetch directly shared documents
		relations, err := h.Keto.ListRelationships(r.Context(), "Document", "", userID)
		if err != nil {
			log.Printf("KETO_ERROR: %v", err)
		}

		var permittedIDs []string
		idToRelation := make(map[string]string)
		for _, rel := range relations {
			permittedIDs = append(permittedIDs, rel.Object)
			idToRelation[rel.Object] = rel.Relation
		}

		sharedDocs, _ := h.Store.ListDocumentsFiltered(r.Context(), permittedIDs, 100, 0)
		for i := range sharedDocs {
			sharedDocs[i].UserPermission = idToRelation[sharedDocs[i].ID]
		}

		// Merge
		docSet := make(map[string]store.Document)
		for _, d := range ownedDocs {
			docSet[d.ID] = d
		}
		for _, d := range sharedDocs {
			if _, exists := docSet[d.ID]; !exists {
				docSet[d.ID] = d
			}
		}

		for _, d := range docSet {
			// Only show if at root
			if d.FolderID == nil || d.UserPermission != "owner" {
				docs = append(docs, d)
			}
		}
	}

	h.respondWithJSON(w, http.StatusOK, docs)
}

// DownloadDocument streams the document from MinIO to the client.
func (h *DocumentHandler) DownloadDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Verify access via Keto
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "view", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied to document")
		return
	}

	doc, err := h.Store.GetDocument(r.Context(), docID)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Document not found")
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

	// Stream to client
	if _, err := io.Copy(w, object); err != nil {
		log.Printf("STREAM_ERROR: Client disconnected or stream failed: %v", err)
	}
}

// GetDocumentVersions returns all versions of a document.
func (h *DocumentHandler) GetDocumentVersions(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Verify access via Keto
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "view", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied")
		return
	}

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
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Verify DELETE access via Keto (using 'edit' relation for now as proxy for management)
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to delete this document")
		return
	}

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

	// 3. Cleanup Keto
	_ = h.Keto.DeleteRelationship(r.Context(), "Document", docID, "owner", userID)

	w.WriteHeader(http.StatusNoContent)
}

// ShareDocument adds a viewer or editor relationship in Keto based on email.
func (h *DocumentHandler) ShareDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Only owner or those with edit access can share
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to share this document")
		return
	}

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
		if !ok { continue }
		email, _ := traits["email"].(string)
		if email == body.Email {
			targetUserID = ident.Id
			break
		}
	}

	if targetUserID == "" {
		h.respondWithError(w, http.StatusNotFound, "User with that email not found")
		return
	}

	if err := h.Keto.CreateRelationship(r.Context(), "Document", docID, body.Relation, targetUserID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to share document")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) RevokeShareDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userId")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Only those with edit access can revoke
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to modify access")
		return
	}

	var body struct {
		Relation string `json:"relation"` 
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
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Must have view access to see who else has access
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "view", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied")
		return
	}

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
			if email == "" { email = rel.Subject.GetId() }
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
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Verify edit access
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to rename")
		return
	}

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
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Verify edit access
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to move document")
		return
	}

	var body struct {
		FolderID *string `json:"folder_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// Verify access to target folder if provided
	if body.FolderID != nil {
		targetAllowed, err := h.Keto.CheckPermission(r.Context(), "Folder", *body.FolderID, "edit", userID)
		if err != nil || !targetAllowed {
			h.respondWithError(w, http.StatusForbidden, "No permission to target folder")
			return
		}
	}

	oldDoc, err := h.Store.GetDocument(r.Context(), docID)
	if err := h.Store.MoveDocument(r.Context(), docID, body.FolderID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to move document")
		return
	}

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

	// SECURITY: Verify view access to source
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "view", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied to source document")
		return
	}

	doc, err := h.Store.GetDocument(r.Context(), docID)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	newDocID := uuid.New().String()
	newDoc := &store.Document{
		ID:          newDocID,
		Name:        "Copy of " + doc.Name,
		FolderID:    doc.FolderID,
		OwnerID:     userID,
		MimeType:    doc.MimeType,
		SizeBytes:   doc.SizeBytes,
		StoragePath: doc.StoragePath, 
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
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Only those with edit access can create public links
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to manage public access")
		return
	}

	// Generate a secure random token (Signal)
	b := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Internal system error")
		return
	}
	token := fmt.Sprintf("sig_%x", b)

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
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Only those with edit access can revoke public links
	allowed, err := h.Keto.CheckPermission(r.Context(), "Document", docID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission")
		return
	}

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

	// SECURITY: Strictly require 'sig_' prefix. 
	// If it's a UUID or any other format, reject it immediately.
	if !strings.HasPrefix(token, "sig_") {
		h.respondWithError(w, http.StatusNotFound, "Security Signal Not Found")
		return
	}

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

func (h *DocumentHandler) GetPublicMetadata(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	if !strings.HasPrefix(token, "sig_") {
		h.respondWithError(w, http.StatusNotFound, "Signal Not Found")
		return
	}

	doc, err := h.Store.GetDocumentByPublicLink(r.Context(), token)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Link expired or invalid")
		return
	}

	// Only return non-sensitive fields
	h.respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"name":      doc.Name,
		"size":      doc.SizeBytes,
		"mime_type": doc.MimeType,
	})
}
