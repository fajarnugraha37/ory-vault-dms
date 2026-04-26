package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"strconv"
	"strings"

	_ "github.com/lib/pq"
)

type Store struct {
	db *sql.DB
}

type AuditLog struct {
	ID        string          `json:"id"`
	Timestamp string          `json:"timestamp"`
	AdminID   string          `json:"admin_id"`
	Action    string          `json:"action"`
	TargetID  string          `json:"target_id"`
	Details   json.RawMessage `json:"details"`
	IP        string          `json:"ip_address"`
	UA        string          `json:"user_agent"`
}

type Role struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

func NewPostgresStore(dsn string) (*Store, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil { return nil, err }
	if err := db.Ping(); err != nil { return nil, err }
	return &Store{db: db}, nil
}

func (s *Store) SaveAuditLog(ctx context.Context, adminID, action, targetID string, details interface{}, ip, ua string) error {
	detailsJSON, _ := json.Marshal(details)
	query := `INSERT INTO enterprise.audit_logs (admin_id, action, target_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := s.db.ExecContext(ctx, query, adminID, action, targetID, detailsJSON, ip, ua)
	return err
}

func (s *Store) GetAuditLogs(ctx context.Context, limit, offset int) ([]AuditLog, error) {
	query := `SELECT id, timestamp, admin_id, action, COALESCE(target_id::text, ''), details, COALESCE(ip_address, ''), COALESCE(user_agent, '') 
	          FROM enterprise.audit_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`
	rows, err := s.db.QueryContext(ctx, query, limit, offset)
	if err != nil { return nil, err }
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var l AuditLog
		if err := rows.Scan(&l.ID, &l.Timestamp, &l.AdminID, &l.Action, &l.TargetID, &l.Details, &l.IP, &l.UA); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// --- RBAC: Roles ---

func (s *Store) CreateRole(ctx context.Context, id, description string) error {
	query := `INSERT INTO enterprise.roles (id, description) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET description = $2`
	_, err := s.db.ExecContext(ctx, query, id, description)
	return err
}

func (s *Store) ListRoles(ctx context.Context, limit, offset int) ([]Role, error) {
	query := `SELECT id, description FROM enterprise.roles ORDER BY id ASC LIMIT $1 OFFSET $2`
	rows, err := s.db.QueryContext(ctx, query, limit, offset)
	if err != nil { return nil, err }
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Description); err != nil { return nil, err }
		roles = append(roles, r)
	}
	return roles, nil
}

func (s *Store) DeleteRole(ctx context.Context, id string) error {
	query := `DELETE FROM enterprise.roles WHERE id = $1`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// --- RBAC: User Role Assignments ---

func (s *Store) AssignRole(ctx context.Context, userID, roleID string) error {
	query := `INSERT INTO enterprise.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := s.db.ExecContext(ctx, query, userID, roleID)
	return err
}

func (s *Store) RemoveRole(ctx context.Context, userID, roleID string) error {
	query := `DELETE FROM enterprise.user_roles WHERE user_id = $1 AND role_id = $2`
	_, err := s.db.ExecContext(ctx, query, userID, roleID)
	return err
}

func (s *Store) GetUserRoles(ctx context.Context, userID string) ([]string, error) {
	query := `SELECT role_id FROM enterprise.user_roles WHERE user_id = $1`
	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil { return nil, err }
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var r string
		if err := rows.Scan(&r); err != nil { return nil, err }
		roles = append(roles, r)
	}
	return roles, nil
}

