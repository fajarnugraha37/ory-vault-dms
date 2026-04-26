package store

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

type Node struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Type            string  `json:"type"` // "folder" or "file"
	ParentID        *string `json:"parent_id"`
	OwnerID         string  `json:"owner_id"`
	CreatedBy       string  `json:"created_by"`
	UpdatedBy       string  `json:"updated_by"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
	DeletedAt       *string `json:"deleted_at,omitempty"`
	DeletedBy       *string `json:"deleted_by,omitempty"`
	IsDeleted       bool    `json:"is_deleted"`
	PublicLinkToken *string `json:"public_link_token,omitempty"`

	// File specific fields (from file_metadata)
	MimeType    *string `json:"mime_type,omitempty"`
	SizeBytes   *int64  `json:"size_bytes,omitempty"`
	StoragePath *string `json:"storage_path,omitempty"`
	Version     *int    `json:"version,omitempty"`

	UserPermission string `json:"user_permission,omitempty"`
}

func (s *Store) CreateNode(ctx context.Context, n *Node) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO app.nodes (id, name, type, parent_id, owner_id, created_by, updated_by, public_link_token)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err = tx.ExecContext(ctx, query, n.ID, n.Name, n.Type, n.ParentID, n.OwnerID, n.CreatedBy, n.UpdatedBy, n.PublicLinkToken)
	if err != nil {
		return err
	}

	if n.Type == "file" && n.MimeType != nil {
		queryMetadata := `
			INSERT INTO app.file_metadata (node_id, mime_type, size_bytes, storage_path, version)
			VALUES ($1, $2, $3, $4, $5)
		`
		_, err = tx.ExecContext(ctx, queryMetadata, n.ID, *n.MimeType, *n.SizeBytes, *n.StoragePath, *n.Version)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) GetNode(ctx context.Context, id string) (*Node, error) {
	query := `
		SELECT n.id, n.name, n.type, n.parent_id, n.owner_id, n.created_by, n.updated_by, n.created_at, n.updated_at, 
		       n.deleted_at, n.deleted_by, n.is_deleted, n.public_link_token,
		       fm.mime_type, fm.size_bytes, fm.storage_path, fm.version
		FROM app.nodes n
		LEFT JOIN app.file_metadata fm ON n.id = fm.node_id
		WHERE n.id = $1
	`
	var n Node
	var pID, delAt, delBy, pubTok, mime, sPath sql.NullString
	var size sql.NullInt64
	var ver sql.NullInt32

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&n.ID, &n.Name, &n.Type, &pID, &n.OwnerID, &n.CreatedBy, &n.UpdatedBy, &n.CreatedAt, &n.UpdatedAt,
		&delAt, &delBy, &n.IsDeleted, &pubTok,
		&mime, &size, &sPath, &ver,
	)
	if err != nil {
		return nil, err
	}

	if pID.Valid { n.ParentID = &pID.String }
	if delAt.Valid { n.DeletedAt = &delAt.String }
	if delBy.Valid { n.DeletedBy = &delBy.String }
	if pubTok.Valid { n.PublicLinkToken = &pubTok.String }
	if mime.Valid { n.MimeType = &mime.String }
	if size.Valid { n.SizeBytes = &size.Int64 }
	if sPath.Valid { n.StoragePath = &sPath.String }
	if ver.Valid { 
		v := int(ver.Int32)
		n.Version = &v 
	}

	return &n, nil
}

func (s *Store) ListNodes(ctx context.Context, ownerID string, parentID *string, sortBy, sortOrder string, limit, offset int, includeDeleted bool) ([]Node, error) {
	validSortFields := map[string]string{
		"name": "n.name",
		"date": "n.created_at",
		"type": "n.type",
		"size": "fm.size_bytes",
	}
	field, ok := validSortFields[sortBy]
	if !ok {
		field = "n.type DESC, n.name" 
	}
	if strings.ToUpper(sortOrder) != "ASC" {
		sortOrder = "DESC"
	}

	query := `
		SELECT n.id, n.name, n.type, n.parent_id, n.owner_id, n.created_by, n.updated_by, n.created_at, n.updated_at, 
		       n.deleted_at, n.deleted_by, n.is_deleted, n.public_link_token,
		       fm.mime_type, fm.size_bytes, fm.storage_path, fm.version
		FROM app.nodes n
		LEFT JOIN app.file_metadata fm ON n.id = fm.node_id
		WHERE n.owner_id = $1
	`
	args := []interface{}{ownerID}

	if parentID == nil {
		query += ` AND n.parent_id IS NULL`
	} else {
		query += ` AND n.parent_id = $2`
		args = append(args, *parentID)
	}

	if !includeDeleted {
		query += ` AND n.is_deleted = FALSE`
	}

	query += fmt.Sprintf(` ORDER BY %s %s LIMIT $%d OFFSET $%d`, field, sortOrder, len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanNodes(rows)
}

func (s *Store) ListNodesFiltered(ctx context.Context, permittedIDs []string, sortBy, sortOrder string, limit, offset int) ([]Node, error) {
	if len(permittedIDs) == 0 {
		return []Node{}, nil
	}

	validSortFields := map[string]string{
		"name": "n.name",
		"date": "n.created_at",
		"type": "n.type",
		"size": "fm.size_bytes",
	}
	field, ok := validSortFields[sortBy]
	if !ok {
		field = "n.type DESC, n.name"
	}
	if strings.ToUpper(sortOrder) != "ASC" {
		sortOrder = "DESC"
	}

	var placeholders []string
	var args []interface{}
	for i, id := range permittedIDs {
		placeholders = append(placeholders, "$"+strconv.Itoa(i+1))
		args = append(args, id)
	}

	query := fmt.Sprintf(`
		SELECT n.id, n.name, n.type, n.parent_id, n.owner_id, n.created_by, n.updated_by, n.created_at, n.updated_at, 
		       n.deleted_at, n.deleted_by, n.is_deleted, n.public_link_token,
		       fm.mime_type, fm.size_bytes, fm.storage_path, fm.version
		FROM app.nodes n
		LEFT JOIN app.file_metadata fm ON n.id = fm.node_id
		WHERE n.id IN (%s) AND n.is_deleted = FALSE
		ORDER BY %s %s LIMIT $%d OFFSET $%d
	`, strings.Join(placeholders, ","), field, sortOrder, len(args)+1, len(args)+2)

	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanNodes(rows)
}

func (s *Store) ListNodesByParent(ctx context.Context, parentID string, sortBy, sortOrder string, limit, offset int) ([]Node, error) {
	validSortFields := map[string]string{
		"name": "n.name",
		"date": "n.created_at",
		"type": "n.type",
		"size": "fm.size_bytes",
	}
	field, ok := validSortFields[sortBy]
	if !ok {
		field = "n.type DESC, n.name"
	}
	if strings.ToUpper(sortOrder) != "ASC" {
		sortOrder = "DESC"
	}

	query := fmt.Sprintf(`
		SELECT n.id, n.name, n.type, n.parent_id, n.owner_id, n.created_by, n.updated_by, n.created_at, n.updated_at, 
		       n.deleted_at, n.deleted_by, n.is_deleted, n.public_link_token,
		       fm.mime_type, fm.size_bytes, fm.storage_path, fm.version
		FROM app.nodes n
		LEFT JOIN app.file_metadata fm ON n.id = fm.node_id
		WHERE n.parent_id = $1 AND n.is_deleted = FALSE
		ORDER BY %s %s LIMIT $2 OFFSET $3
	`, field, sortOrder)

	rows, err := s.db.QueryContext(ctx, query, parentID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanNodes(rows)
}

func (s *Store) scanNodes(rows *sql.Rows) ([]Node, error) {
	var nodes []Node
	for rows.Next() {
		var n Node
		var pID, delAt, delBy, pubTok, mime, sPath sql.NullString
		var size sql.NullInt64
		var ver sql.NullInt32

		err := rows.Scan(
			&n.ID, &n.Name, &n.Type, &pID, &n.OwnerID, &n.CreatedBy, &n.UpdatedBy, &n.CreatedAt, &n.UpdatedAt,
			&delAt, &delBy, &n.IsDeleted, &pubTok,
			&mime, &size, &sPath, &ver,
		)
		if err != nil {
			return nil, err
		}

		if pID.Valid { n.ParentID = &pID.String }
		if delAt.Valid { n.DeletedAt = &delAt.String }
		if delBy.Valid { n.DeletedBy = &delBy.String }
		if pubTok.Valid { n.PublicLinkToken = &pubTok.String }
		if mime.Valid { n.MimeType = &mime.String }
		if size.Valid { n.SizeBytes = &size.Int64 }
		if sPath.Valid { n.StoragePath = &sPath.String }
		if ver.Valid { 
			v := int(ver.Int32)
			n.Version = &v 
		}

		nodes = append(nodes, n)
	}
	return nodes, nil
}

func (s *Store) RenameNode(ctx context.Context, id, newName, userID string) error {
	query := `UPDATE app.nodes SET name = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`
	_, err := s.db.ExecContext(ctx, query, newName, userID, id)
	return err
}

func (s *Store) MoveNode(ctx context.Context, id string, newParentID *string, userID string) error {
	query := `UPDATE app.nodes SET parent_id = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`
	_, err := s.db.ExecContext(ctx, query, newParentID, userID, id)
	return err
}

func (s *Store) SoftDeleteNode(ctx context.Context, id, userID string) error {
	query := `UPDATE app.nodes SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 OR parent_id = $2`
	_, err := s.db.ExecContext(ctx, query, userID, id)
	return err
}

func (s *Store) SetPublicLink(ctx context.Context, id, token string) error {
	query := `UPDATE app.nodes SET public_link_token = $1 WHERE id = $2`
	_, err := s.db.ExecContext(ctx, query, token, id)
	return err
}

func (s *Store) RevokePublicLink(ctx context.Context, id string) error {
	query := `UPDATE app.nodes SET public_link_token = NULL WHERE id = $1`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *Store) GetNodeByPublicLink(ctx context.Context, token string) (*Node, error) {
	query := `
		SELECT n.id, n.name, n.type, n.parent_id, n.owner_id, n.created_by, n.updated_by, n.created_at, n.updated_at, 
		       n.deleted_at, n.deleted_by, n.is_deleted, n.public_link_token,
		       fm.mime_type, fm.size_bytes, fm.storage_path, fm.version
		FROM app.nodes n
		LEFT JOIN app.file_metadata fm ON n.id = fm.node_id
		WHERE n.public_link_token = $1 AND n.is_deleted = FALSE
	`
	var n Node
	var pID, delAt, delBy, pubTok, mime, sPath sql.NullString
	var size sql.NullInt64
	var ver sql.NullInt32

	err := s.db.QueryRowContext(ctx, query, token).Scan(
		&n.ID, &n.Name, &n.Type, &pID, &n.OwnerID, &n.CreatedBy, &n.UpdatedBy, &n.CreatedAt, &n.UpdatedAt,
		&delAt, &delBy, &n.IsDeleted, &pubTok,
		&mime, &size, &sPath, &ver,
	)
	if err != nil {
		return nil, err
	}

	if pID.Valid { n.ParentID = &pID.String }
	if mime.Valid { n.MimeType = &mime.String }
	if size.Valid { n.SizeBytes = &size.Int64 }
	if sPath.Valid { n.StoragePath = &sPath.String }
	if ver.Valid { 
		v := int(ver.Int32)
		n.Version = &v 
	}

	return &n, nil
}

func (s *Store) UpdateFileMetadata(ctx context.Context, nodeID string, sizeBytes int64, storagePath string, version int, userID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil { return err }
	defer tx.Rollback()

	queryNode := `UPDATE app.nodes SET updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	if _, err := tx.ExecContext(ctx, queryNode, userID, nodeID); err != nil { return err }

	queryMeta := `UPDATE app.file_metadata SET size_bytes = $1, storage_path = $2, version = $3 WHERE node_id = $4`
	if _, err := tx.ExecContext(ctx, queryMeta, sizeBytes, storagePath, version, nodeID); err != nil { return err }

	return tx.Commit()
}
