package store

import (
	"context"
	"database/sql"
	"encoding/json"

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

func (s *Store) ListRoles(ctx context.Context) ([]Role, error) {
	query := `SELECT id, description FROM enterprise.roles ORDER BY id ASC`
	rows, err := s.db.QueryContext(ctx, query)
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
