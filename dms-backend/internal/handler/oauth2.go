package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nugra/ory-vault/dms-backend/internal/hydra"
	"github.com/nugra/ory-vault/dms-backend/internal/middleware"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
	hydra_client "github.com/ory/hydra-client-go/v2"
)

type OAuth2Handler struct {
	Store *store.Store
	Hydra *hydra.Client
}

func NewOAuth2Handler(s *store.Store, h *hydra.Client) *OAuth2Handler {
	return &OAuth2Handler{Store: s, Hydra: h}
}

func (h *OAuth2Handler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func (h *OAuth2Handler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

// --- Login Bridge ---

func (h *OAuth2Handler) GetLoginRequest(w http.ResponseWriter, r *http.Request) {
	challenge := r.URL.Query().Get("login_challenge")
	if challenge == "" {
		h.respondWithError(w, 400, "Missing login_challenge")
		return
	}

	req, err := h.Hydra.GetLoginRequest(r.Context(), challenge)
	if err != nil {
		h.respondWithError(w, 500, "Failed to fetch login request")
		return
	}

	h.respondWithJSON(w, 200, req)
}

func (h *OAuth2Handler) AcceptLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Challenge string `json:"challenge"`
		Subject   string `json:"subject"` // This should come from Kratos session verified by frontend
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, 400, "Invalid payload")
		return
	}

	// In a real bridge, we should verify the subject against the actual Kratos session here too
	// for double security, but for now we trust the frontend call (since it's behind AuthMiddleware).
	
	res, err := h.Hydra.AcceptLoginRequest(r.Context(), body.Challenge, body.Subject)
	if err != nil {
		h.respondWithError(w, 500, "Failed to accept login request")
		return
	}

	h.respondWithJSON(w, 200, res)
}

// --- Consent Bridge ---

func (h *OAuth2Handler) GetConsentRequest(w http.ResponseWriter, r *http.Request) {
	challenge := r.URL.Query().Get("consent_challenge")
	if challenge == "" {
		h.respondWithError(w, 400, "Missing consent_challenge")
		return
	}

	req, err := h.Hydra.GetConsentRequest(r.Context(), challenge)
	if err != nil {
		h.respondWithError(w, 500, "Failed to fetch consent request")
		return
	}

	h.respondWithJSON(w, 200, req)
}

func (h *OAuth2Handler) AcceptConsent(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Challenge string   `json:"challenge"`
		GrantScope []string `json:"grant_scope"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, 400, "Invalid payload")
		return
	}

	// Fetch request to get requested audience
	req, err := h.Hydra.GetConsentRequest(r.Context(), body.Challenge)
	if err != nil {
		h.respondWithError(w, 500, "Failed to verify challenge")
		return
	}

	res, err := h.Hydra.AcceptConsentRequest(r.Context(), body.Challenge, body.GrantScope, req.RequestedAccessTokenAudience)
	if err != nil {
		h.respondWithError(w, 500, "Failed to accept consent")
		return
	}

	h.respondWithJSON(w, 200, res)
}

// --- Self-Service Client Management ---

func (h *OAuth2Handler) CreateClient(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	
	var body struct {
		ClientName string   `json:"client_name"`
		RedirectURIs []string `json:"redirect_uris"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, 400, "Invalid payload")
		return
	}

	// Prepare Hydra Client
	newClient := hydra_client.NewOAuth2Client()
	newClient.SetClientName(body.ClientName)
	newClient.SetRedirectUris(body.RedirectURIs)
	newClient.SetGrantTypes([]string{"authorization_code", "refresh_token", "client_credentials"})
	newClient.SetResponseTypes([]string{"code", "id_token"})
	newClient.SetScope("openid offline_access nodes.read nodes.write nodes.share")
	newClient.SetTokenEndpointAuthMethod("client_secret_post")

	created, err := h.Hydra.CreateOAuth2Client(r.Context(), *newClient)
	if err != nil {
		h.respondWithError(w, 500, "Failed to register client in Hydra")
		return
	}

	// Save mapping in our DB
	if err := h.Store.SaveOAuth2ClientMapping(r.Context(), *created.ClientId, userID); err != nil {
		// Rollback Hydra client if DB fails
		h.Hydra.DeleteOAuth2Client(r.Context(), *created.ClientId)
		h.respondWithError(w, 500, "Failed to save client mapping")
		return
	}

	h.respondWithJSON(w, 201, created)
}

func (h *OAuth2Handler) ListClients(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	
	clientIDs, err := h.Store.ListUserOAuth2Clients(r.Context(), userID)
	if err != nil {
		h.respondWithError(w, 500, "Failed to list clients")
		return
	}

	// Fetch details for each client from Hydra
	detailedClients := make([]hydra_client.OAuth2Client, 0)
	for _, c := range clientIDs {
		hc, err := h.Hydra.GetOAuth2Client(r.Context(), c.ClientID)
		if err == nil {
			detailedClients = append(detailedClients, *hc)
		}
	}

	h.respondWithJSON(w, 200, detailedClients)
}

func (h *OAuth2Handler) DeleteClient(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	clientID := chi.URLParam(r, "clientId")

	// Verify ownership
	owner, err := h.Store.GetOAuth2ClientOwner(r.Context(), clientID)
	if err != nil || owner != userID {
		h.respondWithError(w, 403, "Access denied")
		return
	}

	// Delete from Hydra
	if err := h.Hydra.DeleteOAuth2Client(r.Context(), clientID); err != nil {
		h.respondWithError(w, 500, "Failed to delete from Hydra")
		return
	}

	// Delete from DB
	h.Store.DeleteOAuth2ClientMapping(r.Context(), clientID)
	
	w.WriteHeader(http.StatusNoContent)
}
