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
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/storage"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

type DocumentHandler struct {
	Store   *store.Store
	Storage *storage.Storage
	Keto    *keto.Client
}

func NewDocumentHandler(s *store.Store, st *storage.Storage, kc *keto.Client) *DocumentHandler {
	return &DocumentHandler{Store: s, Storage: st, Keto: kc}
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

	// Max 50 MB
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

	docID := uuid.New().String()
	storagePath := "documents/" + userID + "/" + docID + "/" + header.Filename
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// 1. Upload to MinIO
	_, err = h.Storage.UploadObject(r.Context(), storagePath, file, header.Size, mimeType)
	if err != nil {
		log.Printf("STORAGE_ERROR: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to upload file")
		return
	}

	// 2. Save metadata to Postgres
	doc := &store.Document{
		ID:          docID,
		Name:        header.Filename,
		OwnerID:     userID,
		MimeType:    mimeType,
		SizeBytes:   header.Size,
		StoragePath: storagePath,
	}

	if err := h.Store.CreateDocument(r.Context(), doc); err != nil {
		log.Printf("DB_ERROR: %v", err)
		// Cleanup MinIO if DB fails
		h.Storage.DeleteObject(context.Background(), storagePath)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to save metadata")
		return
	}

	// 3. Establish Ownership in Keto
	if err := h.Keto.CreateRelationship(r.Context(), "Document", docID, "owner", userID); err != nil {
		log.Printf("KETO_WARN: Failed to set ownership: %v", err)
		// We don't rollback the upload here, but this is a critical warning.
	}

	h.respondWithJSON(w, http.StatusCreated, doc)
}

// ListDocuments returns a paginated list of documents.
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	// For Phase C, we list all docs. Phase D will integrate Keto to filter by access.
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	docs, err := h.Store.ListDocuments(r.Context(), limit, offset)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to list documents")
		return
	}

	h.respondWithJSON(w, http.StatusOK, docs)
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

// ShareDocument adds a viewer or editor relationship in Keto.
func (h *DocumentHandler) ShareDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	
	var body struct {
		UserID   string `json:"user_id"`
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

	if err := h.Keto.CreateRelationship(r.Context(), "Document", docID, body.Relation, body.UserID); err != nil {
		log.Printf("KETO_ERROR: Failed to share document: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to share document")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