func (s *Store) HasRole(ctx context.Context, userID, roleID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM enterprise.user_roles WHERE user_id = $1 AND role_id = $2)`
	err := s.db.QueryRowContext(ctx, query, userID, roleID).Scan(&exists)
	return exists, err
}

func (s *Store) Close() error {
	return s.db.Close()
}

// --- DMS: Documents & Folders ---

type Folder struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ParentID  *string `json:"parent_id"`
	OwnerID   string  `json:"owner_id"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type Document struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	FolderID        *string `json:"folder_id"`
	OwnerID         string  `json:"owner_id"`
	MimeType        string  `json:"mime_type"`
	SizeBytes       int64   `json:"size_bytes"`
	StoragePath     string  `json:"storage_path"`
	Version         int     `json:"version"`
	PublicLinkToken *string `json:"public_link_token"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

type DocumentVersion struct {
	ID            string `json:"id"`
	DocumentID    string `json:"document_id"`
	VersionNumber int    `json:"version_number"`
	StoragePath   string `json:"storage_path"`
	SizeBytes     int64  `json:"size_bytes"`
	CreatedAt     string `json:"created_at"`
}

func (s *Store) CreateFolder(ctx context.Context, f *Folder) error {
	query := `
		INSERT INTO app.folders (id, name, parent_id, owner_id)
		VALUES ($1, $2, $3, $4)
	`
	_, err := s.db.ExecContext(ctx, query, f.ID, f.Name, f.ParentID, f.OwnerID)
	return err
}

func (s *Store) ListFolders(ctx context.Context, ownerID string, parentID *string) ([]Folder, error) {
	query := `SELECT id, name, parent_id, owner_id, created_at, updated_at FROM app.folders WHERE owner_id = $1`
	var rows *sql.Rows
	var err error
	
	if parentID == nil {
		query += ` AND parent_id IS NULL ORDER BY created_at DESC`
		rows, err = s.db.QueryContext(ctx, query, ownerID)
	} else {
		query += ` AND parent_id = $2 ORDER BY created_at DESC`
		rows, err = s.db.QueryContext(ctx, query, ownerID, parentID)
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []Folder
	for rows.Next() {
		var f Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.OwnerID, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, nil
}

func (s *Store) GetFolder(ctx context.Context, id string) (*Folder, error) {
	query := `SELECT id, name, parent_id, owner_id, created_at, updated_at FROM app.folders WHERE id = $1`
	var f Folder
	err := s.db.QueryRowContext(ctx, query, id).Scan(&f.ID, &f.Name, &f.ParentID, &f.OwnerID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *Store) RenameFolder(ctx context.Context, id, newName string) error {
	query := `UPDATE app.folders SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := s.db.ExecContext(ctx, query, newName, id)
	return err
}

func (s *Store) DeleteFolder(ctx context.Context, id string) error {
	query := `DELETE FROM app.folders WHERE id = $1`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *Store) ListFoldersFiltered(ctx context.Context, permittedFolderIDs []string, limit, offset int) ([]Folder, error) {
	if len(permittedFolderIDs) == 0 {
		return []Folder{}, nil
	}

	var placeholders []string
	var args []interface{}
	for i, id := range permittedFolderIDs {
		placeholders = append(placeholders, "$"+strconv.Itoa(i+1))
		args = append(args, id)
	}

	query := `
		SELECT id, name, parent_id, owner_id, created_at, updated_at
		FROM app.folders 
		WHERE id IN (` + strings.Join(placeholders, ",") + `)
		ORDER BY created_at DESC LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2) + `
	`
	
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []Folder
	for rows.Next() {
		var f Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.OwnerID, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, nil
}

func (s *Store) RenameDocument(ctx context.Context, id, newName string) error {
	query := `UPDATE app.documents SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := s.db.ExecContext(ctx, query, newName, id)
	return err
}

func (s *Store) MoveDocument(ctx context.Context, id string, newFolderID *string) error {
	query := `UPDATE app.documents SET folder_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := s.db.ExecContext(ctx, query, newFolderID, id)
	return err
}

func (s *Store) CreateDocument(ctx context.Context, doc *Document) error {
	query := `
		INSERT INTO app.documents (id, name, folder_id, owner_id, mime_type, size_bytes, storage_path, version, public_link_token)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := s.db.ExecContext(ctx, query, doc.ID, doc.Name, doc.FolderID, doc.OwnerID, doc.MimeType, doc.SizeBytes, doc.StoragePath, doc.Version, doc.PublicLinkToken)
	return err
}

func (s *Store) UpdateDocumentVersion(ctx context.Context, docID string, newSizeBytes int64, newStoragePath string, newVersion int) error {
	query := `UPDATE app.documents SET size_bytes = $1, storage_path = $2, version = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`
	_, err := s.db.ExecContext(ctx, query, newSizeBytes, newStoragePath, newVersion, docID)
	return err
}

