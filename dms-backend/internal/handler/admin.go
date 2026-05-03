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

func (h *AdminHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func (h *AdminHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

// --- Identities & Pagination ---

type identityResponse struct {
	ID            string                 `json:"id"`
	State         string                 `json:"state"`
	Traits        map[string]interface{} `json:"traits"`
	MetadataAdmin map[string]interface{} `json:"metadata_admin"`
	CreatedAt     string                 `json:"created_at"`
}

func (h *AdminHandler) ListIdentities(w http.ResponseWriter, r *http.Request) {
	pageSize, _ := strconv.ParseInt(r.URL.Query().Get("page_size"), 10, 64)
	if pageSize <= 0 { pageSize = 50 }
	pageToken := r.URL.Query().Get("page_token")
	if pageToken == "0" { pageToken = "" }
	
	data, nextPage, err := h.Kratos.ListIdentities(r.Context(), pageSize, pageToken)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }

	identities := make([]identityResponse, 0)
	for _, id := range data {
		state := ""
		if id.State != nil { state = string(*id.State) }
		
		traits, _ := id.Traits.(map[string]interface{})
		metadata, _ := id.MetadataAdmin.(map[string]interface{})
		if traits == nil { traits = make(map[string]interface{}) }
		if metadata == nil { metadata = make(map[string]interface{}) }

		identities = append(identities, identityResponse{
			ID:            id.Id,
			State:         state,
			Traits:        traits,
			MetadataAdmin: metadata,
			CreatedAt:     id.CreatedAt.String(),
		})
	}
	
	h.respondWithJSON(w, 200, map[string]interface{}{
		"identities": identities,
		"next_page_token": nextPage,
	})
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

// --- Lifecycle Actions ---

func (h *AdminHandler) PatchState(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var body struct{ State string `json:"state"` }
	json.NewDecoder(r.Body).Decode(&body)

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
	json.NewDecoder(r.Body).Decode(&traits)

	patch := []client.JsonPatch{{Op: "replace", Path: "/traits", Value: traits}}
	err := h.Kratos.PatchIdentity(r.Context(), id, patch)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.Store.SaveAuditLog(r.Context(), adminID, "UPDATE_TRAITS", id, "Identity traits updated", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) PatchMetadataAdmin(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var metadata map[string]interface{}
	json.NewDecoder(r.Body).Decode(&metadata)

	patch := []client.JsonPatch{{Op: "replace", Path: "/metadata_admin", Value: metadata}}
	err := h.Kratos.PatchIdentity(r.Context(), id, patch)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.Store.SaveAuditLog(r.Context(), adminID, "UPDATE_METADATA", id, "Identity metadata updated", r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) ImpersonateSubject(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	
	link, err := h.Kratos.CreateRecoveryLink(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }

	h.Store.SaveAuditLog(r.Context(), adminID, "IMPERSONATE", id, "Generated impersonation link", r.RemoteAddr, r.UserAgent())
	h.respondWithJSON(w, 200, link)
}

func (h *AdminHandler) SwitchIdentitySchema(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	var body struct{ SchemaID string `json:"schema_id"` }
	json.NewDecoder(r.Body).Decode(&body)

	patch := []client.JsonPatch{{Op: "replace", Path: "/schema_id", Value: body.SchemaID}}
	err := h.Kratos.PatchIdentity(r.Context(), id, patch)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }

	h.Store.SaveAuditLog(r.Context(), adminID, "SWITCH_SCHEMA", id, "Changed schema to "+body.SchemaID, r.RemoteAddr, r.UserAgent())
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) PostRecovery(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	link, err := h.Kratos.CreateRecoveryLink(r.Context(), id)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.Store.SaveAuditLog(r.Context(), adminID, "GENERATE_RECOVERY", id, "Recovery link generated", r.RemoteAddr, r.UserAgent())
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

// --- Bulk Operations ---

func (h *AdminHandler) BulkCleanupInactive(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	daysStr := r.URL.Query().Get("days")
	days, _ := strconv.Atoi(daysStr)
	if days <= 0 { days = 30 }

	identities, _, _ := h.Kratos.ListIdentities(r.Context(), 1000, "")
	count := 0
	
	for _, id := range identities {
		if id.State != nil && *id.State == "active" {
			patch := []client.JsonPatch{{Op: "replace", Path: "/state", Value: "inactive"}}
			h.Kratos.PatchIdentity(r.Context(), id.Id, patch)
			count++
		}
	}

	h.Store.SaveAuditLog(r.Context(), adminID, "BULK_CLEANUP", "system", "Deactivated subjects", r.RemoteAddr, r.UserAgent())
	h.respondWithJSON(w, 200, map[string]interface{}{"deactivated_count": count})
}

func (h *AdminHandler) BulkImportIdentities(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(middleware.UserIDKey).(string)
	var identities []struct {
		Traits map[string]interface{} `json:"traits"`
		Schema string                 `json:"schema_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&identities); err != nil {
		h.respondWithError(w, 400, "Invalid payload")
		return
	}

	count := 0
	for _, idData := range identities {
		schema := idData.Schema
		if schema == "" { schema = "default" }
		
		req := h.Kratos.GetAPI().IdentityAPI.CreateIdentity(r.Context()).CreateIdentityBody(client.CreateIdentityBody{
			SchemaId: schema,
			Traits:   idData.Traits,
		})

		_, _, err := req.Execute()
		if err == nil { count++ }
	}

	h.Store.SaveAuditLog(r.Context(), adminID, "BULK_IMPORT", "system", "Imported "+strconv.Itoa(count)+" identities", r.RemoteAddr, r.UserAgent())
	h.respondWithJSON(w, 200, map[string]interface{}{"imported_count": count})
}

// --- Sessions ---

func (h *AdminHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	pageSize, _ := strconv.ParseInt(r.URL.Query().Get("page_size"), 10, 64)
	if pageSize <= 0 { pageSize = 50 }
	pageToken := r.URL.Query().Get("page_token")

	data, err := h.Kratos.ListSessions(r.Context(), id, pageSize, pageToken)
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

// --- Audit ---

func (h *AdminHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 { limit = 50 }
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	logs, err := h.Store.GetAuditLogs(r.Context(), limit, offset)
	if err != nil { h.respondWithError(w, 500, err.Error()); return }
	h.respondWithJSON(w, 200, logs)
}

// --- RBAC Global Management ---

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
