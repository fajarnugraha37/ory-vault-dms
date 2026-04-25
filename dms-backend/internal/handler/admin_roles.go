package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
)

// --- Role Management ---

func (h *AdminHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 { limit = 50 }
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	roles, err := h.Store.ListRoles(r.Context(), limit, offset)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.respondWithJSON(w, 200, roles)
}

func (h *AdminHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	var body struct {
		ID          string `json:"id"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, 400, "Invalid body")
		return
	}

	if err := h.Store.CreateRole(r.Context(), body.ID, body.Description); err != nil {
		h.respondWithError(w, 500, err.Error()); return
	}

	h.Store.SaveAuditLog(r.Context(), adminID, "CREATE_ROLE", body.ID, body.Description, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusCreated)
}

func (h *AdminHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	roleID := chi.URLParam(r, "roleID")

	if err := h.Store.DeleteRole(r.Context(), roleID); err != nil {
		h.respondWithError(w, 500, err.Error()); return
	}

	h.Store.SaveAuditLog(r.Context(), adminID, "DELETE_ROLE", roleID, "Role removed from system", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

// --- User Role Assignments ---

func (h *AdminHandler) GetUserRoles(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	roles, err := h.Store.GetUserRoles(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.respondWithJSON(w, 200, roles)
}

func (h *AdminHandler) AssignUserRole(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	userID := chi.URLParam(r, "id")
	var body struct {
		RoleID string `json:"role_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, 400, "Invalid body")
		return
	}

	if err := h.Store.AssignRole(r.Context(), userID, body.RoleID); err != nil {
		h.respondWithError(w, 500, err.Error()); return
	}

	h.Store.SaveAuditLog(r.Context(), adminID, "ASSIGN_ROLE", userID, "Assigned role: "+body.RoleID, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) RemoveUserRole(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	userID := chi.URLParam(r, "id")
	roleID := chi.URLParam(r, "roleID")

	if err := h.Store.RemoveRole(r.Context(), userID, roleID); err != nil {
		h.respondWithError(w, 500, err.Error()); return
	}

	h.Store.SaveAuditLog(r.Context(), adminID, "REMOVE_ROLE", userID, "Removed role: "+roleID, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}