func (s *Store) CreateDocumentVersion(ctx context.Context, dv *DocumentVersion) error {
	query := `
		INSERT INTO app.document_versions (id, document_id, version_number, storage_path, size_bytes)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := s.db.ExecContext(ctx, query, dv.ID, dv.DocumentID, dv.VersionNumber, dv.StoragePath, dv.SizeBytes)
	return err
}

func (s *Store) GetDocumentVersions(ctx context.Context, docID string) ([]DocumentVersion, error) {
	query := `
		SELECT id, document_id, version_number, storage_path, size_bytes, created_at
		FROM app.document_versions WHERE document_id = $1 ORDER BY version_number DESC
	`
	rows, err := s.db.QueryContext(ctx, query, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []DocumentVersion
	for rows.Next() {
		var v DocumentVersion
		if err := rows.Scan(&v.ID, &v.DocumentID, &v.VersionNumber, &v.StoragePath, &v.SizeBytes, &v.CreatedAt); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, nil
}

func (s *Store) GetDocument(ctx context.Context, id string) (*Document, error) {
	query := `
		SELECT id, name, folder_id, owner_id, mime_type, size_bytes, storage_path, version, public_link_token, created_at, updated_at
		FROM app.documents WHERE id = $1
	`
	var d Document
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&d.ID, &d.Name, &d.FolderID, &d.OwnerID, &d.MimeType, &d.SizeBytes, &d.StoragePath, &d.Version, &d.PublicLinkToken, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *Store) GetDocumentByPublicLink(ctx context.Context, token string) (*Document, error) {
	query := `
		SELECT id, name, folder_id, owner_id, mime_type, size_bytes, storage_path, version, public_link_token, created_at, updated_at
		FROM app.documents WHERE public_link_token = $1
	`
	var d Document
	err := s.db.QueryRowContext(ctx, query, token).Scan(
		&d.ID, &d.Name, &d.FolderID, &d.OwnerID, &d.MimeType, &d.SizeBytes, &d.StoragePath, &d.Version, &d.PublicLinkToken, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *Store) ListDocumentsFiltered(ctx context.Context, permittedDocIDs []string, limit, offset int) ([]Document, error) {
	if len(permittedDocIDs) == 0 {
		return []Document{}, nil
	}
	
	// Import "github.com/lib/pq" is assumed to be available
	query := `
		SELECT id, name, folder_id, owner_id, mime_type, size_bytes, storage_path, version, public_link_token, created_at, updated_at
		FROM app.documents 
		WHERE id = ANY($1)
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`
	// Fallback to basic string slice to Postgres array conversion using pq.Array
	// This requires importing "github.com/lib/pq" as normal import, not just `_`
	// Since we can't easily change the import here without knowing exactly how it's formatted, 
	// we will manually construct the parameter string for the ANY clause to avoid breaking imports.
	
	if len(permittedDocIDs) == 0 {
		return []Document{}, nil
	}

	var placeholders []string
	var args []interface{}
	for i, id := range permittedDocIDs {
		placeholders = append(placeholders, "$"+strconv.Itoa(i+1))
		args = append(args, id)
	}

	query = `
		SELECT id, name, folder_id, owner_id, mime_type, size_bytes, storage_path, version, public_link_token, created_at, updated_at
		FROM app.documents 
		WHERE id IN (` + strings.Join(placeholders, ",") + `)
		ORDER BY created_at DESC LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2) + `
	`
	
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Name, &d.FolderID, &d.OwnerID, &d.MimeType, &d.SizeBytes, &d.StoragePath, &d.Version, &d.PublicLinkToken, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (s *Store) ListDocuments(ctx context.Context, ownerID string, folderID *string) ([]Document, error) {
	// Simple listing for the owner. Shared docs will be handled via Keto.
	query := `
		SELECT id, name, folder_id, owner_id, mime_type, size_bytes, storage_path, version, public_link_token, created_at, updated_at
		FROM app.documents WHERE owner_id = $1
	`
	var rows *sql.Rows
	var err error
	
	if folderID == nil {
		query += ` AND folder_id IS NULL ORDER BY created_at DESC`
		rows, err = s.db.QueryContext(ctx, query, ownerID)
	} else {
		query += ` AND folder_id = $2 ORDER BY created_at DESC`
		rows, err = s.db.QueryContext(ctx, query, ownerID, folderID)
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Name, &d.FolderID, &d.OwnerID, &d.MimeType, &d.SizeBytes, &d.StoragePath, &d.Version, &d.PublicLinkToken, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (s *Store) SetPublicLink(ctx context.Context, docID, token string) error {
	query := `UPDATE app.documents SET public_link_token = $1 WHERE id = $2`
	_, err := s.db.ExecContext(ctx, query, token, docID)
	return err
}

func (s *Store) DeleteDocument(ctx context.Context, id string) error {
	query := `DELETE FROM app.documents WHERE id = $1`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

