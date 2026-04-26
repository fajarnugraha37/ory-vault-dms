package handler

import (
	"encoding/json"
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

type NodeHandler struct {
	Store   *store.Store
	Storage *storage.Storage
	Keto    *keto.Client
	Kratos  *kratos.Client
}

func NewNodeHandler(s *store.Store, st *storage.Storage, kc *keto.Client, k *kratos.Client) *NodeHandler {
	return &NodeHandler{Store: s, Storage: st, Keto: kc, Kratos: k}
}

func (h *NodeHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func (h *NodeHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

// CreateFolder handles folder creation (Node type 'folder').
func (h *NodeHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
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
		allowed, err := h.Keto.CheckPermission(r.Context(), "nodes", *body.ParentID, "edit", userID)
		if err != nil || !allowed {
			h.respondWithError(w, http.StatusForbidden, "Access denied to parent folder")
			return
		}
	}

	nodeID := uuid.New().String()
	node := &store.Node{
		ID:        nodeID,
		Name:      body.Name,
		Type:      "folder",
		ParentID:  body.ParentID,
		OwnerID:   userID,
		CreatedBy: userID,
		UpdatedBy: userID,
	}

	if err := h.Store.CreateNode(r.Context(), node); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to create folder")
		return
	}

	h.Keto.CreateRelationship(r.Context(), "nodes", nodeID, "owner", userID)
	if node.ParentID != nil {
		h.Keto.CreateRelationship(r.Context(), "nodes", nodeID, "parent", *node.ParentID)
	}

	h.respondWithJSON(w, http.StatusCreated, node)
}

// ListNodes returns a unified list of folders and files.
func (h *NodeHandler) ListNodes(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	parentIDParam := r.URL.Query().Get("parent_id")
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 { limit = 50 }
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 { offset = 0 }

	var nodes []store.Node

	if parentIDParam != "" {
		// 1. Check access to the parent node
		parent, err := h.Store.GetNode(r.Context(), parentIDParam)
		if err != nil {
			h.respondWithError(w, http.StatusNotFound, "Parent not found")
			return
		}

		if parent.Type != "folder" {
			h.respondWithError(w, http.StatusBadRequest, "Parent must be a folder")
			return
		}

		var role string
		if parent.OwnerID == userID {
			role = "owner"
		} else {
			isEditor, _ := h.Keto.CheckPermission(r.Context(), "nodes", parentIDParam, "edit", userID)
			if isEditor {
				role = "editor"
			} else {
				isViewer, _ := h.Keto.CheckPermission(r.Context(), "nodes", parentIDParam, "view", userID)
				if isViewer {
					role = "viewer"
				} else {
					h.respondWithError(w, http.StatusForbidden, "Access denied")
					return
				}
			}
		}

		// 2. Fetch children
		nodes, err = h.Store.ListNodesByParent(r.Context(), parentIDParam, sortBy, sortOrder, limit, offset)
		if err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to list items")
			return
		}

		// 3. Enrich
		for i := range nodes {
			if nodes[i].OwnerID == userID {
				nodes[i].UserPermission = "owner"
			} else {
				nodes[i].UserPermission = role
			}
		}
	} else {
		// ROOT Listing
		ownedNodes, err := h.Store.ListNodes(r.Context(), userID, nil, sortBy, sortOrder, limit, offset, false)
		if err != nil {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to list owned items")
			return
		}
		for i := range ownedNodes {
			ownedNodes[i].UserPermission = "owner"
		}

		// Shared items
		relations, _ := h.Keto.ListRelationships(r.Context(), "nodes", "", userID)
		var permittedIDs []string
		idToRelation := make(map[string]string)
		for _, rel := range relations {
			permittedIDs = append(permittedIDs, rel.Object)
			idToRelation[rel.Object] = rel.Relation
		}

		sharedNodes, _ := h.Store.ListNodesFiltered(r.Context(), permittedIDs, sortBy, sortOrder, limit, offset)
		for i := range sharedNodes {
			sharedNodes[i].UserPermission = idToRelation[sharedNodes[i].ID]
		}

		// Merge and deduplicate
		nodeSet := make(map[string]store.Node)
		for _, n := range ownedNodes { nodeSet[n.ID] = n }
		for _, n := range sharedNodes {
			if _, exists := nodeSet[n.ID]; !exists {
				nodeSet[n.ID] = n
			}
		}

		for _, n := range nodeSet {
			// Only show if at root (parent is nil)
			if n.ParentID == nil || n.UserPermission != "owner" {
				nodes = append(nodes, n)
			}
		}
	}

	h.respondWithJSON(w, http.StatusOK, nodes)
}

