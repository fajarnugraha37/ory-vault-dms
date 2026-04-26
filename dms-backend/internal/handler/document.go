package handler

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
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

// UploadDocument handles node creation for files or version updates.
func (h *DocumentHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	err := r.ParseMultipartForm(100 << 20)
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

	parentIDParam := r.FormValue("parent_id")
	var parentID *string
	if parentIDParam != "" {
		parentID = &parentIDParam
	}

	nodeID := r.FormValue("node_id") // For updating an existing document
	isUpdate := nodeID != ""

	if isUpdate {
		// Verify edit access via Keto
		allowed, err := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "edit", userID)
		if err != nil || !allowed {
			h.respondWithError(w, http.StatusForbidden, "No permission to update this document")
			return
		}
	} else {
		nodeID = uuid.New().String()
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	var versionNumber int = 1
	if isUpdate {
		oldNode, err := h.Store.GetNode(r.Context(), nodeID)
		if err != nil {
			h.respondWithError(w, http.StatusNotFound, "Document not found")
			return
		}
		if oldNode.Type != "file" {
			h.respondWithError(w, http.StatusBadRequest, "Target is not a file")
			return
		}
		versionNumber = *oldNode.Version + 1

		// Archive current version
		dv := &store.DocumentVersion{
			ID:            uuid.New().String(),
			DocumentID:    nodeID,
			VersionNumber: *oldNode.Version,
			StoragePath:   *oldNode.StoragePath,
			SizeBytes:     *oldNode.SizeBytes,
		}
		h.Store.CreateDocumentVersion(r.Context(), dv)
	}

	storagePath := "vault/" + userID + "/" + nodeID + "/v" + strconv.Itoa(versionNumber) + "_" + header.Filename

	// 1. Upload to MinIO
	_, err = h.Storage.UploadObject(r.Context(), storagePath, file, header.Size, mimeType)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to upload file")
		return
	}

	// 2. Save metadata
	if isUpdate {
		if err := h.Store.UpdateFileMetadata(r.Context(), nodeID, header.Size, storagePath, versionNumber, userID); err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to update metadata")
			return
		}
	} else {
		node := &store.Node{
			ID:          nodeID,
			Name:        header.Filename,
			Type:        "file",
			ParentID:    parentID,
			OwnerID:     userID,
			CreatedBy:   userID,
			UpdatedBy:   userID,
			MimeType:    &mimeType,
			SizeBytes:   &header.Size,
			StoragePath: &storagePath,
			Version:     &versionNumber,
		}

		if err := h.Store.CreateNode(r.Context(), node); err != nil {
			h.Storage.DeleteObject(context.Background(), storagePath)
			h.respondWithError(w, http.StatusInternalServerError, "Failed to create file node")
			return
		}

		// 3. Keto
		h.Keto.CreateRelationship(r.Context(), "nodes", nodeID, "owner", userID)
		if node.ParentID != nil {
			h.Keto.CreateRelationship(r.Context(), "nodes", nodeID, "parent", *node.ParentID)
		}
	}

	h.respondWithJSON(w, http.StatusCreated, map[string]interface{}{"id": nodeID, "version": versionNumber})
}

func (h *DocumentHandler) DownloadDocument(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "view", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied")
		return
	}

	node, err := h.Store.GetNode(r.Context(), nodeID)
	if err != nil || node.Type != "file" {
		h.respondWithError(w, http.StatusNotFound, "File not found")
		return
	}

	object, err := h.Storage.DownloadObject(r.Context(), *node.StoragePath)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to access storage")
		return
	}
	defer object.Close()

	w.Header().Set("Content-Disposition", "attachment; filename=\""+node.Name+"\"")
	w.Header().Set("Content-Type", *node.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(*node.SizeBytes, 10))

	io.Copy(w, object)
}

func (h *DocumentHandler) GetDocumentVersions(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "view", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied")
		return
	}

	versions, err := h.Store.GetDocumentVersions(r.Context(), nodeID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to fetch versions")
		return
	}

	h.respondWithJSON(w, http.StatusOK, versions)
}

func (h *DocumentHandler) GeneratePublicLink(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "edit", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission")
		return
	}

	b := make([]byte, 16)
	io.ReadFull(rand.Reader, b)
	token := fmt.Sprintf("sig_%x", b)

	if err := h.Store.SetPublicLink(r.Context(), nodeID, token); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to generate link")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"public_link_token": token})
}

func (h *DocumentHandler) RevokePublicLink(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "edit", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission")
		return
	}

	h.Store.RevokePublicLink(r.Context(), nodeID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) DownloadPublicDocument(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	if !strings.HasPrefix(token, "sig_") {
		h.respondWithError(w, http.StatusNotFound, "Invalid Signal")
		return
	}

	node, err := h.Store.GetNodeByPublicLink(r.Context(), token)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Invalid or expired link")
		return
	}

	object, err := h.Storage.DownloadObject(r.Context(), *node.StoragePath)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Storage access failed")
		return
	}
	defer object.Close()

	w.Header().Set("Content-Disposition", "attachment; filename=\""+node.Name+"\"")
	w.Header().Set("Content-Type", *node.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(*node.SizeBytes, 10))

	io.Copy(w, object)
}

func (h *DocumentHandler) GetPublicMetadata(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	if !strings.HasPrefix(token, "sig_") {
		h.respondWithError(w, http.StatusNotFound, "Invalid Signal")
		return
	}

	node, err := h.Store.GetNodeByPublicLink(r.Context(), token)
	if err != nil {
		h.respondWithError(w, http.StatusNotFound, "Invalid or expired link")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"name": node.Name,
		"size": *node.SizeBytes,
		"mime_type": *node.MimeType,
	})
}
