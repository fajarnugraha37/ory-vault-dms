package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	client "github.com/ory/kratos-client-go"
)

type AdminHandler struct {
	Store  *store.Store
	Kratos *kratos.Client
}

func NewAdminHandler(s *store.Store, k *kratos.Client) *AdminHandler {
	return &AdminHandler{Store: s, Kratos: k}
}

// Helpers for Enterprise Consistency
func (h *AdminHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func (h *AdminHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

func (h *AdminHandler) ListIdentities(w http.ResponseWriter, r *http.Request) {
	data, err := h.Kratos.ListIdentities(r.Context())
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.respondWithJSON(w, 200, data)
}

func (h *AdminHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 { limit = 50 }
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	logs, err := h.Store.GetAuditLogs(r.Context(), limit, offset)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.respondWithJSON(w, 200, logs)
}

func (h *AdminHandler) PatchState(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var body struct{ State string `json:"state"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, 400, "Invalid request body")
		return
	}

	patch := []client.JsonPatch{{Op: "replace", Path: "/state", Value: body.State}}
	err := h.Kratos.PatchIdentity(r.Context(), id, patch)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	
	h.Store.SaveAuditLog(r.Context(), adminID, "UPDATE_STATE", id, "Changed state to "+body.State, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) PatchTraits(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var traits map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&traits); err != nil {
		h.respondWithError(w, 400, "Invalid request body")
		return
	}

	patch := []client.JsonPatch{{Op: "replace", Path: "/traits", Value: traits}}
	err := h.Kratos.PatchIdentity(r.Context(), id, patch)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }

	h.Store.SaveAuditLog(r.Context(), adminID, "UPDATE_TRAITS", id, "Identity traits updated", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) PostRecovery(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	link, err := h.Kratos.CreateRecoveryLink(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	
	h.Store.SaveAuditLog(r.Context(), adminID, "GENERATE_RECOVERY", id, "Manual recovery link generated", r.RemoteAddr, r.UserAgent())
	h.respondWithJSON(w, 200, link)
}

func (h *AdminHandler) PostVerify(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	
	patch := []client.JsonPatch{
		{Op: "replace", Path: "/verifiable_addresses/0/status", Value: "completed"},
		{Op: "replace", Path: "/verifiable_addresses/0/verified", Value: true},
	}
	err := h.Kratos.PatchIdentity(r.Context(), id, patch)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }

	h.Store.SaveAuditLog(r.Context(), adminID, "MANUAL_VERIFY", id, "Email manually verified", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	data, err := h.Kratos.ListSessions(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.respondWithJSON(w, 200, data)
}

func (h *AdminHandler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	sid := chi.URLParam(r, "sid")
	
	err := h.Kratos.RevokeSession(r.Context(), sid)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	
	h.Store.SaveAuditLog(r.Context(), adminID, "REVOKE_SESSION", id, "Revoked session "+sid, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) RevokeAllSessions(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	
	err := h.Kratos.RevokeAllSessions(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }

	h.Store.SaveAuditLog(r.Context(), adminID, "REVOKE_ALL_SESSIONS", id, "All sessions revoked", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) GetIdentity(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	identity, err := h.Kratos.GetIdentity(r.Context(), id)
	if err != nil { h.respondWithError(w, 404, "Identity not found"); return }
	h.respondWithJSON(w, 200, identity)
}

func (h *AdminHandler) DeleteIdentity(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	err := h.Kratos.DeleteIdentity(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	
	h.Store.SaveAuditLog(r.Context(), adminID, "DELETE_IDENTITY", id, "Identity permanently deleted", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}