func (h *NodeHandler) SoftDeleteNode(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Only owner can delete (soft-delete is destructive for the view)
	allowed, err := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "owner", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "Only the owner can delete this item")
		return
	}

	if err := h.Store.SoftDeleteNode(r.Context(), nodeID, userID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to delete item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *NodeHandler) RenameNode(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, err := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "edit", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to rename")
		return
	}

	var body struct { Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.Store.RenameNode(r.Context(), nodeID, body.Name, userID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to rename")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *NodeHandler) MoveNode(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// SECURITY: Only OWNER can move
	allowed, err := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "owner", userID)
	if err != nil || !allowed {
		h.respondWithError(w, http.StatusForbidden, "Only the owner can move this item")
		return
	}

	var body struct { ParentID *string `json:"parent_id"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if body.ParentID != nil {
		target, err := h.Store.GetNode(r.Context(), *body.ParentID)
		if err != nil || target.Type != "folder" {
			h.respondWithError(w, http.StatusBadRequest, "Target must be a valid folder")
			return
		}
		targetAllowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", *body.ParentID, "edit", userID)
		if !targetAllowed {
			h.respondWithError(w, http.StatusForbidden, "No permission to target folder")
			return
		}
	}

	oldNode, _ := h.Store.GetNode(r.Context(), nodeID)
	if err := h.Store.MoveNode(r.Context(), nodeID, body.ParentID, userID); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to move")
		return
	}

	if oldNode.ParentID != nil {
		h.Keto.DeleteRelationship(r.Context(), "nodes", nodeID, "parent", *oldNode.ParentID)
	}
	if body.ParentID != nil {
		h.Keto.CreateRelationship(r.Context(), "nodes", nodeID, "parent", *body.ParentID)
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *NodeHandler) ListNodeAccess(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "view", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "Access denied")
		return
	}

	relations, err := h.Keto.ListRelationships(r.Context(), "nodes", nodeID, "")
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to list access")
		return
	}

	identities, _, _ := h.Kratos.ListIdentities(r.Context(), 100, "")
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

func (h *NodeHandler) ShareNode(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "edit", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission to share")
		return
	}

	var body struct {
		Email    string `json:"email"`
		Relation string `json:"relation"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	identities, _, _ := h.Kratos.ListIdentities(r.Context(), 1000, "")
	var targetUserID string
	for _, ident := range identities {
		traits, _ := ident.Traits.(map[string]interface{})
		if traits["email"] == body.Email {
			targetUserID = ident.Id
			break
		}
	}

	if targetUserID == "" {
		h.respondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	h.Keto.CreateRelationship(r.Context(), "nodes", nodeID, body.Relation, targetUserID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *NodeHandler) RevokeShareNode(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userId")
	userID := r.Context().Value(middleware.UserIDKey).(string)

	allowed, _ := h.Keto.CheckPermission(r.Context(), "nodes", nodeID, "edit", userID)
	if !allowed {
		h.respondWithError(w, http.StatusForbidden, "No permission")
		return
	}

	var body struct { Relation string `json:"relation"` }
	json.NewDecoder(r.Body).Decode(&body)

	h.Keto.DeleteRelationship(r.Context(), "nodes", nodeID, body.Relation, targetUserID)
	w.WriteHeader(http.StatusNoContent)
}
