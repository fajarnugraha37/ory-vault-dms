package store

import (
	"database/sql"
	"encoding/json"
	"log"

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

func NewPostgresStore(dsn string) (*Store, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	log.Println("Connected to Enterprise SQL Store")
	return &Store{db: db}, nil
}

func (s *Store) SaveAuditLog(adminID, action, targetID string, details interface{}, ip, ua string) error {
	detailsJSON, _ := json.Marshal(details)
	query := `INSERT INTO enterprise.audit_logs (admin_id, action, target_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := s.db.Exec(query, adminID, action, targetID, detailsJSON, ip, ua)
	if err != nil {
		log.Printf("SQL_ERROR: SaveAudit failed: %v", err)
	}
	return err
}

func (s *Store) GetAuditLogs(limit, offset int) ([]AuditLog, error) {
	query := `SELECT id, timestamp, admin_id, action, COALESCE(target_id::text, ''), details, COALESCE(ip_address, ''), COALESCE(user_agent, '') 
	          FROM enterprise.audit_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`
	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
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

func (s *Store) HasRole(userID, roleID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM enterprise.user_roles WHERE user_id = $1 AND role_id = $2)`
	err := s.db.QueryRow(query, userID, roleID).Scan(&exists)
	return exists, err
}

func (s *Store) Close() error {
	return s.db.Close()
}
