package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

type AdminHandler struct {
	Store  *store.Store
	Kratos *kratos.Client
}

func NewAdminHandler(s *store.Store, k *kratos.Client) *AdminHandler {
	return &AdminHandler{Store: s, Kratos: k}
}

func (h *AdminHandler) ListIdentities(w http.ResponseWriter, r *http.Request) {
	data, err := h.Kratos.ListIdentities()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *AdminHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	logs, err := h.Store.GetAuditLogs(limit, offset)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func (h *AdminHandler) PatchState(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var body struct {
		State string `json:"state"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	status, err := h.Kratos.PatchIdentity(id, []map[string]interface{}{{"op": "replace", "path": "/state", "value": body.State}})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "UPDATE_STATE", id, "Changed state to "+body.State, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(status)
}

func (h *AdminHandler) PatchTraits(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var traits map[string]interface{}
	json.NewDecoder(r.Body).Decode(&traits)
	status, err := h.Kratos.PatchIdentity(id, []map[string]interface{}{{"op": "replace", "path": "/traits", "value": traits}})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "UPDATE_TRAITS", id, "Identity traits updated", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(status)
}

func (h *AdminHandler) PostRecovery(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	data, err := h.Kratos.CreateRecoveryLink(id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "GENERATE_RECOVERY", id, "Recovery link generated", r.RemoteAddr, r.UserAgent())
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *AdminHandler) PostVerify(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	patch := []map[string]interface{}{
		{"op": "replace", "path": "/verifiable_addresses/0/status", "value": "completed"},
		{"op": "replace", "path": "/verifiable_addresses/0/verified", "value": true},
	}
	status, err := h.Kratos.PatchIdentity(id, patch)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "MANUAL_VERIFY", id, "Email manually verified", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(status)
}

func (h *AdminHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	data, err := h.Kratos.ListSessions(id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *AdminHandler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	sid := chi.URLParam(r, "sid")
	status, err := h.Kratos.RevokeSession(id, sid)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "REVOKE_SESSION", id, "Revoked session "+sid, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(status)
}

func (h *AdminHandler) RevokeAllSessions(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	status, err := h.Kratos.RevokeAllSessions(id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "REVOKE_ALL_SESSIONS", id, "All sessions revoked", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(status)
}

func (h *AdminHandler) GetIdentity(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	identity, err := h.Kratos.GetIdentity(id)
	if err != nil {
		http.Error(w, err.Error(), 404)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(identity)
}

func (h *AdminHandler) DeleteIdentity(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	status, err := h.Kratos.DeleteIdentity(id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	h.Store.SaveAuditLog(adminID, "DELETE_IDENTITY", id, "Identity permanently deleted", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(status)
}
